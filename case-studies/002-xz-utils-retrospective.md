# Case Study 002: xz-utils Supply Chain Attack — ACS Retrospective Analysis

**Date:** April 2026
**Analysis by:** ACS (Agent Credit Score)
**Subject:** Jia Tan (GitHub: JiaT75)
**Target project:** tukaani-project/xz (xz-utils / liblzma)
**Outcome:** SSH authentication backdoor affecting millions of Linux systems
**Discovered:** March 29, 2024, by Andres Freund (Microsoft engineer)

## Summary

Over approximately 2.5 years, the GitHub account "JiaT75" executed a methodical trust-building campaign on the xz-utils compression library. Starting with tests, documentation, and translations, the contributor escalated to core library code, gained co-maintainer status, and ultimately injected a backdoor into liblzma that compromised OpenSSH authentication on systemd-based Linux distributions. The backdoor was shipped in xz versions 5.6.0 and 5.6.1.

This retrospective applies ACS behavioral signals to JiaT75's publicly observable GitHub activity to answer one question: **Would ACS have flagged this contributor before the backdoor was injected?**

---

## 1. GitHub Profile Data

**Source:** `gh api users/JiaT75` (verified April 2026 — account still exists)

| Field | Value |
|-------|-------|
| Account created | 2021-01-26 |
| First public contribution (libarchive) | 2021-09-30 (PR #1587) |
| First xz contribution | 2022-01-28 (commit: NULL checks to LZMA properties encoders) |
| First xz issue/PR on GitHub | 2022-12-14 (issue #1: "Tests: Adds lzip decoder tests") |
| Public repos | 10 (forks of xz-adjacent compression projects) |
| Followers | 1,400 (inflated post-discovery) |
| Following | 1 |
| Bio | Empty |
| Company | Empty |
| Blog | Empty |
| Location | Empty |
| Public gists | 0 |

**Key observation:** The account was created 8 months before any public activity. The profile is a blank slate — no bio, no company, no blog, no location. The only identifying information is a Gmail address (jiat0218@gmail.com). The 10 public repos are all forks of compression-related projects: libarchive, lz4, zstd, oss-fuzz, squashfs-tools, ZipArchive, wasmtime, seatest, cpp-docs.

**Time from account creation to first contribution:** ~8 months (account created Jan 2021, first PR to libarchive Sep 2021).

**Time from account creation to first xz contribution:** ~12 months (first xz commit dated Jan 2022, though the GitHub-hosted repo was created Oct 2022 — earlier contributions were to the upstream git.tukaani.org repository and were imported when the project migrated to GitHub).

---

## 2. Contribution Pattern to tukaani-project/xz

### Total Commit Volume

| Period | Commits | Category |
|--------|---------|----------|
| 2022 (partial, from Jan) | 52 | Tests, CI, docs, minor fixes |
| 2023 | ~313 | Tests, translations, build system, liblzma source code |
| 2024 (Jan 1 - Mar 29) | 100 | Translations, build, CRC optimizations, test files, release prep |
| **Total** | **~465 commits** | |

### The Scope Escalation Pattern

JiaT75's contributions follow a textbook trust-building progression. The issue titles tell the story when read chronologically:

**Phase 1: Tests and CI (Dec 2022 - Jan 2023)**
- #1: "Tests: Adds lzip decoder tests"
- #2: "CMake: Update .gitignore"
- #3: "Doxygen: Update .gitignore"
- #7: "Tuktest index hash"
- #8: "Refactor tests in test_index.c"
- #9: "Tests: Refactors existing filter flags tests"
- #10: "[Bug]: Multiple tests failing on Solaris 10"
- #11: "Tests: Replace non portable shell parameter expansion"
- #18: "[Feature Request]: Create Windows CI Support"

**Phase 2: Documentation (Jan - Feb 2023)**
- #23: "Minor updates to Doxygen comments in base.h"
- #27: "Minor updates to documentation in block.h"
- #29: "liblzma: Improve documentation in check.h"
- #31: "Minor updates to documentation in filter.h"
- #33: "Improve documentation in container.h"
- #35: "Minor updates to documentation in index.h"

**Phase 3: Bug reports and library code (Feb 2023+)**
- #37: "[Bug]: lzma_lzma_preset() returns success if preset is unusable"
- #39: "lzma_lzma_preset() return failure with unsupported Match Finder"
- #40: "liblzma: Clarify lzma_lzma_preset() documentation in lzma12.h"
- #41: "CMake: Allow configuring features as cache variables"

**Phase 4: Core maintainer activity (mid-2023 onward)**
By mid-2023, JiaT75 was committing directly to the repository (no PRs — direct pushes), indicating co-maintainer access. Commits include:
- CRC32/CRC64 optimization code (ifunc, ARM64, CLMUL)
- RISC-V BCJ filter implementation (a significant new feature)
- Build system changes across Autotools and CMake
- Translation coordination across multiple languages
- Release management (NEWS files, version bumps for 5.4.x, 5.5.x, 5.6.x)

**This is the classic escalation pattern: Tests -> Docs -> Bug reports -> Source code -> Release management.**

### Critical Period: Late 2023 - March 2024

In the months before the backdoor, JiaT75's commits reveal preparation:

1. **2023-07-07:** Merged PR #10667 on google/oss-fuzz: "xz: Disable ifunc to fix Issue 60259." This disabled a fuzzing feature that might have detected the backdoor payload.

2. **2023-11-29 and 2023-11-30:** Two PRs on google/oss-fuzz changing the xz project configuration — updating clone URLs and adding maintainer contacts. This gave JiaT75 control over how oss-fuzz interacted with xz.

3. **2024-02-10:** Two more oss-fuzz PRs updating project homepages for xz and xz-java. All four oss-fuzz changes were merged.

4. **2024-02-23 (commit cf44e4b7):** "Tests: Add a few test files." Added binary test files including `bad-3-corrupt_lzma2.xz` and `good-large_compressed.lzma`.

5. **2024-03-09 (commit 6e636819):** **"Tests: Update two test files."** This is the critical commit. The commit message reads: *"The original files were generated with random local to my machine. To better reproduce these files in the future, a constant seed was used to recreate these files."* This replaced the binary test files `bad-3-corrupt_lzma2.xz` and `good-large_compressed.lzma` with versions containing the obfuscated backdoor payload. The files show 0 additions, 0 deletions in the GitHub API (binary files) — making code review of the actual content impossible through the GitHub diff interface.

6. **2024-02-24:** Version bump for 5.6.0 and 5.7.0alpha. The backdoor-containing test files were included in the 5.6.0 release tarball.

7. **2024-03-09:** "Add NEWS for 5.6.1" — the second release containing the backdoor, with additional obfuscation.

### The Build System Injection

The backdoor was not in the test files alone. The release tarball (but NOT the git repository) contained a modified `build-to-host.m4` script that extracted the payload from the binary test files during the build process and injected it into liblzma. This means:
- The malicious build script was only in the tarball, not in git
- The payload was hidden in binary "test" files that looked innocuous
- The extraction script was obfuscated through multiple layers of compression and shell commands
- The resulting backdoor intercepted RSA key verification in OpenSSH via the systemd notification mechanism

---

## 3. Cross-Repo Behavior

### Repositories JiaT75 Contributed To

| Repository | First Activity | Nature | Relevance |
|-----------|---------------|--------|-----------|
| libarchive/libarchive | Sep 2021 (PR #1587) | Archive/compression library | Compression infrastructure |
| tukaani-project/xz | Jan 2022 | Compression library (target) | Primary target |
| google/oss-fuzz | Mar 2023 | Security fuzzing infrastructure | Disabled fuzzing that could detect backdoor |
| JiaT75/lz4 (fork) | Unknown | Compression library | Fork only, no upstream PRs found |
| JiaT75/zstd (fork) | Unknown | Compression library | Fork only, no upstream PRs found |
| JiaT75/squashfs-tools (fork) | Unknown | Filesystem compression | Fork only |

### The Pattern

Every repository JiaT75 interacted with is related to compression or build infrastructure. The libarchive contributions (Sep-Nov 2021) served as a warmup — 9 PRs submitted, 5 merged, establishing a plausible contribution history before targeting xz. The PRs were legitimate (documentation, bug fixes, test improvements) and built a track record.

The oss-fuzz contributions are the most damning cross-repo signal. JiaT75 submitted 6 PRs to google/oss-fuzz, all related to the xz project's fuzzing configuration. The July 2023 PR that disabled ifunc in the fuzzer removed a detection vector for the exact class of attack that would be deployed 8 months later.

**This constitutes cross-repo targeting of security-critical infrastructure in a coordinated pattern: compromise the target, then compromise the monitoring.**

---

## 4. The Social Engineering Campaign

### Pressure on the Original Maintainer

The xz-utils project was maintained by a single developer, Lasse Collin (Larhzu), who had maintained the project since 2009. Public mailing list archives (not verifiable through the GitHub API, but extensively documented in post-incident analysis) show that in 2022, several accounts began pressuring Collin to add a co-maintainer:

**Accounts that applied pressure (from public mailing list archives):**

| Account | Action | Verifiable via GitHub API? |
|---------|--------|---------------------------|
| "Jigar Kumar" | Sent messages to xz-devel mailing list pressuring Collin about slow patch review | No (mailing list only) |
| "Dennis Ens" | Sent messages suggesting the project needed a co-maintainer | No (mailing list only) |
| Lasse Collin | Eventually granted JiaT75 commit access, citing burnout and mental health issues | Partially (commit history shows transition) |

**What we can verify through the GitHub API:** JiaT75 transitioned from submitting PRs (issues #1-41, Dec 2022 - Feb 2023) to direct commits (no associated PR or issue) by mid-2023. This transition indicates the granting of direct push access. The exact date is not exposed through the GitHub API collaborators endpoint (requires admin access to the repository).

**What we cannot verify:** The identities of "Jigar Kumar" and "Dennis Ens." No GitHub accounts with those names have been definitively linked to JiaT75 or to each other. These accounts may have been sockpuppets operated by the same entity, but this is unproven. ACS cannot score accounts that exist only on mailing lists outside GitHub.

---

## 5. ACS Signal Analysis

### Signal 1: Account Age at First Contribution

| Metric | Value | Flag? |
|--------|-------|-------|
| Account created | 2021-01-26 | |
| First contribution (libarchive) | 2021-09-30 | |
| First xz contribution | 2022-01-28 (git) / 2022-12-14 (GitHub issues) | |
| Account age at first xz GitHub PR | ~23 months | |

**Verdict: WEAK FLAG.** The account was 23 months old when the first xz GitHub issue was opened. This is old enough to pass most age-based filters. However, the 8-month dormancy between account creation (Jan 2021) and first public activity (Sep 2021) is a minor flag — it suggests the account existed before any contribution was made, consistent with preparation.

An ACS signal that checked "time from account creation to first contribution" would see 8 months of inactivity. This alone is not suspicious (many developers create accounts before using them), but it is a data point.

**ACS improvement:** Track not just account age, but the ratio of account age to activity density. An account with 0 activity for 8 months followed by a focused campaign on compression libraries is more notable than an account with sporadic activity over the same period.

### Signal 2: PR Velocity

| Period | PRs/Issues on xz | Commits to xz | Notes |
|--------|-------------------|----------------|-------|
| Dec 2022 | 7 issues | ~15 commits | Burst of activity on a new-to-them project |
| Jan 2023 | 12 issues | ~25 commits | Sustained high output |
| Feb 2023 | 7 issues | ~15 commits | Continuing |
| Mar 2023 - onward | 0 new issues | Direct commits | Transitioned to maintainer |
| 2023 total | 0 new issues (after Feb) | ~313 commits | Pure maintainer activity |
| 2024 (to March) | 0 issues | ~100 commits | Release crunch |

**Verdict: MODERATE FLAG.** The velocity pattern has two notable features:

1. **Initial burst:** 26 issues in 2.5 months (Dec 2022 - Feb 2023) is aggressive for a project with a single maintainer and historically slow review cycles. This is the "build trust fast" phase.

2. **Abrupt transition:** After February 2023, JiaT75 stopped opening issues entirely and switched to direct commits. This indicates co-maintainer access was granted within roughly 2-3 months of the first GitHub contribution. For a critical infrastructure project, this is an extremely fast trust escalation.

**ACS improvement:** Flag transitions from "submitting PRs" to "direct push access" when the transition happens in under 6 months. The speed of trust escalation is the signal, not the velocity alone.

### Signal 3: Cross-Repo Targeting

| Repos contributed to | All compression-related? | Security infrastructure targeted? |
|----------------------|--------------------------|----------------------------------|
| libarchive, xz, oss-fuzz, (forks of lz4, zstd, squashfs-tools) | Yes — 100% | Yes — oss-fuzz (fuzzing infrastructure) |

**Verdict: STRONG FLAG.** Every repository JiaT75 interacted with is in the compression/archive domain. The forked repos (lz4, zstd, squashfs-tools) are all compression libraries. The oss-fuzz contributions specifically targeted xz's fuzzing configuration.

A contributor who only contributes to compression libraries is not inherently suspicious — many developers specialize. But the combination of:
- Narrow domain focus (compression only)
- Contributions to the fuzzing infrastructure for the same project
- Zero activity outside this domain (no personal projects, no other open source work)

...creates a cross-repo targeting pattern that ACS should flag.

**ACS improvement:** Score the "domain concentration" of a contributor's portfolio. A contributor who works exclusively on compression libraries + their fuzzing infrastructure, with no other open source activity, has a narrower profile than typical specialists (who usually have personal projects, tools, or contributions to tangential domains).

### Signal 4: Scope Escalation

| Phase | Timeline | Scope |
|-------|----------|-------|
| Phase 1 | Sep-Nov 2021 | libarchive: docs, tests, minor fixes (warmup project) |
| Phase 2 | Dec 2022 - Jan 2023 | xz: tests, CI, .gitignore, Doxygen |
| Phase 3 | Jan-Feb 2023 | xz: documentation in header files |
| Phase 4 | Feb 2023 | xz: bug reports in library API |
| Phase 5 | Mid 2023 | xz: core library code (CRC, filters, build system) |
| Phase 6 | Late 2023 | xz + oss-fuzz: release management + fuzzer configuration |
| Phase 7 | Feb-Mar 2024 | xz: binary test files containing backdoor payload |

**Verdict: STRONG FLAG.** This is the most textbook scope escalation ACS is designed to detect. The progression from .gitignore -> tests -> docs -> bug reports -> source code -> release management -> binary test files follows the exact pattern described in ACS's behavioral signals methodology.

The critical escalation is Phase 5 -> Phase 7: from "legitimate core library contributor" to "modifying binary test files that carry an obfuscated payload." The commit message for the backdoor payload ("Tests: Update two test files" with the explanation about reproducible seeds) is a masterclass in making a malicious change look routine.

**ACS improvement:** Binary file modifications by relatively new contributors should receive additional scrutiny scoring. The GitHub API shows 0 additions, 0 deletions for binary files — they are invisible to line-based code review. ACS should flag: "Contributor X modified binary files in a security-critical repository. Binary diffs cannot be reviewed through standard tooling."

### Signal 5: Security-Sensitive File Ratio

Analysis of JiaT75's commits in the critical period (Nov 2023 - Mar 2024):

| File category | Examples | Count |
|--------------|---------|-------|
| Translations (.po files) | German, Korean, Ukrainian, Romanian, etc. | ~40 commits |
| Build system | CMakeLists.txt, configure.ac, m4 macros | ~15 commits |
| CRC implementation | crc32_fast.c, crc64_fast.c, crc32_arm64.h | ~10 commits |
| Test files (binary) | tests/files/*.xz, tests/files/*.lzma | ~5 commits |
| Release management | NEWS, version bumps | ~5 commits |
| Documentation | INSTALL, man pages | ~5 commits |

**Verdict: MODERATE FLAG.** The CRC implementation files are security-adjacent (CRC functions are used in integrity checks). The build system modifications are security-sensitive (build scripts control what gets compiled). The binary test files are the actual attack vector.

However, the majority of commits are translations and documentation — legitimate maintenance work that dilutes the security-sensitive ratio. This is precisely the cover pattern: bury security-relevant changes in a flood of routine maintenance.

**ACS improvement:** Don't just measure the ratio. Measure the *trend*. JiaT75's early commits were 90%+ tests and docs. The late commits include CRC implementations, build system changes, and binary file modifications. The security-sensitive ratio increased over time — that trajectory is the signal.

### Signal 6: Dormant Reactivation

**Verdict: NOT APPLICABLE.** JiaT75's account was not dormant and reactivated. Activity was continuous from September 2021 onward. This signal would not have triggered.

However, a variant of this signal is relevant: the account had **zero activity for 8 months** between creation (Jan 2021) and first contribution (Sep 2021). This is a "pre-activation dormancy" pattern rather than a "dormant reactivation" pattern.

**ACS improvement:** Add a signal for "pre-activation dormancy" — accounts that exist for months before any public activity, then begin a focused contribution campaign.

---

## 6. Composite Assessment

### Would ACS Have Flagged Jia Tan?

**At time of account creation (Jan 2021):** No. Nothing to flag.

**At first xz contribution (Dec 2022):** MAYBE. Signals available:
- Account age: 23 months (passes)
- Profile completeness: Empty profile (minor flag)
- Cross-repo history: Only libarchive contributions, all compression-related (minor flag)
- Prior contributions: 9 PRs to libarchive over 2 months, then 13 months of no activity before xz (moderate flag)

**At co-maintainer grant (~mid 2023):** YES. Signals available:
- Scope escalation: Tests -> Docs -> Source code in 6 months (flag)
- Velocity: 26 issues in 2.5 months on a single project (flag)
- Trust escalation speed: PR submitter to direct committer in ~3 months (strong flag)
- Cross-repo pattern: All activity in compression domain (flag)
- Profile: Still completely empty after 2.5 years and 300+ contributions (flag)

**At backdoor injection (Feb-Mar 2024):** YES, with high confidence. Additional signals:
- oss-fuzz modifications that disabled detection capabilities (strong flag)
- Binary test file modifications that cannot be reviewed via diff (flag)
- Release management control for the exact versions containing the backdoor (flag)
- 465+ commits to a single project with zero activity elsewhere (flag)

### The Honest Answer

ACS would have flagged JiaT75 as **elevated risk** by mid-2023, when co-maintainer access was granted. The combination of:
1. Empty profile
2. Compression-only contribution portfolio
3. Rapid trust escalation (3 months from first PR to direct push access)
4. Scope escalation pattern (tests -> docs -> source -> maintainer)
5. Cross-repo targeting (xz + its oss-fuzz configuration)

...would have produced a risk score warranting review.

**ACS would NOT have definitively identified JiaT75 as malicious.** These signals are consistent with both a state-sponsored supply chain attack AND a legitimate developer who prefers privacy, specializes in compression, and earned trust through high-quality work. The contributions were genuinely high quality — the RISC-V BCJ filter, CRC optimizations, and CI improvements were real, valuable work.

**What ACS would have done:** Generated a report saying, approximately: "This contributor has an elevated risk profile due to rapid trust escalation, narrow domain focus, empty identity signals, and increasing access to security-sensitive code paths. Recommend enhanced review for commits touching build system, binary files, and security-relevant code."

That report, delivered to Lasse Collin or downstream distribution maintainers in mid-2023, would have been **6-9 months before the backdoor was injected.** Whether anyone would have acted on it is a different question.

---

## 7. What ACS Learns From This Case

### Signals That Would Have Worked
1. **Scope escalation tracking** — the tests-to-maintainer pipeline is detectable
2. **Cross-repo domain concentration** — 100% compression is unusually narrow
3. **Trust escalation velocity** — 3 months from first PR to committer is fast for critical infrastructure
4. **oss-fuzz targeting** — modifying the fuzzing configuration for the same project you contribute to is a high-signal behavior
5. **Binary file modifications** — invisible to standard code review

### Signals That Would NOT Have Worked
1. **Account age** — 23 months is old enough to pass
2. **Dormant reactivation** — the account was continuously active
3. **PR velocity alone** — the velocity was high but not unreasonable for an active contributor

### New Signals This Case Study Suggests
1. **Pre-activation dormancy:** Time between account creation and first contribution
2. **Fuzzer/monitor compromise:** Contributing to both a project AND its security monitoring infrastructure
3. **Binary file risk multiplier:** Binary modifications in security-critical repos should carry extra weight
4. **Trust escalation rate:** Time from "submits PRs" to "direct push access" relative to project norms
5. **Identity-to-activity ratio:** A completely empty profile with 465+ commits is unusual — most prolific contributors have some profile information
6. **Release-path access:** A contributor with release management access has maximum blast radius

### The Fundamental Limitation

The xz-utils attack worked because it was patient, high-quality, and targeted a project with a single burned-out maintainer. ACS can flag risk. It cannot prevent a maintainer from granting trust to a contributor who has spent 2 years doing genuinely useful work.

The defense is not "don't trust anyone" — it's "require additional review when risk signals are elevated." Binary file changes from any contributor should require enhanced review. Build system changes should require enhanced review. The combination of both, from a contributor with a rapid trust escalation, should trigger the highest level of scrutiny.

---

## Appendix: Raw Data Sources

All data in this analysis was retrieved from the GitHub API on April 4, 2026:

- `gh api users/JiaT75` — profile data
- `gh api repos/tukaani-project/xz/commits?author=JiaT75` — 452 commits across 5 pages
- `gh api repos/tukaani-project/xz/issues?creator=JiaT75` — 35 issues
- `gh api repos/tukaani-project/xz/commits/6e636819` — the "Update two test files" commit (backdoor payload)
- `gh api repos/tukaani-project/xz/commits/cf44e4b7` — the "Add a few test files" commit
- `gh api repos/google/oss-fuzz/commits?author=JiaT75` — 6 oss-fuzz commits
- `gh search prs --repo google/oss-fuzz --author JiaT75` — 6 oss-fuzz PRs
- `gh search prs --repo libarchive/libarchive --author JiaT75` — 9 libarchive PRs
- `gh api users/JiaT75/repos` — 10 forked repos

Social engineering details (mailing list pressure from "Jigar Kumar" and "Dennis Ens") are sourced from post-incident public reporting and cannot be verified through the GitHub API.
