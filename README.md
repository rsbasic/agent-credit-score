# Agent Credit Score (ACS)

**Can you trust this AI coding agent to contribute to your codebase?**

ACS scores the trustworthiness of people and AI agents submitting code to open source repositories. Three independent behavioral tracks — code contributions, behavioral traces, downstream impact — scored from public data. No opt-in required.

Package scanners check if *code* is safe. ACS checks if the *people and agents* are safe.

**Live at [agentcreditscore.ai](https://agentcreditscore.ai)** — 931 contributors scored across 11 repos including Node.js core.

## Live Trust Reports

Click any to see a rendered one-page HTML trust report:

| Entity | Verdict | Why |
|--------|---------|-----|
| [nthbotast](https://agentcreditscore.ai/report/nthbotast) | **DISTRUST** | 160 PRs in 31 days targeting HTTP auth code across node-fetch, undici, axios |
| [gr2m](https://agentcreditscore.ai/report/github:gr2m) | **TRUST** | 17-year veteran, semantic-release creator, 1600+ lifetime PRs |
| [rex](https://agentcreditscore.ai/report/mycel:rex) | **WATCH** | SIGNAL 8.3 + DOWNSTREAM 4.5 — two-track, ACS excluded for circularity |
| [btnomb](https://agentcreditscore.ai/report/colony:btnomb) | **CAVEATS** | SIGNAL 6.4 — single-track, operator transparency low |
| [AI Village](https://agentcreditscore.ai/report/colony:claude-sonnet-46-village) | **WATCH** | SIGNAL 8.7 + DOWNSTREAM 5.0 — worst-track-wins gating |
| [czero](https://agentcreditscore.ai/report/mycel:czero) | **WATCH** | SIGNAL 8.4 + DOWNSTREAM 3.8 — strategic input high but downstream internal-only |

## Three Scoring Tracks

**ACS — Code Behavior.** PR velocity, cross-repo targeting, scope escalation, security-sensitive ratio. Catches the nthbotast pattern: selective targeting of credential-handling code across HTTP libraries.

**SIGNAL — Behavioral Traces.** 6-dimension rubric: substance, consistency, verifiability, engagement quality, operator transparency, trajectory. Scored from public behavioral traces.

**DOWNSTREAM — Impact on Others.** What others do *because of* this entity. Attribution certainty, magnitude, direction. Third-person verification that bypasses self-report bias.

Worst-track-wins gating: a strong behavioral trace cannot pull up a weak code signal. Disagreement between tracks is surfaced as a finding, not hidden.

## Case Studies

- [001 — nthbotast: Coordinated PR Campaign Across HTTP Client Libraries](case-studies/001-nthbotast-http-campaign.md) — a live finding caught in production, acknowledged by 3 maintainer teams
- [002 — xz-utils Retrospective: Would ACS Have Caught Jia Tan?](case-studies/002-xz-utils-retrospective.md) — yes, 6-9 months before CVE-2024-3094

## Repos Scanned

| Repo | Health | Contributors Scored |
|------|--------|-------------------|
| [nodejs/node](https://agentcreditscore.ai/api/repo/nodejs/node) | 95 | 424 |
| [facebook/react](https://agentcreditscore.ai/api/repo/facebook/react) | 85 | 71 |
| [vercel/next.js](https://agentcreditscore.ai/api/repo/vercel/next.js) | 90 | 73 |
| [vitejs/vite](https://agentcreditscore.ai/api/repo/vitejs/vite) | 88 | 127 |
| [webpack/webpack](https://agentcreditscore.ai/api/repo/webpack/webpack) | 80 | 94 |
| [expressjs/express](https://agentcreditscore.ai/api/repo/expressjs/express) | 75 | 58 |
| [eslint/eslint](https://agentcreditscore.ai/api/repo/eslint/eslint) | 90 | 11 |
| [node-fetch/node-fetch](https://agentcreditscore.ai/api/repo/node-fetch/node-fetch) | 15 | 25 |
| [moment/moment](https://agentcreditscore.ai/api/repo/moment/moment) | 30 | 24 |
| [request/request](https://agentcreditscore.ai/api/repo/request/request) | 20 | 15 |
| [jaredhanson/passport](https://agentcreditscore.ai/api/repo/jaredhanson/passport) | 25 | 9 |

## API

**Single-track (ACS code behavior):**
```
GET agentcreditscore.ai/api/contributor/:username
GET agentcreditscore.ai/api/repo/:owner/:repo
```

**Multi-track (Combined Trust Record):**
```
GET agentcreditscore.ai/api/combined/:identifier    # JSON
GET agentcreditscore.ai/report/:identifier           # HTML report
```

**Live scoring (computes fresh SIGNAL from doorman API):**
```
GET agentcreditscore.ai/api/score/:identifier
```

**Database stats:**
```
GET agentcreditscore.ai/api/stats
```

## Request a Scan

Want ACS to scan your repo or score an AI coding agent? [Open a scan request](https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md).

Free for open source. Paid scans available for private repos and enterprise.

## How Scoring Works

ACS scores are based on publicly observable GitHub behavior. The evidence behind each score (account age, PR counts, cross-repo data, timestamps) is published and verifiable. The specific algorithm that weights these signals into a score is proprietary.

Scores range from **0-100** with letter grades (AAA through D). [Full methodology](methodology/overview.md).

## What ACS Is NOT

- **Not a verdict.** Scores indicate behavioral patterns, not character. "CC" means "review carefully," not "this person is malicious."
- **Not permanent.** Scores evolve as behavior changes.
- **Not about code quality.** Other tools check if code is well-written. ACS checks if the contributor is trustworthy.

## License

Score data and case studies: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
