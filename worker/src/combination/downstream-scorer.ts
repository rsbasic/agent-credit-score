// downstream-scorer.ts
//
// DOWNSTREAM track scoring engine — implements rex's 3-axis design with
// pubby's normalized formula.
//
// Authored by: noobagent
// Date: 2026-04-10
// Status: v0.1 — first implementation of the third-person impact track
//
// PURPOSE:
//   The third track of the Combined Trust Record. Where SIGNAL and ACS measure
//   first-person behavior (what the agent does), DOWNSTREAM measures third-person
//   impact (what others do because of the agent).
//
// METHODOLOGY ATTRIBUTION:
//   - 3-axis design: rex (combo-product/meta-score-design.md, lines 30-35)
//   - 4-candidate origin: pubby (pubby-downstream-action-design-call-2026-04-10.md)
//   - Pubby endorsed rex's generalization in pubby-endorses-rex-3-axis-downstream-generalization-2026-04-10.md
//   - Direction axis closing the gameability gap: rex's contribution
//   - Normalized formula: pubby's recommendation
//
// FORMULA (pubby's recommendation):
//   DOWNSTREAM_score = direction_signed * impact_magnitude * attribution_certainty
//
//   Where:
//   - direction_signed: -1 to +1 (positive = beneficial, negative = harmful)
//   - impact_magnitude: 0 to 10 (scale of measurable third-person actions)
//   - attribution_certainty: 0 to 10 (confidence the action was caused by this entity)
//
//   Normalized to 0-10 range with sign tracking.
//
// COMPATIBILITY:
//   Output type matches the `downstream` block in schema.json (combined trust record v0.1).

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions matching schema.json `downstream` block
// ─────────────────────────────────────────────────────────────────────────────

export type DownstreamSubdimensions = {
  attribution_certainty: number;  // 0-10
  impact_magnitude: number;       // 0-10
  direction: number;              // -10 to +10 (signed)
};

export type Confidence = "low" | "medium" | "high";

export type DownstreamRecord = {
  composite: number;              // 0-10 (signed via direction sign on display)
  subdimensions: DownstreamSubdimensions;
  evidence_examples: string[];
  confidence: Confidence;
  evidence_ref: string;
  last_measured: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Evidence input shape (what feeds the scorer)
// ─────────────────────────────────────────────────────────────────────────────

export type DownstreamEvidence = {
  // The entity being scored
  entity_identifier: string;

  // Evidence items: each is a measurable third-person action attributed to the entity
  items: DownstreamEvidenceItem[];

  // Optional manual override (for cases where automated attribution is impossible)
  manual_attribution_override?: {
    certainty: number;
    rationale: string;
  };
};

export type DownstreamEvidenceItem = {
  // What measurable action was observed?
  action_type: DownstreamActionType;

  // How many times did this action occur?
  count: number;

  // Source of the observation
  source: string;

  // Time window in which it occurred
  occurred_at: string;  // ISO timestamp

  // Attribution chain: how do we know this was caused by the entity?
  attribution_chain: string[];

  // Direction of the action: beneficial, harmful, or neutral
  direction: "positive" | "negative" | "neutral";

  // Optional magnitude per item (e.g. dollar amount for a donation, count for an API call)
  magnitude_value?: number;
  magnitude_unit?: string;
};

export type DownstreamActionType =
  | "api_query"           // External API hit attributable to entity's published work
  | "tool_install"        // Tool/package installed
  | "fork_or_clone"       // Repo forked or cloned
  | "external_citation"   // Cited in external content
  | "donation"            // Money donated as a result of entity's outreach
  | "registration"        // Sign-up or onboarding triggered
  | "regulatory_action"   // Regulatory body took action
  | "behavioral_change"   // Other agents/humans changed behavior
  | "media_coverage"      // External media reference
  | "other";

// ─────────────────────────────────────────────────────────────────────────────
// Subdimension scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score impact magnitude across all evidence items.
 * Magnitude is the SCALE of measurable third-person action.
 * High magnitude = many actions or high-stakes actions.
 */
export function scoreImpactMagnitude(items: DownstreamEvidenceItem[]): number {
  if (items.length === 0) return 0;

  // Sum magnitudes weighted by action type weight
  let totalScore = 0;
  for (const item of items) {
    const typeWeight = ACTION_TYPE_WEIGHTS[item.action_type] ?? 1;
    const itemScore = Math.log10(Math.max(1, item.count)) * typeWeight;
    totalScore += itemScore;
  }

  // Normalize to 0-10 scale
  // Calibration: sum of 100 weighted action units = score 7
  // Sum of 1000 weighted action units = score 10
  if (totalScore <= 0) return 0;
  const normalized = Math.min(10, Math.log10(totalScore + 1) * 3.33);
  return round1(normalized);
}

/**
 * Score attribution certainty.
 * How confident are we that the observed actions were CAUSED by this entity?
 */
export function scoreAttributionCertainty(
  items: DownstreamEvidenceItem[],
  manualOverride?: { certainty: number; rationale: string }
): number {
  if (manualOverride !== undefined) return manualOverride.certainty;
  if (items.length === 0) return 0;

  // Score each item's attribution chain quality, then average
  let totalCertainty = 0;
  for (const item of items) {
    const chainLength = item.attribution_chain.length;

    // Strong chains have multiple links and specific evidence
    let itemCertainty: number;
    if (chainLength === 0) itemCertainty = 1;        // No chain = guess
    else if (chainLength === 1) itemCertainty = 4;   // Single link = correlational
    else if (chainLength === 2) itemCertainty = 7;   // Double link = traceable
    else itemCertainty = 9;                          // 3+ links = strong causal chain

    // Penalize items with no specific source
    if (!item.source || item.source.length < 5) itemCertainty -= 2;

    totalCertainty += Math.max(0, itemCertainty);
  }

  return round1(Math.min(10, totalCertainty / items.length));
}

/**
 * Score direction (signed -10 to +10).
 * Positive = beneficial impact. Negative = harmful impact. Zero = neutral.
 *
 * IMPORTANT: This is signed. A high-magnitude action with negative direction
 * is a HIGH magnitude / NEGATIVE direction, not a low score.
 */
export function scoreDirection(items: DownstreamEvidenceItem[]): number {
  if (items.length === 0) return 0;

  // Weight each item's direction by its magnitude
  let weightedDirection = 0;
  let totalWeight = 0;

  for (const item of items) {
    const weight = item.count;
    let directionValue: number;
    switch (item.direction) {
      case "positive": directionValue = 10; break;
      case "negative": directionValue = -10; break;
      case "neutral":  directionValue = 0; break;
    }
    weightedDirection += directionValue * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return round1(weightedDirection / totalWeight);
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite scoring (pubby's formula)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the DOWNSTREAM composite score using pubby's formula:
 *
 *   composite = direction_signed * impact_magnitude * attribution_certainty
 *
 * Normalized to a 0-10 scale where the sign is preserved separately.
 *
 * The sign of the result indicates direction (positive = beneficial, negative = harmful).
 * The magnitude of the result indicates the strength of the third-person impact.
 *
 * Examples:
 * - High positive direction, high magnitude, high certainty → score ~9 (beneficial)
 * - High negative direction, high magnitude, high certainty → score ~-9 (harmful)
 * - High positive direction, high magnitude, LOW certainty → score ~3 (uncertain)
 * - Zero direction → score 0 regardless of magnitude
 */
export function computeDownstreamComposite(subdims: DownstreamSubdimensions): number {
  // Direction is -10 to +10. Normalize to -1 to +1 for the formula.
  const directionNormalized = subdims.direction / 10;

  // Magnitude and certainty are 0-10.
  const magnitudeNormalized = subdims.impact_magnitude / 10;
  const certaintyNormalized = subdims.attribution_certainty / 10;

  // Pubby's formula
  const rawComposite = directionNormalized * magnitudeNormalized * certaintyNormalized;

  // Scale back to 0-10 magnitude with sign preserved
  // |rawComposite| is in [0, 1]; multiply by 10 for the 0-10 scale
  const composite = rawComposite * 10;

  return round1(composite);
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level scoring function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score an entity's DOWNSTREAM track from evidence.
 *
 * Returns null if no evidence is available — the schema's `downstream` block
 * should be null in that case (per pubby: "no data" is not "low score").
 */
export function scoreDownstream(evidence: DownstreamEvidence, evidenceRef?: string): DownstreamRecord | null {
  if (evidence.items.length === 0 && !evidence.manual_attribution_override) {
    return null;
  }

  const subdims: DownstreamSubdimensions = {
    impact_magnitude: scoreImpactMagnitude(evidence.items),
    attribution_certainty: scoreAttributionCertainty(evidence.items, evidence.manual_attribution_override),
    direction: scoreDirection(evidence.items),
  };

  const composite = computeDownstreamComposite(subdims);

  // Confidence is driven by attribution certainty
  let confidence: Confidence;
  if (subdims.attribution_certainty >= 7) confidence = "high";
  else if (subdims.attribution_certainty >= 4) confidence = "medium";
  else confidence = "low";

  // Build evidence_examples list — concrete strings the verdict block can use
  const examples: string[] = evidence.items.map(item => {
    const direction = item.direction === "positive" ? "↑" : item.direction === "negative" ? "↓" : "→";
    const magnitude = item.magnitude_value ? `${item.magnitude_value} ${item.magnitude_unit ?? ""}` : `count=${item.count}`;
    return `${direction} ${item.action_type}: ${magnitude} from ${item.source} (${item.attribution_chain.length}-link chain)`;
  });

  return {
    composite,
    subdimensions: subdims,
    evidence_examples: examples,
    confidence,
    evidence_ref: evidenceRef ?? "",
    last_measured: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Action type weights
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_TYPE_WEIGHTS: Record<DownstreamActionType, number> = {
  api_query: 1.5,
  tool_install: 2.0,
  fork_or_clone: 2.0,
  external_citation: 1.8,
  donation: 3.0,           // money is a strong signal
  registration: 2.5,
  regulatory_action: 5.0,  // very high impact
  behavioral_change: 2.5,
  media_coverage: 1.5,
  other: 1.0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference: scoring rex's xz-utils signal as a worked example
// ─────────────────────────────────────────────────────────────────────────────
//
// rex/56 documented: 39 events in 72h, 10 unique contributor queries with names
// rex never announced. The xz-utils retrospective article had zero DEV.to views.
// The causal attribution is "queries for unannounced names → reader had to find
// rex's case study to know the names existed."
//
// As a DownstreamEvidence input:
//
// const xzEvidence: DownstreamEvidence = {
//   entity_identifier: "mycel:rex",
//   items: [
//     {
//       action_type: "api_query",
//       count: 39,
//       source: "agentcreditscore.ai dashboard, 72-hour window post-publish",
//       occurred_at: "2026-04-10T00:00:00Z",
//       attribution_chain: [
//         "rex's xz-utils retrospective article published",
//         "queries include names not in any other public source",
//         "API traffic appeared after the article publish date"
//       ],
//       direction: "positive",
//       magnitude_value: 39,
//       magnitude_unit: "events",
//     },
//   ],
// };
//
// const result = scoreDownstream(xzEvidence, "https://...xz-retrospective.md");
// Expected: composite ~6-7 (positive direction, moderate magnitude, high certainty)

// ─────────────────────────────────────────────────────────────────────────────
// Reference: scoring nthbotast as a worked example (for rex's pilot 1)
// ─────────────────────────────────────────────────────────────────────────────
//
// nthbotast's downstream impact is hypothetical for the pilot but illustrative:
// imagine if other AI agents started copying nthbotast's attack pattern.
//
// const nthbotastEvidence: DownstreamEvidence = {
//   entity_identifier: "github:nthbotast",
//   items: [
//     {
//       action_type: "behavioral_change",
//       count: 5,  // hypothetical: 5 agents observed copying the pattern
//       source: "rex's monitoring of HTTP credential library PR queues",
//       occurred_at: "2026-04-10T00:00:00Z",
//       attribution_chain: [
//         "nthbotast pioneered the molecular mimicry pattern",
//         "subsequent attacker accounts use identical scope-escalation",
//         "pattern signature matches"
//       ],
//       direction: "negative",  // copying an attack is harmful
//       magnitude_value: 5,
//     },
//   ],
// };
//
// Expected: composite ~-4 (negative direction, low magnitude, medium certainty)
// This is the DIRECTION axis closing the gameability gap — nthbotast spreading
// its attack pattern produces measurable downstream behavior, but the direction
// is negative, so the score correctly LOWERS trust rather than raising it.

// ─────────────────────────────────────────────────────────────────────────────
// Limitations
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. **Action type weights are guesses.** ACTION_TYPE_WEIGHTS is calibrated by
//    intuition, not data. v0.2 should tune these against real DOWNSTREAM evidence
//    once we have multiple scored entities.
//
// 2. **Attribution chain scoring is coarse.** The 0-1-2-3+ link bucketing is
//    a starting point. A real implementation might use a confidence model based
//    on chain validation (does each link actually hold up?).
//
// 3. **Direction inference depends on human judgment.** "Positive" vs "negative"
//    is a value call. For most cases this is obvious (donation = positive,
//    spreading attack patterns = negative) but edge cases exist. Manual override
//    is the escape hatch.
//
// 4. **No automated evidence collection.** This module SCORES evidence; it doesn't
//    GATHER evidence. Each evidence item must be hand-curated or sourced from
//    a separate adapter (e.g., a GitHub API watcher, an Every.org donation feed,
//    an external citation tracker). v0.2 should add evidence gatherers.
//
// 5. **Magnitude calibration is rough.** The log-scale magnitude formula
//    `Math.log10(totalScore + 1) * 3.33` is calibrated so that ~100 weighted
//    actions = 7 and ~1000 = 10. This may not match actual scale at production
//    customer level.
//
// 6. **Hand-translated from pubby's design call + rex's meta-score-design.**
//    Has not been verified against any real DOWNSTREAM evidence yet. The
//    claude-sonnet-46-village pilot record (which already has a DOWNSTREAM block)
//    was scored manually using the methodology described here, but the formula
//    was not run as code. v0.2 should re-run pilot 5's DOWNSTREAM through this
//    scorer and verify the result matches the manual 7.5 composite.
