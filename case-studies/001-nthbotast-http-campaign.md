# Case Study 001: Coordinated Automated PR Campaign Across HTTP Client Libraries

**Date:** April 2026
**Discovered by:** ACS (Agent Credit Score)
**Contributor:** nthbotast
**ACS Score:** 12/100 (CC)

## Summary

A GitHub account created on February 27, 2026 submitted 160 pull requests across multiple repositories in 31 days, with source code changes specifically targeting credential and proxy handling on three of the most widely used JavaScript HTTP client libraries.

## The Pattern

On each targeted repo, the contributor followed the same progression:
1. Documentation PRs (harmless, build familiarity)
2. Type definition fixes (low risk, build credibility)
3. Source code changes to security-sensitive paths (the escalation)

## Affected Repositories

### node-fetch (131M weekly npm downloads)
- 9 PRs submitted March 2-8
- PR #1878: adds code to silently strip `cookie`, `proxy-authorization`, `host`, and all `sec-*` headers from outgoing requests
- While spec-compliant for browser Fetch API, this breaks server-side authentication flows
- **No maintainer responded** — the repo has had no maintainer commit since July 2023
- Automated CI pipeline publishes to npm on merge

### undici (Node.js core HTTP client)
- 12 PRs submitted March 4-17
- PR #4860: modified the proxy connection handler — initial version would default HTTPS proxy connections to plaintext HTTP (TLS downgrade)
- **Maintainer @metcoder95 caught the issue and closed the PR**
- 4 documentation PRs were merged (zero runtime impact)

### axios (48M+ weekly npm downloads)
- 8 PRs submitted March 3-8
- PR #7479: bumps `proxy-from-env` from v1 to v2 in the core HTTP adapter, changing proxy resolution logic
- **Closed without merge**
- 1 documentation PR merged (#7478 — JSDoc comment, zero runtime impact)

### lodash (48M+ weekly downloads)
- 15 PRs submitted March 2-22
- Source code PRs modify `baseAssignValue()` — but these changes **strengthen** prototype pollution defenses
- **No security concerns on lodash**

## The Selectivity

The pattern that elevates this from "enthusiastic contributor" to "warrants scrutiny" is the selectivity:
- On HTTP client libraries: source code changes target credential handling, proxy connections, and TLS
- On a utility library (lodash): source code changes improve security

The security-weakening changes are specific to libraries that handle authentication headers, encrypted connections, and proxy routing.

## Response

ACS posted security alerts on all three HTTP client repos:
- [node-fetch #1882](https://github.com/node-fetch/node-fetch/issues/1882) — full cross-repo audit
- [undici #4943](https://github.com/nodejs/undici/issues/4943) — cross-reference
- [axios #10581](https://github.com/axios/axios/issues/10581) — cross-reference

Undici and axios maintainers acknowledged the findings within 24 hours. node-fetch had no maintainer response — illustrating the maintenance vacuum that makes such campaigns possible.

## What ACS Is NOT Claiming

This case study documents a behavioral pattern. We are not claiming the contributor is malicious. The code changes are technically spec-compliant. The pattern could indicate:
- An AI agent optimizing for spec-compliance fixes across popular repos
- Automated profile building targeting high-visibility projects
- Legitimate contributions from someone working at unusual velocity

The behavioral signals warrant scrutiny regardless of intent. An unreviewed PR that strips authentication headers from a 131M-download package is a supply chain risk whether the author intended it or not.

## Key Takeaway

No existing tool would have caught this pattern. Package scanners check code, not contributors. Repository health tools check activity levels, not behavioral trajectories. The nthbotast pattern was only visible through cross-repo behavioral analysis — looking at what the same contributor did across multiple related projects over time.

This is what ACS is built to detect.
