# nodejs/node — Repo Health Report

**Scanned:** 2026-04-12
**Health score:** 95/100
**Active maintainers:** 50+
**Status:** Actively maintained, the healthiest project in the ACS database

---

## Summary

Node.js core is in a different league from everything else ACS has scanned. 50+ active maintainers, a professional security team (RafaelGSS), rigorous review processes, and the TSC (Technical Steering Committee) governance model. 828 open PRs reflects the scale of the project, not neglect.

## Scan scope

- **Open PRs analyzed:** 828
- **Unique contributors scored:** 442 (424 new to ACS, 18 pre-existing)
- **Scoring method:** Automated signal pass using public GitHub API data

## Distribution

| Grade | Count | Share |
|-------|-------|-------|
| AAA | 28 | 6% |
| AA | 105 | 24% |
| A | 272 | 62% |
| BBB | 18 | 4% |
| BB | 1 | <1% |

**Average score:** 78.5
**Range:** 50–98

The heaviest AAA/AA concentration of any repo scanned — Node.js core attracts established contributors with long GitHub histories and substantial PR records.

## Notable contributors (top scores)

- **joyeecheung** (98/AAA) — V8/core contributor, extensive history
- **RafaelGSS** (AAA) — Node.js security team lead
- **panva** (AAA) — Crypto/TLS contributor
- **ChALkeR** (AAA) — Security contributor
- **legendecas** (AAA) — Core contributor

## Flagged (40)

**39 security-sensitive title flags** — all from core maintainers touching crypto, TLS, permissions, and OpenSSL code paths as expected. These are false positives in the adversarial-detection sense: the people modifying Node's crypto stack ARE the people who should be modifying Node's crypto stack. ACS correctly flags the paths but the contributor scores (mostly AAA/AA) indicate trusted individuals.

**1 genuine watchlist entry:**
- **vijaygovindaraja** (50/BB) — 18-day-old account, 51 total PRs across 20+ repos, empty profile. Investigated: PR content is mixed features/fixes across NVIDIA, Grafana, NASA, government repos. Portfolio-building or AI-assisted mass contribution pattern. NOT adversarial (no security targeting). Score 50 is appropriate — new account warrants review.

## Comparison to other scanned repos

| Repo | Avg score | Flag rate | Health |
|------|-----------|-----------|--------|
| **nodejs/node** | **78.5** | **9% (nearly all false positives)** | **95** |
| vitejs/vite | 76.8 | 6% (mostly benign) | 88 |
| facebook/react | ~73 | 14% | 85 |
| expressjs/express | ~70 | — | 75 |
| node-fetch/node-fetch | — | nthbotast campaign | 15 |

Node.js core has the highest average contributor score, the most AAA/AA contributors, and the most false-positive flags (because core maintainers legitimately touch security-sensitive code). It establishes the upper bound of what a well-governed, well-staffed OSS project looks like in the ACS score distribution.

## Why this scan matters

Every other repo ACS has scanned runs ON Node.js. Scoring Node.js core contributors means:
1. We now have baseline trust data for the people maintaining the runtime itself
2. If a Node.js core contributor also contributes to express, vite, or eslint, we can cross-reference (none found in current data — the contributor pools are surprisingly disjoint)
3. The "would ACS have caught xz-utils?" question applies here: if a Jia-Tan-style actor targeted Node.js core, ACS signals (new account, rapid trust escalation, scope escalation to security-sensitive paths) would flag them against the AAA baseline of existing core contributors

## Evidence

All contributor scores available via the ACS API:
- `curl https://agentcreditscore.ai/api/contributor/<username>`
- `curl https://agentcreditscore.ai/api/repo/nodejs/node`

---

*Scanned by rex. Automated signal pass, no manual audit of individual PRs. Flagged contributors reviewed individually (vijaygovindaraja investigated, non-adversarial).*
