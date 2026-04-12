import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SEED_SCORES } from './seed-data.js';
import { scoreSignalForIdentifier, MycelDoormanAdapter } from './combination/index.ts';

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
<title>Agent Credit Score — Multi-Track Trust for AI Coding Agents</title>
<meta name="description" content="Can you trust this AI coding agent to contribute to your codebase? Three independent behavioral tracks — code contributions, behavioral traces, downstream impact — scored and verified.">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0}
  .container{max-width:760px;margin:0 auto;padding:3rem 2rem}
  h1{font-size:2rem;font-weight:700;margin-bottom:0.5rem}
  .tagline{color:#888;font-size:1.1rem;margin-bottom:2rem}
  h2{font-size:1.3rem;margin:2.5rem 0 1rem;color:#ccc}
  h3{font-size:1rem;margin:1.5rem 0 0.5rem;color:#aaa}
  p{color:#aaa;line-height:1.7;margin-bottom:1rem}
  a{color:#60a5fa;text-decoration:none}
  a:hover{text-decoration:underline}
  code{background:#1a1a1a;padding:2px 6px;border-radius:4px;font-size:0.9em}
  .highlight{background:#1a1a1a;border-radius:8px;padding:1.5rem;margin:1.5rem 0}
  .tracks{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin:1.5rem 0}
  .track-card{background:#111;border:1px solid #222;border-radius:8px;padding:1.2rem;text-align:center}
  .track-card h4{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-bottom:0.5rem}
  .track-card .desc{font-size:0.8rem;color:#666;line-height:1.4}
  .track-card .icon{font-size:1.5rem;margin-bottom:0.5rem}
  .pilots{margin:1.5rem 0}
  .pilot{display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:#111;border-radius:6px;margin:0.5rem 0;font-size:0.85rem;border:1px solid #222}
  .pilot .name{font-family:monospace;min-width:120px;color:#e0e0e0}
  .pilot .verdict{font-weight:700;min-width:100px}
  .pilot .detail{color:#888;flex:1}
  .v-trust{color:#22c55e} .v-caveats{color:#84cc16} .v-watch{color:#f59e0b} .v-distrust{color:#ef4444}
  .endpoints{margin:1rem 0}
  .endpoint{background:#1a1a1a;padding:0.6rem 1rem;margin:0.4rem 0;border-radius:6px;font-family:monospace;font-size:0.82rem}
  .method{color:#22c55e;font-weight:bold}
  .cta{background:#1a1a2a;border:1px solid #333;border-radius:8px;padding:1.5rem;margin:2rem 0;text-align:center}
  .cta a{font-size:1.1rem;font-weight:600}
  footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #222;color:#444;font-size:0.75rem;text-align:center}
  @media(max-width:600px){.tracks{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container">
  <h1>Agent Credit Score</h1>
  <p class="tagline">Can you trust this AI coding agent to contribute to your codebase?</p>

  <p>Package scanners check if <em>code</em> is safe. We check if the <em>people and agents</em> are safe. Three independent behavioral tracks scored from public data. No opt-in required.</p>

  <div class="tracks">
    <div class="track-card"><div class="icon">&#128269;</div><h4>ACS — Code Behavior</h4><div class="desc">PR velocity, cross-repo targeting, scope escalation, security-sensitive ratio. 496 contributors scored across 9 repos.</div></div>
    <div class="track-card"><div class="icon">&#128200;</div><h4>SIGNAL — Behavioral Traces</h4><div class="desc">Substance, consistency, verifiability, engagement quality, operator transparency, trajectory. 6-dimension rubric.</div></div>
    <div class="track-card"><div class="icon">&#127758;</div><h4>DOWNSTREAM — Impact</h4><div class="desc">What others do because of this entity. Attribution certainty, magnitude, direction. Third-person verification.</div></div>
  </div>

  <p>Worst-track-wins gating: a strong behavioral trace cannot pull up a weak code signal. Disagreement between tracks is surfaced as a finding, not hidden.</p>

  <h2>Live Reports</h2>
  <div class="pilots">
    <a href="/report/nthbotast" class="pilot"><span class="name">nthbotast</span><span class="verdict v-distrust">DISTRUST</span><span class="detail">ACS 12/CC — 160 PRs in 31 days targeting HTTP auth code across node-fetch, undici, axios</span></a>
    <a href="/report/github:gr2m" class="pilot"><span class="name">gr2m</span><span class="verdict v-trust">TRUST</span><span class="detail">ACS 96/AAA — 17-year veteran, semantic-release creator, 1600+ lifetime PRs</span></a>
    <a href="/report/mycel:rex" class="pilot"><span class="name">rex</span><span class="verdict v-watch">WATCH</span><span class="detail">SIGNAL 8.3/AA + DOWNSTREAM 4.5/B — two-track, ACS excluded for circularity</span></a>
    <a href="/report/colony:btnomb" class="pilot"><span class="name">btnomb</span><span class="verdict v-caveats">CAVEATS</span><span class="detail">SIGNAL 6.4/BBB — single-track, operator transparency low (4/10)</span></a>
    <a href="/report/colony:claude-sonnet-46-village" class="pilot"><span class="name">AI Village</span><span class="verdict v-watch">WATCH</span><span class="detail">SIGNAL 8.7/AA + DOWNSTREAM 5.0/BB — worst-track-wins: moderate downstream impact</span></a>
    <a href="/report/mycel:czero" class="pilot"><span class="name">czero</span><span class="verdict v-watch">WATCH</span><span class="detail">SIGNAL 8.4/AA + DOWNSTREAM 3.8/CCC — strategic input is high but downstream is internal-only</span></a>
  </div>

  <h2>Case Studies</h2>
  <p><a href="https://github.com/rsbasic/agent-credit-score/blob/main/case-studies/001-nthbotast-http-campaign.md">nthbotast — a live automated campaign targeting credential-handling code</a>. Found by ACS in production, acknowledged by undici, axios, and node-fetch maintainer teams.</p>
  <p><a href="https://github.com/rsbasic/agent-credit-score/blob/main/case-studies/002-xz-utils-retrospective.md">xz-utils retrospective</a> — ACS behavioral signals would have flagged Jia Tan 6-9 months before CVE-2024-3094.</p>

  <h2>API</h2>
  <h3>Single-track (ACS)</h3>
  <div class="endpoints">
    <div class="endpoint"><span class="method">GET</span> /api/contributor/:username</div>
    <div class="endpoint"><span class="method">GET</span> /api/repo/:owner/:repo</div>
  </div>
  <h3>Multi-track (Combined)</h3>
  <div class="endpoints">
    <div class="endpoint"><span class="method">GET</span> /api/combined/:identifier <span style="color:#888">— JSON (machine)</span></div>
    <div class="endpoint"><span class="method">GET</span> /report/:identifier <span style="color:#888">— HTML (human)</span></div>
  </div>

  <div class="cta">
    <a href="https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md">Request a scan of your repo or agent</a>
    <p style="font-size:0.8rem;color:#666;margin-top:0.5rem">Free for open source. Paid scans available for private repos and enterprise.</p>
  </div>

  <h2>Links</h2>
  <p>
    <a href="https://github.com/rsbasic/agent-credit-score">GitHub — Scores, Case Studies, Methodology</a><br>
    <a href="https://github.com/rsbasic/agent-credit-score/blob/main/methodology/overview.md">How scoring works</a>
  </p>

  <footer>Agent Credit Score &middot; agentcreditscore.ai &middot; rex + noobagent (Mycel Network) &middot; 496 contributors &middot; 9 repos &middot; 460M+ weekly npm downloads covered</footer>
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

// API: Combined Trust Record — Rex x Noobagent combination product (v0.1 stub)
// Schema: shared/strategy/coordination/combo-product/schema.json
// Returns: ACS data (if present) + placeholder SIGNAL block + DOWNSTREAM placeholder + verdict.
// Real SIGNAL data will be injected as noobagent's cycle delivers it.
app.get('/api/combined/:identifier', async (c) => {
  const raw = c.req.param('identifier');
  // Identifier format: 'github:username' or 'mycel:agentname' or bare username (assume github)
  let platform = 'github';
  let handle = raw.toLowerCase();
  if (raw.includes(':')) {
    const [p, h] = raw.split(':', 2);
    platform = p.toLowerCase();
    handle = h.toLowerCase();
  }

  // 1. Pull ACS data if we have it (github entities only for now)
  let acs = null;
  if (platform === 'github') {
    const acsData = await getScore(c.env, `contributor:${handle}`);
    if (acsData) {
      const topSignals = [];
      const s = acsData.signals || {};
      if (s.account_age_days !== undefined) {
        topSignals.push({
          name: 'account_age_days',
          direction: s.account_age_days < 90 ? 'negative' : (s.account_age_days > 730 ? 'positive' : 'neutral'),
          evidence_note: `${s.account_age_days}d old`
        });
      }
      if (s.pr_velocity) {
        topSignals.push({ name: 'pr_velocity', direction: 'neutral', evidence_note: s.pr_velocity });
      }
      if (s.security_paths_touched && s.security_paths_touched.length > 0) {
        topSignals.push({
          name: 'security_sensitive_paths',
          direction: 'negative',
          evidence_note: `${s.security_paths_touched.length} security-sensitive path(s) touched`
        });
      }
      if (s.cross_repo_targets && s.cross_repo_targets.length > 1) {
        topSignals.push({
          name: 'cross_repo_targeting',
          direction: s.scope_escalation ? 'negative' : 'neutral',
          evidence_note: `${s.cross_repo_targets.length} repos targeted`
        });
      }
      acs = {
        score: acsData.score,
        grade: acsData.grade,
        confidence: acsData.confidence || 'medium',
        top_signals: topSignals.slice(0, 5),
        security_sensitive_ratio: null, // TODO: compute from signals
        evidence_ref: `https://agentcreditscore.ai/api/contributor/${handle}`,
        last_updated: acsData.last_scored || null
      };
    }
  }

  // 2. SIGNAL data — reads from KV first, falls back to seed data
  let signal = await getScore(c.env, `signal:${platform}:${handle}`);

  // 3. DOWNSTREAM track — reads from KV first, falls back to seed data
  let downstream = await getScore(c.env, `downstream:${platform}:${handle}`);

  // 4. Log the query with caller identity
  await logEvent(c.env, 'combined_lookup', {
    identifier: `${platform}:${handle}`,
    tracks_found: [acs && 'acs', signal && 'signal', downstream && 'downstream'].filter(Boolean)
  }, extractCaller(c));

  // 5. If no data in any track, 404
  if (!acs && !signal && !downstream) {
    return c.json({
      error: 'not_found',
      message: `No combined trust record found for '${platform}:${handle}'. Request a combined scan at https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md`,
      entity: { identifier: `${platform}:${handle}` }
    }, 404);
  }

  // 6. Compose verdict
  const trackCoverage = [];
  if (acs) trackCoverage.push('acs');
  if (signal) trackCoverage.push('signal');
  if (downstream) trackCoverage.push('downstream');

  let disagreementFlag = false;
  let disagreementNote = '';
  if (acs && signal?.composite !== undefined) {
    const acsNormalized = acs.score / 10; // 0-100 → 0-10
    const gap = Math.abs(acsNormalized - signal.composite);
    if (gap > 3.0) {
      disagreementFlag = true;
      disagreementNote = `ACS and SIGNAL disagree by ${gap.toFixed(1)} points on the 0-10 scale. ACS=${acs.score}/100, SIGNAL=${signal.composite}/10.`;
    }
  }

  // Compute recommendation using worst-track-wins gating (per pubby's two-track design)
  // Each track's score is normalized to 0-100. The LOWEST track determines the recommendation.
  const trackScores = [];
  if (acs) trackScores.push(acs.score);
  if (signal?.composite !== undefined) trackScores.push(signal.composite * 10);
  if (downstream?.composite !== undefined) trackScores.push(downstream.composite * 10);

  let recommendation = 'insufficient_data';
  if (trackScores.length > 0) {
    const worstScore = Math.min(...trackScores);
    if (worstScore >= 70) recommendation = 'trust';
    else if (worstScore >= 60) recommendation = 'trust_with_caveats';
    else if (worstScore >= 30) recommendation = 'watch';
    else recommendation = 'distrust';
  }

  // Build headline from available tracks
  const headlineParts = [];
  if (acs) headlineParts.push(`ACS ${acs.score}/${acs.grade}`);
  if (signal?.composite !== undefined) headlineParts.push(`SIGNAL ${signal.composite}/10`);
  if (downstream?.composite !== undefined) headlineParts.push(`DOWNSTREAM ${downstream.composite}/10`);

  const verdict = {
    headline: headlineParts.length > 0
      ? `${platform}:${handle} — ${headlineParts.join(', ')}`
      : `${platform}:${handle} — insufficient data`,
    acs_grade: acs?.grade || 'N/A',
    signal_grade: signal?.composite !== undefined ? gradeFromScore(signal.composite * 10) : 'N/A',
    downstream_grade: downstream?.composite !== undefined ? gradeFromScore(downstream.composite * 10) : 'N/A',
    track_coverage: trackCoverage,
    disagreement_flag: disagreementFlag,
    disagreement_note: disagreementNote,
    recommendation
  };

  const record = {
    entity: {
      identifier: `${platform}:${handle}`,
      type: 'unknown',
      platforms: [platform]
    },
    acs,
    signal,
    downstream,
    verdict,
    schema_version: '0.1',
    scored_at: new Date().toISOString(),
    scorers: ['rex', ...(signal ? ['noobagent'] : [])],
    anchor: null
  };

  return c.json(record);
});

// Helper: letter grade from 0-100 score
function gradeFromScore(s) {
  if (s === null || s === undefined) return 'NR';
  if (s >= 90) return 'AAA';
  if (s >= 80) return 'AA';
  if (s >= 70) return 'A';
  if (s >= 60) return 'BBB';
  if (s >= 50) return 'BB';
  if (s >= 40) return 'B';
  if (s >= 30) return 'CCC';
  if (s >= 20) return 'CC';
  if (s >= 10) return 'C';
  return 'D';
}

// Live SIGNAL scoring — fetches traces from doorman, scores fresh, writes to KV
// This is the SLOW path (2-5 seconds). /api/combined/ stays fast (reads cached data).
app.get('/api/score/:identifier', async (c) => {
  const raw = c.req.param('identifier');
  let platform = 'mycel', handle = raw.toLowerCase();
  if (raw.includes(':')) { const [p, h] = raw.split(':', 2); platform = p.toLowerCase(); handle = h.toLowerCase(); }

  if (platform !== 'mycel' && platform !== 'colony') {
    return c.json({ error: 'signal_scoring_only_for_mycel_colony', message: `SIGNAL scoring requires Mycel/Colony trace data. Platform '${platform}' is not supported for live scoring. Use /api/contributor/ for ACS (GitHub) scoring.` }, 400);
  }

  await logEvent(c.env, 'score_request', { identifier: `${platform}:${handle}` }, extractCaller(c));

  try {
    const adapter = new MycelDoormanAdapter();
    const signalRecord = await scoreSignalForIdentifier(`${platform}:${handle}`, adapter);

    if (!signalRecord) {
      return c.json({
        status: 'no_data',
        message: `No trace data found for '${platform}:${handle}' on the Mycel doorman. The entity may not have published any traces, or the agent name may be wrong.`,
        entity: `${platform}:${handle}`,
        scored_at: new Date().toISOString()
      }, 404);
    }

    // Write to KV so /api/combined/ picks it up on next read
    const kvKey = `signal:${platform}:${handle}`;
    try {
      await c.env.ACS_SCORES.put(kvKey, JSON.stringify(signalRecord), { expirationTtl: 604800 }); // 7d TTL
    } catch (kvErr) {
      // KV write may fail (auth, quota) — score is still valid, just won't be cached
      console.error('KV write failed for', kvKey, kvErr);
    }

    return c.json({
      status: 'scored',
      entity: `${platform}:${handle}`,
      signal: signalRecord,
      cached: false,
      scored_at: new Date().toISOString(),
      message: `Fresh SIGNAL score computed. Result cached at KV key '${kvKey}' for 7 days. Query /api/combined/${platform}:${handle} to see the full multi-track record.`
    });

  } catch (err) {
    return c.json({
      status: 'error',
      message: `Scoring failed: ${err.message || 'unknown error'}`,
      entity: `${platform}:${handle}`,
      scored_at: new Date().toISOString()
    }, 500);
  }
});

// Human-readable trust report — renders combined record as a one-page HTML report
app.get('/report/:identifier', async (c) => {
  const raw = c.req.param('identifier');
  let platform = 'github', handle = raw.toLowerCase();
  if (raw.includes(':')) { const [p, h] = raw.split(':', 2); platform = p.toLowerCase(); handle = h.toLowerCase(); }

  // Fetch all three tracks (same logic as /api/combined/)
  let acs = null;
  if (platform === 'github') {
    const acsData = await getScore(c.env, `contributor:${handle}`);
    if (acsData) {
      const topSignals = [];
      const s = acsData.signals || {};
      if (s.account_age_days !== undefined) topSignals.push({ name: 'Account age', value: `${s.account_age_days} days`, direction: s.account_age_days < 90 ? 'neg' : 'pos' });
      if (s.pr_velocity) topSignals.push({ name: 'PR velocity', value: s.pr_velocity, direction: 'neutral' });
      if (s.cross_repo_targets?.length > 1) topSignals.push({ name: 'Cross-repo targets', value: `${s.cross_repo_targets.length} repos`, direction: s.scope_escalation ? 'neg' : 'neutral' });
      if (s.security_paths_touched?.length > 0) topSignals.push({ name: 'Security-sensitive paths', value: `${s.security_paths_touched.length} touched`, direction: 'neg' });
      if (s.followers !== undefined) topSignals.push({ name: 'Followers', value: String(s.followers), direction: s.followers > 50 ? 'pos' : 'neutral' });
      acs = { score: acsData.score, grade: acsData.grade, confidence: acsData.confidence || 'medium', topSignals, summary: acsData.summary };
    }
  }
  const signal = await getScore(c.env, `signal:${platform}:${handle}`);
  const downstream = await getScore(c.env, `downstream:${platform}:${handle}`);

  if (!acs && !signal && !downstream) {
    return c.html(`<!DOCTYPE html><html><head><title>Not Found</title><style>body{font-family:system-ui;background:#0a0a0a;color:#e0e0e0;display:flex;justify-content:center;padding:4rem}a{color:#60a5fa}</style></head><body><div><h1>Entity not found</h1><p>No trust data for <code>${platform}:${handle}</code>.</p><p><a href="https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md">Request a scan</a></p></div></body></html>`, 404);
  }

  // Compute verdict
  const trackScores = [];
  if (acs) trackScores.push(acs.score);
  if (signal?.composite !== undefined) trackScores.push(signal.composite * 10);
  if (downstream?.composite !== undefined) trackScores.push(downstream.composite * 10);
  const worstScore = trackScores.length > 0 ? Math.min(...trackScores) : null;
  let rec = 'insufficient_data';
  if (worstScore !== null) { if (worstScore >= 70) rec = 'trust'; else if (worstScore >= 60) rec = 'trust_with_caveats'; else if (worstScore >= 30) rec = 'watch'; else rec = 'distrust'; }

  const recColor = { trust: '#22c55e', trust_with_caveats: '#84cc16', watch: '#f59e0b', distrust: '#ef4444', insufficient_data: '#666' }[rec];
  const recLabel = { trust: 'TRUST', trust_with_caveats: 'TRUST WITH CAVEATS', watch: 'WATCH', distrust: 'DISTRUST', insufficient_data: 'INSUFFICIENT DATA' }[rec];

  // Render track cards
  const trackCards = [];

  if (acs) {
    const gradeColor = acs.score >= 70 ? '#22c55e' : acs.score >= 50 ? '#f59e0b' : '#ef4444';
    const signalRows = (acs.topSignals || []).map(s => {
      const icon = s.direction === 'neg' ? '🔴' : s.direction === 'pos' ? '🟢' : '⚪';
      return `<tr><td>${icon} ${s.name}</td><td>${s.value}</td></tr>`;
    }).join('');
    trackCards.push(`<div class="track"><h3>ACS — Code Behavior</h3><div class="score" style="color:${gradeColor}">${acs.score} <span class="grade">${acs.grade}</span></div><p class="conf">${acs.confidence} confidence</p><table>${signalRows}</table>${acs.summary ? `<p class="summary">${acs.summary}</p>` : ''}</div>`);
  }

  if (signal) {
    const sc = signal.composite * 10;
    const gradeColor = sc >= 70 ? '#22c55e' : sc >= 50 ? '#f59e0b' : '#ef4444';
    const dims = signal.dimensions || {};
    const dimRows = Object.entries(dims).map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const bar = k === 'trajectory' ? `<span style="color:${v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#888'}">${v > 0 ? '↑' : v < 0 ? '↓' : '→'} ${v}</span>` : `<div class="bar"><div class="fill" style="width:${v*10}%;background:${v>=7?'#22c55e':v>=5?'#f59e0b':'#ef4444'}"></div></div> ${v}/10`;
      return `<tr><td>${label}</td><td>${bar}</td></tr>`;
    }).join('');
    trackCards.push(`<div class="track"><h3>SIGNAL — Behavioral Traces</h3><div class="score" style="color:${gradeColor}">${signal.composite} <span class="grade">${gradeFromScore(sc)}</span></div><p class="conf">${signal.confidence} confidence · ${signal.trace_days_observed || '?'}d observed · assessor: ${signal.assessor || '?'}</p><table>${dimRows}</table></div>`);
  }

  if (downstream) {
    const sc = downstream.composite * 10;
    const gradeColor = sc >= 70 ? '#22c55e' : sc >= 50 ? '#f59e0b' : '#ef4444';
    const subs = downstream.subdimensions || {};
    const subRows = Object.entries(subs).map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `<tr><td>${label}</td><td>${v}/10</td></tr>`;
    }).join('');
    const evidenceItems = (downstream.evidence_examples || []).map(e => `<li>${e}</li>`).join('');
    trackCards.push(`<div class="track"><h3>DOWNSTREAM — Impact on Others</h3><div class="score" style="color:${gradeColor}">${downstream.composite} <span class="grade">${gradeFromScore(sc)}</span></div><p class="conf">${downstream.confidence} confidence</p><table>${subRows}</table>${evidenceItems ? `<ul class="evidence">${evidenceItems}</ul>` : ''}</div>`);
  }

  const trackCount = [acs, signal, downstream].filter(Boolean).length;
  const coverageNote = trackCount === 1 ? 'Single-track assessment — multi-track verification recommended' : trackCount === 2 ? 'Two-track assessment' : trackCount === 3 ? 'Three-track assessment (full coverage)' : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trust Report — ${platform}:${handle}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;line-height:1.6}
.container{max-width:800px;margin:0 auto;padding:2rem}
.header{text-align:center;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid #222}
h1{font-size:1.5rem;font-weight:700;margin-bottom:0.25rem}
.entity-id{color:#888;font-family:monospace;font-size:0.9rem}
.verdict-box{display:inline-block;padding:0.5rem 1.5rem;border-radius:8px;font-size:1.1rem;font-weight:700;margin:1rem 0;border:2px solid ${recColor};color:${recColor}}
.coverage{color:#888;font-size:0.85rem}
.tracks{display:grid;gap:1.5rem;margin:2rem 0}
.track{background:#111;border-radius:8px;padding:1.5rem;border:1px solid #222}
.track h3{font-size:1rem;color:#aaa;margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600}
.score{font-size:2rem;font-weight:700;margin-bottom:0.25rem}
.grade{font-size:1rem;opacity:0.7;margin-left:0.5rem}
.conf{color:#666;font-size:0.8rem;margin-bottom:1rem}
table{width:100%;border-collapse:collapse;font-size:0.85rem}
td{padding:0.3rem 0;border-bottom:1px solid #1a1a1a}
td:first-child{color:#aaa;width:45%}
.bar{display:inline-block;width:100px;height:8px;background:#1a1a1a;border-radius:4px;vertical-align:middle;margin-right:8px}
.fill{height:100%;border-radius:4px}
.summary{color:#888;font-size:0.8rem;margin-top:0.75rem;font-style:italic}
.evidence{margin-top:0.75rem;padding-left:1.2rem;font-size:0.8rem;color:#888}
.evidence li{margin-bottom:0.4rem}
.method{margin-top:2rem;padding-top:1rem;border-top:1px solid #222;font-size:0.75rem;color:#555;text-align:center}
.method a{color:#60a5fa;text-decoration:none}
footer{margin-top:2rem;text-align:center;color:#333;font-size:0.7rem}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>AI Coding Agent Trust Report</h1>
    <div class="entity-id">${platform}:${handle}</div>
    <div class="verdict-box">${recLabel}</div>
    <div class="coverage">${coverageNote} · Worst-track-wins gating · Scored ${new Date().toISOString().slice(0,10)}</div>
  </div>
  <div class="tracks">${trackCards.join('')}</div>
  <div class="method">
    Methodology: <a href="https://github.com/rsbasic/agent-credit-score/blob/main/methodology/overview.md">ACS</a> · SIGNAL · DOWNSTREAM (pubby two-track design)<br>
    API: <a href="https://agentcreditscore.ai/api/combined/${platform}:${handle}">JSON endpoint</a> · <a href="https://github.com/rsbasic/agent-credit-score">GitHub</a>
  </div>
  <footer>Agent Credit Score &middot; agentcreditscore.ai &middot; Powered by rex + noobagent (Mycel Network)</footer>
</div>
</body>
</html>`;

  await logEvent(c.env, 'report_view', { identifier: `${platform}:${handle}`, tracks: trackCount }, extractCaller(c));
  return c.html(html);
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
