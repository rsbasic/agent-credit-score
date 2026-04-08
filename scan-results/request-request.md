# Security Scan: request/request

**Scan date:** 2026-04-04
**Package:** request (npm)
**Repository:** https://github.com/request/request
**Version:** 2.88.2 (final)
**License:** Apache-2.0

---

## 1. Basic Health

| Metric | Value |
|--------|-------|
| Stars | 25,577 |
| Open Issues | 142 |
| Open PRs | 25 |
| Last Commit (master) | 2020-02-11 (README typo fix by gr2m) |
| Last Push Event | 2024-08-14 (likely a tag or non-default branch) |
| Archived | **No** (deprecated but NOT archived) |
| npm Weekly Downloads | **15,254,891** |
| Deprecated on npm | Yes - since Feb 2020, links to issue #3142 |
| Dependencies | 20 direct dependencies |
| Forks | 3,159 |
| Branch Protection (master) | Yes |
| CODEOWNERS | None |
| CI/CD Workflows (.github/workflows/) | **None** |
| Legacy CI | .travis.yml present (Travis CI) |

**Key concern:** 15.2M weekly downloads on a package that has been unmaintained for 6+ years with an unpatched CVE. This is pure legacy inertia.

---

## 2. Maintainers

### npm publish access (4 accounts):
- `mikeal` (Mikeal Rogers) - fredkschott, mikeal, nylen, simov
- `fredkschott` - Fred K. Schott
- `nylen` - Jeremy Nylen
- `simov` - Simeon Velichkov

### Top GitHub contributors:
| Contributor | Contributions | Account Created | Last Commit to Repo | Status |
|-------------|--------------|-----------------|---------------------|--------|
| mikeal | 623 | 2008-02-21 | 2020-02-11 | **Inactive** (5,077 followers, 509 repos) |
| simov | 475 | 2012-04-30 | 2018-08-06 | **Inactive** |
| nylen | 300 | - | - | **Inactive** |
| greenkeeperio-bot | 49 | - | - | Bot (service defunct) |
| seanstrom | 46 | - | - | **Inactive** |

**Assessment:** All maintainers are inactive on this repo. No one is reviewing PRs or merging code. The 4 npm accounts with publish rights represent a takeover risk if any account is compromised.

---

## 3. Open PRs (Last 6 Months)

**Zero open PRs from the last 6 months** (cutoff: 2025-10-04).

### Most Recent Open PRs (2023):

| PR | Date | Author | Title | Touches Source? |
|----|------|--------|-------|----------------|
| #3461 | 2023-07-26 | ksreejithnair | Update package.json | package.json only |
| #3449 | 2023-04-26 | dev-sharma-08 | Chore/testing GitHub workflow | **YES - 77 files, ALL source** |

### PR #3449 Deep Dive (FLAGGED):
- **Author:** dev-sharma-08
- **Account created:** 2022-10-28 (was ~6 months old at PR time)
- **Profile:** 1 follower, 1 public repo
- **Total PRs across GitHub:** 18 (mostly to postmanlabs repos)
- **Changed:** 77 files, +5,468 lines, -581 lines
- **Touches:** index.js, request.js, ALL lib/ files, .travis.yml, package.json, test SSL certs
- **Description:** Generic PR template, no meaningful description
- **Status:** Open, unmerged, unreviewed

**Risk assessment for PR #3449:** This PR modifies all core source files and SSL certificates with a vague description ("Chore/testing GitHub workflow"). The author has a thin GitHub profile. Because no maintainers are reviewing, this PR is dormant. **If merged by a compromised maintainer account, this would be a full supply chain attack vector.** Currently NOT merged, so no active threat - but it sits as a loaded gun.

### PR #3461:
- **Author:** ksreejithnair (account created 2017, 6 total PRs, 11 repos)
- **Touches:** package.json only
- **Risk:** Low

### Older open PRs (25 total):
All remaining PRs date from 2017-2022. Most are legitimate feature additions from established accounts. None are merged. The repo is functionally abandoned.

---

## 4. Known CVEs

### CVE-2023-28155 - Server-Side Request Forgery (SSRF)
- **Severity:** MODERATE (GHSA: GHSA-p8p7-x288-28g6)
- **Published:** 2023-03-16
- **Affected:** request <= 2.88.2 (ALL versions including latest)
- **Patched:** **NO PATCH EXISTS** - no firstPatchedVersion
- **Description:** SSRF bypass via cross-protocol redirect (HTTP to HTTPS or vice versa). Attacker-controlled server can redirect requests past SSRF mitigations.
- **Impact:** Any application using `request` with SSRF protections can have those protections bypassed.

### CVE-2017-16026 - Remote Memory Exposure
- **Severity:** MODERATE (GHSA: GHSA-7xfp-9c55-5vqj)
- **Published:** 2018-11-09
- **Affected:** request >= 2.2.6, < 2.68.0
- **Patched:** 2.68.0
- **Status:** Fixed in current version (2.88.2)

**Key finding:** CVE-2023-28155 is UNPATCHED and WILL NEVER BE PATCHED since the project is deprecated. All 15.2M weekly installs are vulnerable.

---

## 5. CI/CD Pipeline

- **No GitHub Actions workflows** (.github/workflows/ does not exist)
- **Travis CI config present** (.travis.yml) but Travis CI free tier for open source was discontinued
- **No auto-publish workflow** detected
- **No CODEOWNERS** file

**Assessment:** The lack of CI/CD is paradoxically protective here - there is no automated publish pipeline that could be hijacked. However, the 4 npm maintainer accounts can manually `npm publish` at any time. An account takeover on any of them (mikeal, simov, nylen, fredkschott) would allow a malicious version to be pushed to 15.2M weekly consumers.

---

## 6. Automated PR Campaign Analysis

**No signs of coordinated automated PR campaigns** (unlike the nthbotast pattern on node-fetch).

Evidence:
- Only 2 PRs since 2023, from different authors with different profiles
- No pattern of multiple PRs from the same bot-like account
- No rapid-fire PR submissions
- PR velocity is near zero (repo is effectively dead)
- Recent repo activity is limited to Watch/Fork events from random users

---

## Risk Summary

### Overall Risk: HIGH

| Risk Factor | Level | Detail |
|-------------|-------|--------|
| Maintainer activity | CRITICAL | No active maintainers. Last real commit: Feb 2020 |
| Unpatched CVEs | HIGH | CVE-2023-28155 (SSRF) will never be patched |
| npm account takeover surface | HIGH | 4 accounts with publish rights, all inactive |
| Download volume (blast radius) | CRITICAL | 15.2M weekly downloads |
| Automated attack patterns | LOW | No bot campaigns detected |
| CI/CD hijack risk | LOW | No automated publish pipeline exists |
| Suspicious open PRs | MODERATE | PR #3449 touches all source, but is unmerged |
| Deprecated but not archived | MODERATE | Repo accepts PRs/issues but nobody reviews them |

### Key Risks:
1. **Zombie package:** Deprecated, unmaintained, unpatched CVE, but still downloaded 15.2M times/week. This is the canonical example of supply chain risk through abandonment.
2. **npm account takeover:** The 4 npm publish accounts are the primary attack vector. If any one is compromised, a malicious version reaches millions of projects.
3. **Not archived:** Because the repo is not archived, it still accepts PRs and could theoretically have malicious code merged if a maintainer account is compromised.
4. **SSRF vulnerability is permanent:** CVE-2023-28155 affects all versions and will never receive a patch.

### Recommendation for ACS:
Any agent or project depending on `request` should be flagged. The package should be treated as a known-vulnerable, unmaintained dependency. Migration to `node-fetch`, `undici`, or native `fetch` (Node 18+) is the only remediation.
