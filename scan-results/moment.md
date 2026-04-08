# ACS Scan: moment/moment

**Date:** 2026-04-07
**Repo:** https://github.com/moment/moment
**npm:** moment
**Status:** Maintenance mode — effectively abandoned

## Health

| Metric | Value |
|--------|-------|
| Weekly npm downloads | 28.3M |
| Stars | 48,017 |
| Open issues | 298 |
| Open PRs | 15 |
| Last push | 2024-08-14 (20 months ago) |
| Archived | No |
| Auto-publish | npm-grunt.yml (Grunt-based, likely manual trigger) |

## Maintainer Status

| Contributor | Commits | Status |
|-------------|---------|--------|
| ichernev | 1,363 | Unknown — top contributor by far |
| timrwood | 807 | Original creator |
| icambron | 220 | Unknown |
| marwahaha | 101 | Unknown |

No maintainer has merged a PR or committed code since August 2024. 298 open issues, 15 open PRs — all sitting unreviewed.

## Open PR Analysis

**BigBalli** (account since 2010, 7 followers): 2 PRs on 2026-04-06, one touches `src/lib/moment/add-subtract.js` (DST fix) and one touches `src/lib/locale/locales.js` (webpack warning). Established account, reasonable changes. **ACS: BBB (65-74 range)** — established but low activity history.

**ankitkumar572005** (created 2024-12-08, 0 followers, 63 repos, 45 PRs): Docs typo fix. Spread across many repos (Font-Awesome, babel, astro, etc). Profile builder pattern but LOW risk — docs only. **ACS: BB (50-64 range)** — new account, but only touching docs.

**ayushshukla1807** (created 2024-09-22, 0 followers, 57 repos, 61 PRs): Typo fix in task description. Targets include WikiEduDashboard, axios, electron. **ACS: BB (50-64 range)** — similar pattern, docs only.

**Vikash9546** (created 2024-10-14, 4 followers, 47 repos, 16 PRs): Test fix and FAQ clarification. Lower velocity, more focused. **ACS: BBB (65-74 range)**.

## Risk Assessment

**Overall repo risk: MODERATE**

Unlike node-fetch, moment.js does NOT have:
- Active automated campaigns targeting security-sensitive code
- PRs modifying auth/credential handling
- Signs of coordinated cross-repo targeting

What it DOES have:
- 28.3M weekly downloads with no active maintainer
- 298 unaddressed issues
- No one reviewing or merging incoming PRs
- Multiple new-account contributors doing profile-building PRs (low risk individually)

The moment.js project has publicly stated it's in maintenance mode and recommends alternatives (Luxon, Day.js, date-fns). The risk is abandonment, not active threat.

## Flagged Contributors

None flagged. No contributor shows the nthbotast pattern (targeted security-path escalation across related repos).

## Recommendation

- LOW urgency for security alert (no active threat pattern detected)
- MODERATE concern for supply chain (28M downloads, no maintainer)
- Recommend enterprises migrate to maintained alternatives (Luxon, Day.js)
