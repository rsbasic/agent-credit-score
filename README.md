# Agent Credit Score (ACS)

**Behavioral trust scoring for code contributors — human or agent.**

ACS scores the trustworthiness of people and agents submitting code to open source repositories. Scores are based on observable public behavior — no opt-in, no integration, no registration required.

Existing tools check if code is safe. ACS checks if the people are safe.

## How It Works

Point ACS at a repo. Every contributor with open PRs gets a score based on behavioral signals:

- Account age and contribution history
- PR velocity and patterns
- Cross-repo behavior (same contributor targeting multiple related projects)
- Scope consistency (does the PR description match the actual changes?)
- Security impact (do the changes strengthen or weaken the codebase?)
- Trajectory (gradual contribution growth vs sudden velocity spikes)

Scores range from **0-100** with letter grades:

| Grade | Score | Meaning |
|-------|-------|---------|
| AAA | 95-100 | Highly established, consistent, trusted |
| AA | 85-94 | Well-established, strong track record |
| A | 75-84 | Established contributor, minor concerns |
| BBB | 65-74 | Moderate history, some review recommended |
| BB | 50-64 | Limited history, review recommended |
| B | 35-49 | Thin record or mixed signals |
| CCC | 20-34 | Multiple risk indicators present |
| CC | 10-19 | Significant risk indicators |
| C | 0-9 | Critical risk indicators |
| NR | — | Insufficient data to score |

## Why This Exists

Supply chain attacks exploit trust gaps in open source. The xz/liblzma backdoor. The September 2025 npm attack (2.6B weekly downloads compromised). Both succeeded because a contributor gained trust over time and nobody was checking behavioral patterns.

ACS was born from a real discovery: a 1-month-old account submitting 160 PRs across node-fetch (131M weekly downloads), undici (Node.js core HTTP client), axios, and lodash in 31 days. The source code PRs specifically targeted credential-handling infrastructure — stripping auth headers on node-fetch, attempting a TLS downgrade on undici. Three maintainer teams acknowledged the findings.

Read the full case study: [001 — Coordinated PR Campaign Across HTTP Client Libraries](case-studies/001-nthbotast-http-campaign.md)

## Scores

Browse published scores:
- [Contributor scores](scores/contributors/) — individual contributor trust assessments
- [Repo reports](reports/repos/) — repository health and maintenance assessments

## Request a Scan

Want ACS to scan your repo? [Open a scan request](https://github.com/rsbasic/agent-credit-score/issues/new?template=scan-request.md).

## For Agents (MCP / API)

ACS scores are queryable programmatically:

**MCP Server:** Connect to the ACS MCP server for inline trust checks during your workflow.

**HTTP API:**
```
GET agentcreditscore.ai/api/contributor/:username
GET agentcreditscore.ai/api/repo/:owner/:repo
GET agentcreditscore.ai/api/pr/:owner/:repo/:number
```

## What ACS Is NOT

- **Not a verdict.** Scores indicate behavioral patterns, not character. "CC" means "these signals warrant careful review," not "this person is malicious."
- **Not permanent.** Scores evolve as behavior changes. Consistent quality contributions raise the score over time.
- **Not about code quality.** Other tools check if code is well-written. ACS checks if the contributor is trustworthy.

## Methodology

ACS scores are based on publicly observable GitHub behavior. The evidence behind each score (account age, PR counts, cross-repo data, timestamps) is published and verifiable. The specific algorithm that weights these signals into a score is proprietary.

Read more: [Methodology Overview](methodology/overview.md)

## License

Score data and case studies: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
