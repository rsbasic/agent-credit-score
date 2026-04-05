# Repo Report: node-fetch/node-fetch

**Last Assessed:** 2026-04-04
**Health Score:** 15/100 (C)

## Overview

| Metric | Value |
|--------|-------|
| Weekly npm downloads | 131M |
| npm dependents | 45,348 |
| Stars | 8,862 |
| License | MIT |
| Last maintainer commit | July 25, 2023 (32 months ago) |
| Open issues | 240 |
| Open PRs | 15 |
| Active maintainers | 0 |
| Org members | 10 (all recently active on GitHub, none active on this repo) |
| npm publish accounts | 5 |
| Auto-publish pipeline | Yes (semantic-release on merge) |

## Risk Assessment

**CRITICAL:** This repo combines the highest possible download count with the lowest possible maintenance activity. No one is reviewing PRs, triaging issues, or monitoring for supply chain threats. The automated CI pipeline means any merged PR goes directly to npm and 131 million weekly users.

## Known Vulnerabilities

| CVE | Severity | Affected Versions | Fixed In |
|-----|----------|-------------------|----------|
| CVE-2020-15168 | Medium | < 2.6.1, < 3.0.0-beta.9 | 2.6.1+ / 3.0.0-beta.9+ |
| CVE-2022-0235 | High | < 2.6.7, < 3.1.1 | 2.6.7+ / 3.1.1+ |
| CVE-2022-2596 | Moderate | < 3.2.10 | 3.2.10+ |

All CVEs are patched in current releases. However, 88.6M weekly downloads are still on v2.x — many dependents may be on vulnerable versions.

## Flagged Contributors

| Contributor | ACS Score | Concern |
|-------------|-----------|---------|
| [nthbotast](../scores/contributors/nthbotast.json) | 12 (CC) | 160 PRs in 31 days, targets credential-handling code across HTTP libs |
| [theluckystrike](../scores/contributors/theluckystrike.json) | 31 (CCC) | Dormant account reactivated with 1,726 PRs in one month |

## Trusted Contributors (on this repo)

| Contributor | ACS Score | Note |
|-------------|-----------|------|
| [gr2m](../scores/contributors/gr2m.json) | 96 (AAA) | semantic-release creator, PR #1881 adds npm provenance |
| [sbingner](../scores/contributors/sbingner.json) | 88 (AA) | 16-year veteran, defensive bug fix |

## Recommendations

1. Do not merge any PR without careful review, especially #1878 (header stripping)
2. Prioritize PR #1881 (npm provenance from gr2m) — net security improvement
3. Add CODEOWNERS file requiring review for src/ changes
4. Consider archiving or transferring to a stewardship organization if no maintainer returns

## Related

- Security alert: [node-fetch #1882](https://github.com/node-fetch/node-fetch/issues/1882)
- Full case study: [001 — Coordinated PR Campaign](../case-studies/001-nthbotast-http-campaign.md)
