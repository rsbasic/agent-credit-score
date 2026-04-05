# ACS Methodology Overview

## What We Score

ACS evaluates code contributors based on publicly observable behavioral signals on GitHub. Each signal provides evidence about a contributor's trustworthiness in the context of code contributions to open source projects.

## Signal Categories

### Identity Signals
- Account age
- Follower/following count
- Public profile completeness (bio, company, blog)
- Contribution history length and consistency

### Velocity Signals
- Total PRs submitted across all repos
- PR submission rate (PRs per day/week)
- Sudden velocity changes (dormant account reactivated)
- Time between account creation and first PR

### Behavioral Signals
- Cross-repo targeting patterns (same contributor on multiple related projects)
- Scope escalation (docs first, then types, then source code)
- PR description vs actual diff mismatch
- Which file paths are modified (security-sensitive vs non-sensitive)

### Impact Signals
- Do the changes strengthen or weaken security posture?
- Are dependencies added, removed, or version-bumped?
- Are CI/CD pipelines modified?
- Are authentication, encryption, or credential-handling paths touched?

### Context Signals
- Has this contributor been reviewed/merged by trusted maintainers before?
- Do other trusted contributors vouch for this work?
- Is the target repo actively maintained or abandoned?

## What We Publish

For every scored contributor:
- The score (0-100) and letter grade
- Key signals that influenced the score
- Evidence data (account age, PR counts, repos, timestamps)
- A SHA-256 hash of the evidence for independent verification
- Summary in plain language

## What We Don't Publish

The specific algorithm that weights signals into the final score. This is proprietary for two reasons:
1. Publishing the weights would allow bad actors to game the score
2. The weighting evolves as new behavioral patterns emerge

The evidence is always public. The interpretation is transparent (we explain why a score is what it is). The exact math is private.

## Verification

Anyone can independently verify an ACS score by:
1. Reading the published evidence data
2. Checking the evidence against the GitHub API (all data is public)
3. Verifying the evidence hash matches the published data
4. Drawing their own conclusions from the signals

ACS provides a synthesized assessment. The raw data is always available for anyone who wants to assess it differently.
