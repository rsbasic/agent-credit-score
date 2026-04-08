# webpack/webpack - ACS Scan Report

**Scanned:** 2026-04-08
**Repo:** https://github.com/webpack/webpack

## Repo Health

| Metric | Value |
|--------|-------|
| Stars | 65,945 |
| Open Issues | 204 |
| Last Push | 2026-04-08T15:27:36Z |
| npm Weekly Downloads | 40,207,657 |

## Open PR Contributors Scored

61 unique contributors with open PRs (excluding dependabot[bot]).
59 new scores written this session. 2 already scored (sokra, timneutkens).
1 pre-existing (bjohansebas).

### Grade Distribution

| Grade | Count | Contributors |
|-------|-------|-------------|
| AAA (95-100) | 7 | Danielku15, ScriptedAlchemy, TheLarkInn, ahabhgk, aleen42, alexander-akait, amannn |
| AA (85-94) | 30 | 3ru, CertainLach, Cronus1007, GuilleX7, Hinaser, MarioCadenas, MuTaToR08, SahidMiller, Zeracy, aespinolopez, andrescst, avivkeller, birdofpreyru, burhanuday, chenxsan, cinderblock, colinaaa, cseas, developit, eemeli, fi3ework, haoqunjiang, hybrist, jasongrout, laverdet, log101, lsycxyj, mc-zone, niieani, smelukov, snitin315, vankop, xiaoxiaojx |
| A (75-84) | 10 | FogelAI, Neerajpathak07, SeraphimKaito, Vansh5632, giladsegal, hai-x, nl-brett-stime, samarthsinh2660, sandersonatlatitude |
| BBB (65-74) | 8 | AarishMansur, Prinkal37, arkapratimc, aryanraj45, asadjan4611, crodriguez-plitzi, makaria, scameron |
| BB or below | 0 | -- |

### Confidence Levels

- **High:** 24 contributors (full profile + PR count available)
- **Medium:** 6 contributors (profile + PR count but shorter history)
- **Low:** 31 contributors (profile only, PR count rate-limited)

## Flagged Contributors

### 1. aryanraj45 - MONITOR
- **Score:** 65 (BBB), confidence: low
- **Account:** 2.6yr old, 6 followers, 20 public repos
- **Webpack PRs:** 4 open PRs (#20772, #20607, #20568, #20542)
- **Concern:** Young account with high webpack activity across core areas (template literals, import.meta.resolve, harmony modules, ChunkGraph tests)
- **Risk level:** Low-Moderate. PRs are feature/fix work, not security-critical. But 4 open PRs from a 2.6yr account with only 6 followers warrants monitoring.

### 2. samarthsinh2660 - MONITOR
- **Score:** 75 (A), confidence: low
- **Account:** 2.6yr old, 15 followers, 51 public repos
- **Webpack PRs:** 4 open PRs (#20505, #20298, #20273, #20232)
- **Concern:** Similar pattern to aryanraj45 - young account, multiple webpack PRs touching CSS, progress plugin, source maps, and import attributes.
- **Risk level:** Low-Moderate. Active contribution pattern but not targeting security paths.

### 3. Neerajpathak07 - VELOCITY WATCH
- **Score:** 75 (A), confidence: medium
- **Account:** 1.9yr old, 28 followers, 43 repos, 195 total PRs
- **Webpack PRs:** 1 open PR (#18942)
- **Concern:** 195 PRs in 679 days = 0.29/day. Consistent with Hacktoberfest/GSoC-style spray pattern.
- **Risk level:** Low. Only 1 webpack PR, reasonable velocity per day.

### 4. crodriguez-plitzi - THIN PROFILE
- **Score:** 65 (BBB), confidence: low
- **Account:** 4.8yr old, 1 follower, 1 public repo
- **Webpack PRs:** 1 open PR (#15271 - Sync Module Federation)
- **Concern:** Extremely thin public profile (1 repo, 1 follower) contributing to Module Federation, which is a trust-boundary feature. PR has been open since 2022.
- **Risk level:** Moderate. Module Federation handles cross-origin code loading. Thin profile deserves extra code review scrutiny.

### 5. asadjan4611 - NEW ACCOUNT
- **Score:** 65 (BBB), confidence: low
- **Account:** 1.3yr old, 3 followers, 25 repos
- **Webpack PRs:** 1 open PR (#20393 - Circular Dependency Error Messages)
- **Concern:** Newest account among contributors.
- **Risk level:** Low. Working on error messages (UX), not security-critical paths.

### 6. Prinkal37 - NEW + ZERO FOLLOWERS
- **Score:** 65 (BBB), confidence: medium
- **Account:** 1.4yr old, 0 followers, 10 repos, 2 total PRs
- **Webpack PRs:** 1 open PR (#19028 - Fix module error message)
- **Concern:** Zero followers, very few PRs.
- **Risk level:** Low. Error message fix, minimal attack surface.

## Security-Path Analysis

No open PRs directly target security-critical webpack internals (loader security, module resolution trust boundaries, or code generation safety). Key observations:

- **Module Federation** (trust boundary): ScriptedAlchemy (AAA, 2935 followers - webpack core team) and crodriguez-plitzi (BBB, thin profile) have PRs here
- **DefinePlugin** (code injection surface): AarishMansur (BBB) and vankop (AA) have PRs. Both are feature/safety improvements, not concerning
- **Code Generation** (xiaoxiaojx): Async code generation support - xiaoxiaojx has 151 followers and 4 PRs, appears legitimate
- **Tree-shaking / isPure** (alexander-akait): Core team member, AAA score

## Notable High-Trust Contributors

These are webpack core team / ecosystem leaders with open PRs:

| Contributor | Score | Followers | Role |
|-------------|-------|-----------|------|
| sokra | AAA* | 9,461 | webpack creator |
| alexander-akait | AAA | 1,040 | webpack core maintainer (8 open PRs) |
| TheLarkInn | AAA | 6,482 | webpack core team |
| ScriptedAlchemy | AAA | 2,935 | Module Federation creator |
| developit | AA | 12,964 | Preact creator, Google |
| timneutkens | AA* | 6,004 | Next.js lead |
| haoqunjiang | AA | 2,481 | Vue.js core team |
| snitin315 | AA | 1,209 | webpack contributor |

*Scored in prior scan

## Scan Metadata

- API rate limit hit after ~30 search/issues calls; remaining contributors scored with profile-only data (lower confidence)
- 59 new contributor files written to `/scores/contributors/`
- No critical flags. 2 contributors recommended for monitoring (aryanraj45, samarthsinh2660)
- 1 contributor with thin profile on trust-boundary feature (crodriguez-plitzi)
