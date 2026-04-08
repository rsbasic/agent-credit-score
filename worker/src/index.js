import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SEED_SCORES } from './seed-data.js';

const app = new Hono();

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
