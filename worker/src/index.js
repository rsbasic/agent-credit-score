import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SEED_SCORES } from './seed-data.js';

const app = new Hono();

// Extract caller identity from Cloudflare request headers
function extractCaller(c) {
  const h = c.req.header.bind(c.req);
  const ip = h('cf-connecting-ip') || h('x-forwarded-for') || 'unknown';
  // Hash IP for privacy (first 12 hex chars of sha-like truncation — we store full IP too but mark it)
  const cf = c.req.raw?.cf || {};
  return {
    ip,
    country: h('cf-ipcountry') || cf.country || null,
    asn: cf.asn || null,
    as_org: cf.asOrganization || null,
    city: cf.city || null,
    colo: cf.colo || null,
    ua: (h('user-agent') || '').slice(0, 200),
    referer: (h('referer') || h('referrer') || '').slice(0, 200),
    accept: (h('accept') || '').slice(0, 100),
    origin: (h('origin') || '').slice(0, 200)
  };
}

// Analytics: lightweight event logging
async function logEvent(env, type, detail, caller) {
  try {
    const now = new Date().toISOString();
    const hour = now.slice(0, 13); // "2026-04-07T15"
    const key = `analytics:${hour}`;
    const existing = await env.ACS_SCORES.get(key, 'json') || { hour, events: [] };
    existing.events.push({ type, detail, caller, ts: now });
    // Only keep last 200 events per hour to avoid KV size limits
    if (existing.events.length > 200) existing.events = existing.events.slice(-200);
    await env.ACS_SCORES.put(key, JSON.stringify(existing), { expirationTtl: 1209600 }); // 14 day TTL

    // Also maintain a rolling caller index for fast lookup — key by IP
    if (caller?.ip && caller.ip !== 'unknown') {
      const ipKey = `caller:${caller.ip}`;
      const ipData = await env.ACS_SCORES.get(ipKey, 'json') || {
        ip: caller.ip,
        first_seen: now,
        last_seen: now,
        request_count: 0,
        country: caller.country,
        as_org: caller.as_org,
        ua_samples: [],
        queries: []
      };
      ipData.last_seen = now;
      ipData.request_count++;
      if (caller.ua && !ipData.ua_samples.includes(caller.ua)) {
        ipData.ua_samples.push(caller.ua);
        if (ipData.ua_samples.length > 5) ipData.ua_samples = ipData.ua_samples.slice(-5);
      }
      ipData.queries.push({ ts: now, type, detail });
      if (ipData.queries.length > 50) ipData.queries = ipData.queries.slice(-50);
      await env.ACS_SCORES.put(ipKey, JSON.stringify(ipData), { expirationTtl: 2592000 }); // 30 day TTL
    }
  } catch {} // fail silently — analytics should never break the API
}

// Helper: try KV first, fall back to seed data
async function getScore(env, key) {
  try {
    const kvData = await env.ACS_SCORES.get(key, 'json');
    if (kvData) return kvData;
  } catch {}
  return SEED_SCORES[key] || null;
}

// Helper: list scores (KV or seed)
async function listScores(env, prefix) {
  const results = [];
  try {
    const kvList = await env.ACS_SCORES.list({ prefix });
    for (const k of kvList.keys) {
      const data = await env.ACS_SCORES.get(k.name, 'json');
      if (data) results.push(data);
    }
    if (results.length > 0) return results;
  } catch {}
  // Fallback to seed data
  for (const [key, val] of Object.entries(SEED_SCORES)) {
    if (key.startsWith(prefix)) results.push(val);
  }
  return results;
}

app.use('*', cors());

// Landing page
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Credit Score (ACS)</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; }
  .container { max-width: 720px; margin: 0 auto; padding: 4rem 2rem; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
  .tagline { color: #888; font-size: 1.1rem; margin-bottom: 2rem; }
  .score-example { background: #1a1a1a; border-radius: 8px; padding: 1.5rem; margin: 2rem 0; font-family: monospace; font-size: 0.85rem; line-height: 1.6; overflow-x: auto; }
  .high { color: #22c55e; }
  .low { color: #ef4444; }
  .med { color: #f59e0b; }
  h2 { font-size: 1.3rem; margin: 2rem 0 1rem; }
  p { color: #aaa; line-height: 1.7; margin-bottom: 1rem; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  .endpoints { margin: 1rem 0; }
  .endpoint { background: #1a1a1a; padding: 0.75rem 1rem; margin: 0.5rem 0; border-radius: 6px; font-family: monospace; font-size: 0.85rem; }
  .method { color: #22c55e; font-weight: bold; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #222; color: #555; font-size: 0.8rem; }
</style>
</head>
<body>
<div class="container">
  <h1>Agent Credit Score</h1>
  <p class="tagline">Behavioral trust scoring for code contributors — human or agent.</p>

  <p>ACS scores the trustworthiness of people and agents submitting code to open source repos. Based on observable public behavior. No opt-in required.</p>

  <p>Existing tools check if <em>code</em> is safe. ACS checks if the <em>people</em> are safe.</p>

  <div class="score-example">
<span class="low">nthbotast    | ACS: 12  | CC  | 160 PRs in 31 days, targets HTTP auth code</span>
<span class="med">theluckystrike | ACS: 31  | CCC | Dormant 6yr account, 1726 PRs in 1 month</span>
<span class="high">sbingner     | ACS: 88  | AA  | 16yr veteran, focused defensive fixes</span>
<span class="high">gr2m         | ACS: 96  | AAA | 17yr veteran, semantic-release creator</span>
  </div>

  <h2>API</h2>
  <div class="endpoints">
    <div class="endpoint"><span class="method">GET</span> /api/contributor/:username</div>
    <div class="endpoint"><span class="method">GET</span> /api/repo/:owner/:repo</div>
    <div class="endpoint"><span class="method">GET</span> /api/pr/:owner/:repo/:number</div>
  </div>

  <h2>Links</h2>
  <p>
    <a href="https://github.com/rsbasic/agent-credit-score">GitHub — Scores, Case Studies, Methodology</a><br>
    <a href="https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md">Request a Scan</a>
  </p>

  <footer>Agent Credit Score &middot; agentcreditscore.ai</footer>
</div>
</body>
</html>`);
});

// API: Check contributor
app.get('/api/contributor/:username', async (c) => {
  const username = c.req.param('username').toLowerCase();
  const data = await getScore(c.env, `contributor:${username}`);
  await logEvent(c.env, 'contributor_lookup', { username, found: !!data }, extractCaller(c));

  if (!data) {
    return c.json({
      error: 'not_found',
      message: `No ACS score found for '${username}'. Request a scan at https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md`,
      contributor: username
    }, 404);
  }

  return c.json(data);
});

// API: Check repo
app.get('/api/repo/:owner/:repo', async (c) => {
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const key = `repo:${owner}/${repo}`.toLowerCase();
  const data = await getScore(c.env, key);
  await logEvent(c.env, 'repo_lookup', { repo: `${owner}/${repo}`, found: !!data }, extractCaller(c));

  if (!data) {
    return c.json({
      error: 'not_found',
      message: `No ACS report found for '${owner}/${repo}'. Request a scan at https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md`,
      repo: `${owner}/${repo}`
    }, 404);
  }

  return c.json(data);
});

// API: Check PR
app.get('/api/pr/:owner/:repo/:number', async (c) => {
  const owner = c.req.param('owner');
  const repo = c.req.param('repo');
  const number = c.req.param('number');
  const key = `pr:${owner}/${repo}#${number}`.toLowerCase();
  const data = await c.env.ACS_SCORES.get(key, 'json');

  if (!data) {
    // Try to compute from contributor score
    const repoKey = `repo:${owner}/${repo}`.toLowerCase();
    const repoData = await c.env.ACS_SCORES.get(repoKey, 'json');

    return c.json({
      error: 'not_found',
      message: `No ACS assessment found for PR #${number} on ${owner}/${repo}.`,
      repo_assessed: !!repoData,
      suggestion: repoData ? 'Check the repo report for contributor scores.' : 'Request a scan.'
    }, 404);
  }

  return c.json(data);
});

// API: List all scored contributors
app.get('/api/contributors', async (c) => {
  const allScores = await listScores(c.env, 'contributor:');
  const contributors = allScores.map(data => ({
    contributor: data.contributor,
    score: data.score,
    grade: data.grade,
    last_scored: data.last_scored,
    summary: data.summary
  }));

  contributors.sort((a, b) => a.score - b.score);
  return c.json({ total: contributors.length, contributors });
});

// API: List all assessed repos
app.get('/api/repos', async (c) => {
  const allRepos = await listScores(c.env, 'repo:');
  const repos = allRepos.map(data => ({
    repo: data.repo,
    health_score: data.health_score,
    active_maintainers: data.active_maintainers,
    flagged_contributors: data.flagged_contributors?.length || 0,
    last_assessed: data.last_assessed
  }));

  return c.json({ total: repos.length, repos });
});

// Dashboard — private analytics (requires secret)
app.get('/api/dashboard', async (c) => {
  const key = c.req.query('key');
  if (key !== c.env.DASHBOARD_KEY) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  // Gather analytics from last 72 hours
  const now = new Date();
  const hours = [];
  for (let i = 0; i < 72; i++) {
    const d = new Date(now.getTime() - i * 3600000);
    hours.push(d.toISOString().slice(0, 13));
  }

  let totalEvents = 0;
  let contributorLookups = 0;
  let repoLookups = 0;
  let notFoundCount = 0;
  const topContributors = {};
  const topRepos = {};
  const hourlyActivity = {};
  const byCountry = {};
  const byAsOrg = {};
  const byUa = {};
  const uniqueIPs = new Set();

  for (const hour of hours) {
    const data = await c.env.ACS_SCORES.get(`analytics:${hour}`, 'json');
    if (!data) continue;

    hourlyActivity[hour] = data.events.length;

    for (const evt of data.events) {
      totalEvents++;
      if (evt.type === 'contributor_lookup') {
        contributorLookups++;
        if (evt.detail?.username) {
          topContributors[evt.detail.username] = (topContributors[evt.detail.username] || 0) + 1;
        }
        if (!evt.detail?.found) notFoundCount++;
      }
      if (evt.type === 'repo_lookup') {
        repoLookups++;
        if (evt.detail?.repo) {
          topRepos[evt.detail.repo] = (topRepos[evt.detail.repo] || 0) + 1;
        }
      }
      if (evt.caller) {
        if (evt.caller.ip && evt.caller.ip !== 'unknown') uniqueIPs.add(evt.caller.ip);
        if (evt.caller.country) byCountry[evt.caller.country] = (byCountry[evt.caller.country] || 0) + 1;
        if (evt.caller.as_org) byAsOrg[evt.caller.as_org] = (byAsOrg[evt.caller.as_org] || 0) + 1;
        if (evt.caller.ua) {
          const short = evt.caller.ua.slice(0, 60);
          byUa[short] = (byUa[short] || 0) + 1;
        }
      }
    }
  }

  const sortedContributors = Object.entries(topContributors).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const sortedRepos = Object.entries(topRepos).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const sortedOrgs = Object.entries(byAsOrg).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const sortedUas = Object.entries(byUa).sort((a, b) => b[1] - a[1]).slice(0, 15);

  return c.json({
    period: '72 hours',
    total_events: totalEvents,
    unique_ips: uniqueIPs.size,
    contributor_lookups: contributorLookups,
    repo_lookups: repoLookups,
    not_found_count: notFoundCount,
    top_contributors_queried: sortedContributors.map(([name, count]) => ({ name, count })),
    top_repos_queried: sortedRepos.map(([name, count]) => ({ name, count })),
    top_countries: sortedCountries.map(([country, count]) => ({ country, count })),
    top_orgs: sortedOrgs.map(([org, count]) => ({ org, count })),
    top_user_agents: sortedUas.map(([ua, count]) => ({ ua, count })),
    hourly_activity: hourlyActivity,
    scores_in_database: Object.keys(SEED_SCORES).filter(k => k.startsWith('contributor:')).length,
    repos_in_database: Object.keys(SEED_SCORES).filter(k => k.startsWith('repo:')).length
  });
});

// Dashboard: per-caller drilldown — who is hitting the API
app.get('/api/callers', async (c) => {
  const key = c.req.query('key');
  if (key !== c.env.DASHBOARD_KEY) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
  const list = await c.env.ACS_SCORES.list({ prefix: 'caller:', limit });
  const callers = [];
  for (const k of list.keys) {
    const data = await c.env.ACS_SCORES.get(k.name, 'json');
    if (data) callers.push(data);
  }
  callers.sort((a, b) => (b.request_count || 0) - (a.request_count || 0));
  return c.json({
    total: callers.length,
    callers: callers.map(cdata => ({
      ip: cdata.ip,
      country: cdata.country,
      as_org: cdata.as_org,
      request_count: cdata.request_count,
      first_seen: cdata.first_seen,
      last_seen: cdata.last_seen,
      ua_samples: cdata.ua_samples,
      recent_queries: (cdata.queries || []).slice(-10)
    }))
  });
});

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Agent Credit Score',
    version: '1.0.0',
    scores_available: true,
    docs: 'https://github.com/rsbasic/agent-credit-score'
  });
});

export default app;
