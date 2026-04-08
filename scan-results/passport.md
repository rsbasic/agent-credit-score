# Security Scan: jaredhanson/passport

**Scan date:** 2026-04-04
**Package:** passport (npm)
**Repository:** https://github.com/jaredhanson/passport
**Current version:** 0.7.0 (published 2023-11-27)

---

## 1. Basic Health

| Metric | Value |
|---|---|
| Stars | 23,526 |
| Open issues | 396 |
| Open PRs | 42 |
| Last commit to master | 2024-08-16 (README updates only) |
| Last source code commit | 2024-01-26 (sponsor addition) |
| Last functional code change | 2023-11-27 (v0.7.0 release) |
| npm weekly downloads | 5,553,564 |
| License | MIT |
| Node.js engine requirement | >= 0.4.0 |

**Assessment:** Extremely high download count but effectively unmaintained. No source code changes in over 2 years. Last 20 commits on master are ALL README updates from a single day (2024-08-16). The repo is alive in name only.

---

## 2. Maintainers

### Top 5 Contributors
| Contributor | Commits | Status |
|---|---|---|
| jaredhanson | 595 | Sole meaningful contributor. No public GitHub events recently. Last npm publish Nov 2023. |
| mjhea0 | 5 | Minor docs contributor |
| camshaft | 3 | Inactive |
| woloski | 3 | Inactive |
| kulakowka | 2 | Inactive |

### npm Publish Access
- **Sole publisher:** jaredhanson (jaredhanson@gmail.com)
- No other npm maintainers listed
- Single point of failure for all npm releases

**Assessment:** Single-maintainer project. Bus factor = 1. If jaredhanson's npm account is compromised, 5.5M weekly downstream installs are exposed. No evidence of maintainer succession planning.

---

## 3. Open PRs Analysis (Last 6 Months)

Only 3 PRs opened in the last 6 months:

### PR #1055 — docs: fix typos in markdown documentation
- **Author:** Goldyvaiiii | **Date:** 2026-03-30
- **Touches:** Documentation only
- **Author profile:** Created 2024-11-07 | 1 follower | 68 public repos | No bio, no location, no company
- **Flag:** Relatively new account, no meaningful profile. Low risk (docs only).

### PR #1054 — docs: modernize Mongoose examples using async/await
- **Author:** Vikash9546 | **Date:** 2026-03-23
- **Touches:** Documentation only
- **Author profile:** Created 2024-10-14 | 4 followers | 47 public repos | No bio, no location, no company
- **Flag:** Relatively new account, no meaningful profile. Low risk (docs only).

### PR #1053 — fix: correct JSDoc parameter type in Authenticator.prototype.use
- **Author:** AkaHarshit | **Date:** 2026-03-19
- **Touches:** `lib/authenticator.js` (source code — core auth module)
- **Change:** 1 addition, 1 deletion — JSDoc type annotation update
- **Author profile:** Created 2022-04-30 | 4 followers | 67 public repos
- **Flag:** Touches authenticator.js but change is a JSDoc comment only (documentation within code). Minimal risk.

### Pattern Analysis on Recent PRs
- Goldyvaiiii and Vikash9546 are both new accounts (late 2024), both with no bio/location/company, both submitting docs PRs to the same repo within a week of each other. Could be a coordinated contribution campaign (e.g., Hacktoberfest-style) or coincidence. Neither touches source code.
- No signs of automated mass PR campaigns.
- None of the PRs have been reviewed or merged. All sit unattended, confirming project is unmaintained.

---

## 4. Security-Critical Open PRs (Any Age)

These PRs touch authentication logic, session handling, or credential processing:

### PR #1038 — Fix race condition in logOut (Fixes #1004)
- **Author:** chr15m (created 2009, 844 followers, 362 repos) — credible contributor
- **Date:** 2024-12-27
- **Touches:** `lib/sessionmanager.js`
- **Change:** 8 additions, 1 deletion — adds second save call in keepSessionInfo branch to prevent race condition
- **Status:** UNMERGED. Clean mergeable state, zero review comments.
- **RISK: This is an open, unpatched race condition in session logout handling.** Users calling logOut() may have session state inconsistencies.

### PR #1003 — Bug fix in middleware/authenticate
- **Author:** fergus99 (created 2018, 1 follower, 1 public repo)
- **Date:** 2023-09-12
- **Touches:** `lib/middleware/authenticate.js` + tests (165 additions, 3 deletions)
- **Change:** Fixes Object.create() usage for strategy objects passed to authenticate()
- **Status:** UNMERGED for 2.5 years despite having tests.
- **Flag:** Author has only 1 public repo. PR is large (165 lines). Change touches the core authenticate middleware.

### PR #987 — chore: not attempt strategy more than one time
- **Author:** Sczlog (created 2017, 3 followers, 36 repos)
- **Date:** 2023-06-15
- **Touches:** `lib/middleware/authenticate.js` + tests
- **Status:** UNMERGED for nearly 3 years.

### PR #1043 — Remove arguments.callee from AuthenticationError
- **Author:** rommni (created 2011, 2 followers, 18 repos) — long-standing account
- **Date:** 2025-04-07
- **Touches:** `lib/errors/authenticationerror.js`
- **Change:** Replaces deprecated `arguments.callee` with named function reference. Standard modernization fix.
- **Status:** UNMERGED.

### PR #533 — Regenerating session id before logging in user
- **Author:** lukaszmakuch
- **Date:** 2017-01-02
- **Touches:** Session regeneration logic
- **Status:** UNMERGED for 9 years. This was the session fixation fix that eventually became CVE-2022-25896.

---

## 5. Known CVEs

### CVE-2022-25896 — Session Fixation (CVSS 4.8, Moderate)
- **Affected:** passport < 0.6.0
- **Fixed in:** 0.6.0 (released 2022-05-20)
- **Current version 0.7.0 is patched.**
- The fix took 5+ years from initial report (issue #192) to patch, illustrating the maintainer bandwidth problem.

No other CVEs found specific to passport. However, the unmerged race condition PR (#1038) represents a potential unpatched vulnerability.

---

## 6. CI/CD Pipeline

### Workflow: `.github/workflows/node.yml`
- **Triggers:** Push and PR to master
- **Action:** Runs `npm install` && `npm test` across Node versions 0.10 through 17
- **No auto-publish to npm.** Publishing is manual by jaredhanson.
- **Outdated actions:** Uses `actions/checkout@v2` and `actions/setup-node@v2` (current is v4).
- **Outdated Node matrix:** Tests against Node 0.10 through 17. Does not test Node 18, 20, 22 (current LTS versions).

**Assessment:** CI exists but is stale. No automated npm publishing (good for supply chain safety, bad for getting fixes shipped). The CI matrix is so outdated it likely fails on modern runners.

---

## 7. Dependencies

```
passport-strategy: 1.x.x
pause: 0.0.1
utils-merge: ^1.0.1
```

- **pause 0.0.1** — Pinned to a 2012 version with NO LICENSE. Version 0.1.0 (MIT licensed) has been available since 2015. PR #1025 from mitchhentgesspotify (2024-05-08) fixes this but remains UNMERGED for 2 years.
- Minimal dependency tree (3 runtime deps) reduces supply chain attack surface.

---

## 8. Risk Assessment

### Critical Risks
1. **Single maintainer, effectively abandoned.** Jaredhanson is the sole npm publisher and sole meaningful contributor. No GitHub activity detected recently. 42 open PRs unreviewed, 396 open issues. Security patches will not ship.
2. **Unpatched race condition in session logout** (PR #1038). Reported Dec 2024, no maintainer response.
3. **5.5M weekly downloads with no active security response.** If a vulnerability is found, there is no evidence anyone will patch it.

### Moderate Risks
4. **npm single-point-of-failure.** One compromised account = 5.5M installs poisoned. No 2FA verification available from public data.
5. **Stale CI/CD.** Tests don't cover current Node.js LTS versions. Outdated GitHub Actions.
6. **Unlicensed dependency** (pause 0.0.1) — legal compliance risk.
7. **CVE-2022-25896 fix took 5+ years** — demonstrates slow security response even when maintainer was active.

### Low Risks
8. Recent PRs (last 6 months) are docs-only or trivial. No suspicious code injection attempts detected.
9. No automated PR campaigns or coordinated attacks observed.
10. No auto-publish workflow — manual npm publish reduces supply chain risk.
11. Minimal dependency tree (3 deps) limits transitive attack surface.

### Overall Risk Level: HIGH

This is critical infrastructure (authentication middleware for Node.js/Express) maintained by a single person who appears to have stopped active development. The combination of massive adoption, single maintainer, unpatched bugs, and zero PR review activity makes this a high-risk dependency. The library works and the code is stable, but the project's ability to respond to future security issues is near zero.

### Recommendations for Consumers
- Pin to exact version (0.7.0)
- Monitor for npm publish events (any unexpected publish is a red flag)
- Evaluate alternatives: @fastify/passport, or direct OAuth/OIDC libraries
- If continuing to use, audit `lib/sessionmanager.js` for the race condition in PR #1038
