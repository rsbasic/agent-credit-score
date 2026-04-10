# vitejs/vite — Repo Health Report

**Scanned:** 2026-04-10
**Health score:** 88/100
**Weekly downloads:** ~30M (npm)
**Active maintainers:** 12+
**Status:** Actively maintained, healthy

---

## Summary

Vite is in a different class from the abandoned repos Rex scanned earlier (node-fetch, request, moment). It has an engaged maintainer team, healthy PR throughput, and the community skews toward established contributors. 201 open PRs is high absolute volume, but commensurate with the scale of the project.

## Scan scope

- **Open PRs analyzed:** 201
- **Unique contributors scored:** 135 (127 new to ACS, 8 pre-existing)
- **Scoring method:** Automated signal pass using public GitHub API data

## Distribution

| Grade | Count | Share |
|-------|-------|-------|
| AAA | 3 | 2% |
| AA | 21 | 17% |
| A | 96 | 76% |
| BBB | 6 | 5% |
| NR | 1 | <1% |

**Average score:** 76.8
**Range:** 60–98

The "A" heavy distribution reflects an established contributor base with long account histories, normal PR velocities, and no cross-repo targeting.

## Notable contributors (top scores)

- **bluwy** (AAA, 93) — Core maintainer, 1,662 lifetime PRs
- **privatenumber** (AAA) — Longtime contributor
- **btea** (AAA) — Established
- **sapphi-red** (AA, 88) — Core maintainer, security-keyword title was a benign optimizer fix

## Flagged (8)

All flags were low-severity and resolved as benign or watchlist-only:

- **dependabot[bot]**, **renovate[bot]** — Expected high-velocity automation; scored 65–70 with tag
- **elohmeier** — `trustProxy` feature (8-year account, routine)
- **Fatpandac** — Proxy router feature (9-year account, routine)
- **JarekToro** — html-proxy cache fix (13-year account, routine)
- **zakiscoding** — SSR proxyModuleUrl fix (2-year account, routine)
- **sapphi-red** — Core maintainer, optimizer fix (routine)
- **lilianakatrina684-a11y** — **Watchlist**: 62-day account, empty profile, 3 accessibility-labelled docs PRs. No code scope escalation, no security-sensitive paths. Not escalated, tracked.

No cross-repo targeting patterns were detected. No scope-escalation patterns were detected. No nthbotast-style signature in this cohort.

## Comparison to other scanned repos

| Repo | Avg score | Flag rate | Health |
|------|-----------|-----------|--------|
| vitejs/vite | 76.8 | 6% (mostly benign) | 88 |
| facebook/react | ~73 | 14% | 85 |
| expressjs/express | ~70 | — | 75 |
| node-fetch/node-fetch | — | nthbotast campaign | 15 |

Vite is the healthiest JS-ecosystem repo ACS has scanned to date. That matters: it establishes a baseline for what a well-governed, well-staffed OSS project looks like in the ACS score distribution, against which stressed and abandoned repos can be compared.

## Methodology

- Open PRs pulled from GitHub API
- Each contributor's GitHub profile fetched (account age, followers, public repos, PR totals)
- Scoring applied: baseline 70, adjusted for identity, velocity, and behavioral signals
- Deep investigation only for contributors tripping hard suspicion criteria (age < 90 days + 2+ PRs, empty profile on new account, velocity > 3/day, or security-sensitive path modifications)

## Evidence

All contributor scores are available via the ACS API:
- `curl https://agentcreditscore.ai/api/contributor/<username>`
- `curl https://agentcreditscore.ai/api/repo/vitejs/vite`

---

*Scanned by rex. Automated signal pass, no manual audit of individual PRs. Flagged contributors reviewed individually.*
