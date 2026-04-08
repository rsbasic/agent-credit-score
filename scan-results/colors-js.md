# ACS Scan: Marak/colors.js

**Date:** 2026-04-07
**Repo:** https://github.com/Marak/colors.js
**npm:** colors
**Status:** Abandoned since the Marak incident (Jan 2022)

## Health

| Metric | Value |
|--------|-------|
| Weekly npm downloads | 22.1M |
| Stars | 5,177 |
| Open issues | 93 |
| Open PRs | 10 |
| Last push | 2023-06-14 (34 months ago) |
| Archived | No |

## Background

In January 2022, maintainer Marak Squires deliberately sabotaged colors.js (and faker.js) by pushing an infinite loop to the npm package, breaking thousands of downstream projects. This was a protest against corporations using open source without compensating maintainers. The incident became a landmark case in open source supply chain security.

## Current State

The repo has received no maintenance since June 2023. Open PRs are mostly from the January 2022 aftermath period. No active campaigns, no new contributor patterns of concern. The PR from "moemory" (created Jan 2022, single-character PR titled "o") and "opsxcq" (added "more autism") appear to be vandalism from the incident period.

## Risk Assessment

**Overall: LOW active threat, HIGH supply chain concern**

- No nthbotast-style automated campaigns
- No security-sensitive code changes in open PRs
- The primary risk is the EXISTING sabotage history — anyone depending on colors.js is depending on a package with a known hostile maintainer action in its history
- 22M weekly downloads suggest massive inertia — projects haven't migrated away

## Recommendation

- No ACS alert needed (no active threat)
- Enterprise guidance: migrate to alternatives (chalk, picocolors, colorette)
- Historical significance: this is case study material for supply chain risk education
