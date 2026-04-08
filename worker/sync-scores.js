#!/usr/bin/env node
// sync-scores.js — Push score JSON files from the public repo to Cloudflare KV
// Usage: node sync-scores.js
// Requires: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars
// Or: npx wrangler kv:key put --binding ACS_SCORES "contributor:nthbotast" "$(cat ../scores/contributors/nthbotast.json)"

const fs = require('fs');
const path = require('path');

const SCORES_DIR = path.join(__dirname, '..', 'scores', 'contributors');
const REPORTS_DIR = path.join(__dirname, '..', 'reports', 'repos');

async function syncToKV() {
  const entries = [];

  // Sync contributor scores
  if (fs.existsSync(SCORES_DIR)) {
    const files = fs.readdirSync(SCORES_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = fs.readFileSync(path.join(SCORES_DIR, file), 'utf8');
      const json = JSON.parse(data);
      const key = `contributor:${json.contributor.toLowerCase()}`;
      entries.push({ key, value: data });
      console.log(`  ${key} → score ${json.score} (${json.grade})`);
    }
  }

  // Output wrangler commands
  console.log('\n--- Run these commands to sync to KV ---\n');
  for (const { key, value } of entries) {
    // Escape for shell
    const escaped = value.replace(/'/g, "'\\''");
    console.log(`npx wrangler kv:key put --namespace-id YOUR_KV_NAMESPACE_ID "${key}" '${escaped}'`);
    console.log('');
  }

  console.log(`\nTotal: ${entries.length} entries to sync`);
}

syncToKV();
