// verdict-composer.ts
//
// Combined Trust Record verdict composer.
//
// Authored by: noobagent
// Date: 2026-04-10
// Status: v0.1 — final piece tying ACS + SIGNAL + DOWNSTREAM tracks into a verdict
//
// PURPOSE:
//   When rex's `/api/combined/:identifier` endpoint has all three tracks computed
//   (ACS from rex's existing Worker, SIGNAL from signal-scorer.ts, DOWNSTREAM from
//   downstream-scorer.ts), this module composes the final verdict block per
//   rex's meta-score-design.md rules.
//
// METHODOLOGY ATTRIBUTION:
//   - Three-track architecture: rex (combo-product/meta-score-design.md)
//   - Two-track separation rationale: pubby (pubby-downstream-action-design-call)
//   - Disagreement flag rule: rex (meta-score-design.md line 88: "|ACS_normalized - SIGNAL_composite| > 3.0")
//   - Track coverage confidence multiplier: rex (meta-score-design.md lines 90-94)
//   - Letter grade scale AAA..D: rex (meta-score-design.md lines 100-112)
//
// COMPATIBILITY:
//   Output type matches the `verdict` block in schema.json (combined trust record v0.1).

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

export type Confidence = "low" | "medium" | "high";

// ACS record shape (matches schema.json `acs` block)
export type AcsRecord = {
  score: number;          // 0-100
  grade: LetterGrade;
  confidence: Confidence;
  top_signals?: Array<{ name: string; direction: string; evidence_note?: string }>;
  security_sensitive_ratio?: {
    ratio_percent: number;
    per_repo?: Array<{ repo: string; ratio_percent: number }>;
    mimicry_flag?: boolean;
  };
  evidence_ref?: string;
  last_updated?: string;
};

// SIGNAL record shape (matches schema.json `signal` block, from signal-scorer.ts)
export type SignalRecord = {
  dimensions: {
    substance: number;
    consistency: number;
    verifiability: number;
    engagement_quality: number;
    operator_transparency: number;
    trajectory: number;
  };
  composite: number;       // 0-10
  security_pass: boolean;
  confidence: Confidence;
  trace_days_observed: number;
  assessor: string;
  evidence_ref: string;
  last_assessed: string;
};

// DOWNSTREAM record shape (matches schema.json `downstream` block, from downstream-scorer.ts)
export type DownstreamRecord = {
  composite: number;       // 0-10 (signed via direction sign)
  subdimensions: {
    attribution_certainty: number;
    impact_magnitude: number;
    direction: number;
  };
  evidence_examples: string[];
  confidence: Confidence;
  evidence_ref: string;
  last_measured: string;
};

// Letter grade per rex's meta-score-design.md scale
export type LetterGrade = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "CC" | "C" | "D" | "NR";

// Recommendation per schema.json verdict.recommendation enum
export type Recommendation = "trust" | "trust_with_caveats" | "watch" | "distrust" | "insufficient_data";

// Verdict block matching schema.json
export type VerdictBlock = {
  headline: string;
  acs_grade: LetterGrade;
  signal_grade: LetterGrade;
  downstream_grade: LetterGrade;
  track_coverage: Array<"acs" | "signal" | "downstream">;
  disagreement_flag: boolean;
  disagreement_note: string;
  recommendation: Recommendation;
};

// Entity context for the headline
export type EntityContext = {
  identifier: string;
  type?: "human" | "ai_coding_agent" | "network_agent" | "operator" | "unknown";
  display_name?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Score → letter grade conversion (rex's scale from meta-score-design.md)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a 0-100 score to a letter grade per rex's scale.
 */
export function scoreToGrade(score: number | null | undefined): LetterGrade {
  if (score === null || score === undefined) return "NR";
  if (score >= 90) return "AAA";
  if (score >= 80) return "AA";
  if (score >= 70) return "A";
  if (score >= 60) return "BBB";
  if (score >= 50) return "BB";
  if (score >= 40) return "B";
  if (score >= 30) return "CCC";
  if (score >= 20) return "CC";
  if (score >= 10) return "C";
  if (score >= 0) return "D";
  return "NR";
}

/**
 * Normalize a SIGNAL composite (0-10) to the 0-100 scale used for grading.
 */
export function normalizeSignalToGrade(signalComposite: number): LetterGrade {
  return scoreToGrade(signalComposite * 10);
}

/**
 * Normalize a DOWNSTREAM composite (0-10, signed) to the 0-100 scale used for grading.
 *
 * Note: DOWNSTREAM composites can be negative (harmful direction). For grading
 * purposes, we use the absolute value and the verdict's recommendation handles
 * the sign separately. A negative DOWNSTREAM with high magnitude is "high impact
 * but harmful direction" not "low impact."
 */
export function normalizeDownstreamToGrade(downstreamComposite: number): LetterGrade {
  return scoreToGrade(Math.abs(downstreamComposite) * 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Disagreement detection (rex's rule from meta-score-design.md line 88)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if ACS and SIGNAL strongly disagree on the same entity.
 *
 * Rex's rule: |ACS_normalized_to_10 - SIGNAL_composite| > 3.0
 *
 * Both tracks must have data for disagreement to be measurable. If either is
 * null, this returns false (no disagreement detectable).
 */
export function detectDisagreement(
  acs: AcsRecord | null,
  signal: SignalRecord | null
): { flag: boolean; note: string } {
  if (acs === null || signal === null) {
    return { flag: false, note: "" };
  }

  // Normalize ACS to 0-10 scale (ACS is 0-100, SIGNAL is 0-10)
  const acsNormalized = acs.score / 10;
  const gap = Math.abs(acsNormalized - signal.composite);

  if (gap <= 3.0) {
    return { flag: false, note: "" };
  }

  // Disagreement is real — generate a note
  let note: string;
  if (acsNormalized > signal.composite) {
    note = `ACS (${acs.score}/100, normalized to ${acsNormalized.toFixed(1)}/10) is significantly higher than SIGNAL (${signal.composite}/10). Possible interpretation: writes good code but has poor behavioral trace patterns. May be a competent developer with weak operator transparency, or an agent whose code contributions are clean but whose published behavior shows drift. Investigate before trusting.`;
  } else {
    note = `SIGNAL (${signal.composite}/10) is significantly higher than ACS (${acs.score}/100, normalized to ${acsNormalized.toFixed(1)}/10). Possible interpretation: clean behavioral trace history, but code contributions show concerning patterns. May be an agent presenting well in published traces while contributing problematic code. Higher risk than the headline scores suggest. Investigate before trusting.`;
  }

  return { flag: true, note };
}

// ─────────────────────────────────────────────────────────────────────────────
// Track coverage analysis (rex's confidence multiplier from meta-score-design.md)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine which tracks have data for this entity.
 */
export function getTrackCoverage(
  acs: AcsRecord | null,
  signal: SignalRecord | null,
  downstream: DownstreamRecord | null
): Array<"acs" | "signal" | "downstream"> {
  const coverage: Array<"acs" | "signal" | "downstream"> = [];
  if (acs !== null) coverage.push("acs");
  if (signal !== null) coverage.push("signal");
  if (downstream !== null) coverage.push("downstream");
  return coverage;
}

/**
 * Compute the joint confidence based on track coverage and per-track confidences.
 * Per rex's meta-score-design.md lines 90-94:
 *   1 track: caps at "medium"
 *   2 tracks aligned: "high" allowed
 *   2 tracks disagreement: "low" regardless
 *   3 tracks aligned: "high" + "multi_track_verified" badge
 */
export function computeJointConfidence(
  acs: AcsRecord | null,
  signal: SignalRecord | null,
  downstream: DownstreamRecord | null,
  disagreementFlag: boolean
): { confidence: Confidence; multi_track_verified: boolean } {
  const coverage = getTrackCoverage(acs, signal, downstream);
  const trackCount = coverage.length;

  if (disagreementFlag) {
    return { confidence: "low", multi_track_verified: false };
  }

  if (trackCount === 0) {
    return { confidence: "low", multi_track_verified: false };
  }

  if (trackCount === 1) {
    // Cap at medium per rex's rule
    const single = acs ?? signal ?? downstream;
    const cap: Confidence = single?.confidence === "high" ? "medium" : (single?.confidence ?? "low");
    return { confidence: cap, multi_track_verified: false };
  }

  if (trackCount === 2) {
    // 2 tracks aligned → high allowed
    const confidences: Confidence[] = [];
    if (acs) confidences.push(acs.confidence);
    if (signal) confidences.push(signal.confidence);
    if (downstream) confidences.push(downstream.confidence);
    return {
      confidence: lowestConfidence(confidences),
      multi_track_verified: false,
    };
  }

  // 3 tracks aligned → high + badge
  const confidences: Confidence[] = [
    acs!.confidence,
    signal!.confidence,
    downstream!.confidence,
  ];
  return {
    confidence: lowestConfidence(confidences),
    multi_track_verified: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation derivation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the recommendation enum from the tracks and disagreement state.
 *
 * UPDATED 2026-04-10 per pubby's blending concern (`pubby-verdict-composer-blending-concern-2026-04-10.md`):
 *   The previous version averaged track scores to derive the recommendation, which
 *   was a hidden blending path. An attacker could inflate one track ~60% to push
 *   the recommendation up a tier. This violated the framework's "no blending" rule.
 *
 *   FIXED: Now uses worst-track-wins gating (pubby's Option A). The recommendation
 *   is dominated by the WORST track, not the average. An attacker cannot inflate a
 *   single track to push the recommendation up — they would have to inflate ALL
 *   tracks above their respective thresholds, which is much harder.
 *
 * Rules:
 * - Any security failure → distrust
 * - Negative DOWNSTREAM direction (harmful) → watch or distrust by magnitude
 * - Disagreement flag → trust_with_caveats (force investigation)
 * - Worst-track score < 30 → distrust
 * - Worst-track score < 60 → watch
 * - Worst-track score < 80 → trust_with_caveats
 * - All tracks ≥ 80 + multi-track → trust
 * - All tracks ≥ 80 + single-track → trust_with_caveats (single-track caveat)
 * - No tracks → insufficient_data
 *
 * Trade-off: this is more conservative than averaging. Some entities that would
 * have scored "trust_with_caveats" under averaging will score "watch" under
 * worst-track-wins because they have one mediocre track. This is the intentional
 * Goodhart-resistance cost. The framework's "no blending" rule justifies it.
 */
export function deriveRecommendation(
  acs: AcsRecord | null,
  signal: SignalRecord | null,
  downstream: DownstreamRecord | null,
  disagreementFlag: boolean
): Recommendation {
  // Security failures → distrust immediately
  if (signal !== null && signal.security_pass === false) {
    return "distrust";
  }
  if (acs !== null && acs.security_sensitive_ratio?.mimicry_flag === true) {
    return "distrust";
  }

  const coverage = getTrackCoverage(acs, signal, downstream);

  if (coverage.length === 0) {
    return "insufficient_data";
  }

  // Negative DOWNSTREAM direction is a strong signal
  if (downstream !== null && downstream.composite < -3.0) {
    return "distrust";  // Strong harmful downstream impact
  }
  if (downstream !== null && downstream.composite < 0) {
    return "watch";     // Mild harmful downstream impact
  }

  // Disagreement → trust_with_caveats (force investigation)
  if (disagreementFlag) {
    return "trust_with_caveats";
  }

  // PUBBY-FIX: Worst-track-wins gating (no averaging)
  // Each track must independently clear thresholds
  const trackScores: number[] = [];
  if (acs !== null) trackScores.push(acs.score);                          // 0-100
  if (signal !== null) trackScores.push(signal.composite * 10);           // 0-10 → 0-100
  if (downstream !== null) trackScores.push(Math.abs(downstream.composite) * 10);

  if (trackScores.length === 0) return "insufficient_data";

  const minScore = Math.min(...trackScores);
  const singleTrack = coverage.length === 1;

  // Recommendation determined by the WORST track, not the average
  if (minScore < 30) return "distrust";
  if (minScore < 60) return "watch";
  if (minScore < 80) return "trust_with_caveats";

  // All tracks ≥ 80 — multi-track gets unqualified trust, single-track keeps caveat
  return singleTrack ? "trust_with_caveats" : "trust";
}

// ─────────────────────────────────────────────────────────────────────────────
// Headline generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the human-readable headline for the verdict block.
 * One sentence summary for a reader who won't read the full record.
 */
export function generateHeadline(
  entity: EntityContext,
  acs: AcsRecord | null,
  signal: SignalRecord | null,
  downstream: DownstreamRecord | null,
  recommendation: Recommendation,
  disagreementFlag: boolean
): string {
  const name = entity.display_name ?? entity.identifier;
  const coverage = getTrackCoverage(acs, signal, downstream);
  const trackCount = coverage.length;

  // Special cases first
  if (recommendation === "insufficient_data") {
    return `${name}: insufficient data for trust assessment. No ACS, SIGNAL, or DOWNSTREAM track has data for this entity.`;
  }

  if (recommendation === "distrust") {
    if (signal !== null && signal.security_pass === false) {
      return `${name}: SECURITY FAILURE in SIGNAL track. Distrust regardless of other scores. Investigate immediately.`;
    }
    if (acs !== null && acs.security_sensitive_ratio?.mimicry_flag === true) {
      return `${name}: ACS detected molecular mimicry pattern (selective targeting of security-critical code). Distrust pending investigation.`;
    }
    if (downstream !== null && downstream.composite < -3.0) {
      return `${name}: strong harmful downstream impact detected (DOWNSTREAM ${downstream.composite}). Distrust — published work is producing measurable negative third-person effects.`;
    }
    return `${name}: scores below distrust threshold across ${trackCount} track${trackCount === 1 ? "" : "s"}. Distrust.`;
  }

  if (disagreementFlag) {
    const acsGrade = acs ? scoreToGrade(acs.score) : "NR";
    const signalGrade = signal ? normalizeSignalToGrade(signal.composite) : "NR";
    return `${name}: ACS (${acsGrade}) and SIGNAL (${signalGrade}) strongly disagree. Trust with caveats — investigation required to resolve the gap.`;
  }

  // Standard headline
  const tracks: string[] = [];
  if (acs !== null) tracks.push(`ACS ${scoreToGrade(acs.score)}`);
  if (signal !== null) tracks.push(`SIGNAL ${normalizeSignalToGrade(signal.composite)}`);
  if (downstream !== null) {
    const downGrade = normalizeDownstreamToGrade(downstream.composite);
    const directionLabel = downstream.composite > 0 ? "" : downstream.composite < 0 ? " (harmful direction)" : " (neutral)";
    tracks.push(`DOWNSTREAM ${downGrade}${directionLabel}`);
  }

  const trackString = tracks.join(", ");
  const recLabel = recommendation === "trust" ? "Trust" : recommendation === "trust_with_caveats" ? "Trust with caveats" : "Watch";

  if (trackCount === 1) {
    return `${name}: single-track assessment (${trackString}). ${recLabel} — single-track verdict, multi-track verification recommended.`;
  }

  if (trackCount === 2) {
    return `${name}: two-track assessment (${trackString}). ${recLabel}.`;
  }

  return `${name}: multi-track verified across ${trackString}. ${recLabel}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level verdict composer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compose the final verdict block from all three tracks.
 *
 * Inputs:
 * - entity: identifier and optional display name / type
 * - acs: rex's ACS record (or null)
 * - signal: SIGNAL record from signal-scorer.ts (or null)
 * - downstream: DOWNSTREAM record from downstream-scorer.ts (or null)
 *
 * Output: VerdictBlock matching schema.json
 */
export function composeVerdict(
  entity: EntityContext,
  acs: AcsRecord | null,
  signal: SignalRecord | null,
  downstream: DownstreamRecord | null
): VerdictBlock {
  const disagreement = detectDisagreement(acs, signal);
  const trackCoverage = getTrackCoverage(acs, signal, downstream);
  const recommendation = deriveRecommendation(acs, signal, downstream, disagreement.flag);
  const headline = generateHeadline(entity, acs, signal, downstream, recommendation, disagreement.flag);

  return {
    headline,
    acs_grade: acs ? scoreToGrade(acs.score) : "NR",
    signal_grade: signal ? normalizeSignalToGrade(signal.composite) : "NR",
    downstream_grade: downstream ? normalizeDownstreamToGrade(downstream.composite) : "NR",
    track_coverage: trackCoverage,
    disagreement_flag: disagreement.flag,
    disagreement_note: disagreement.note,
    recommendation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function lowestConfidence(confidences: Confidence[]): Confidence {
  if (confidences.includes("low")) return "low";
  if (confidences.includes("medium")) return "medium";
  return "high";
}

// ─────────────────────────────────────────────────────────────────────────────
// Worked examples (validation against pilot records)
// ─────────────────────────────────────────────────────────────────────────────

// Pilot 4 (btnomb) — single-track SIGNAL, expected output:
//
// const pilot4Verdict = composeVerdict(
//   { identifier: "colony:btnomb", type: "ai_coding_agent", display_name: "btnomb" },
//   null,  // no ACS
//   {
//     dimensions: { substance: 8, consistency: 6, verifiability: 7, engagement_quality: 7, operator_transparency: 4, trajectory: 0 },
//     composite: 6.4,
//     security_pass: true,
//     confidence: "low",
//     trace_days_observed: 1,
//     assessor: "noobagent",
//     evidence_ref: "...",
//     last_assessed: "2026-04-09T00:00:00Z",
//   },
//   null,  // no DOWNSTREAM
// );
//
// Expected:
//   acs_grade: "NR"
//   signal_grade: "BBB" (6.4 * 10 = 64)
//   downstream_grade: "NR"
//   track_coverage: ["signal"]
//   disagreement_flag: false
//   recommendation: "trust_with_caveats" (single-track caveat downgrades from "trust")
//   headline: "btnomb: single-track assessment (SIGNAL BBB). Trust with caveats — single-track verdict, multi-track verification recommended."

// Pilot 5 (claude-sonnet-46-village) — two-track, expected output:
//
// const pilot5Verdict = composeVerdict(
//   { identifier: "colony:claude-sonnet-46-village", type: "ai_coding_agent", display_name: "claude-sonnet-46-village" },
//   null,  // no ACS
//   { /* SIGNAL composite 8.7 */ },
//   { /* DOWNSTREAM composite 5.0 */ },
// );
//
// Expected:
//   acs_grade: "NR"
//   signal_grade: "AA" (8.7 * 10 = 87)
//   downstream_grade: "BB" (|5.0| * 10 = 50)
//   track_coverage: ["signal", "downstream"]
//   disagreement_flag: false (no ACS to disagree with)
//   recommendation: "trust" (avg of 87 and 50 = 68.5, two-track allows trust)
//   headline: "claude-sonnet-46-village: two-track assessment (SIGNAL AA, DOWNSTREAM BB). Trust."

// Pilot 1 (nthbotast) — adversarial baseline, expected output:
//
// const pilot1Verdict = composeVerdict(
//   { identifier: "github:nthbotast", type: "ai_coding_agent", display_name: "nthbotast" },
//   {
//     score: 12,
//     grade: "CC",
//     confidence: "high",
//     security_sensitive_ratio: { ratio_percent: 33, mimicry_flag: true },
//   },
//   null,  // no SIGNAL data
//   null,  // no DOWNSTREAM data
// );
//
// Expected:
//   acs_grade: "C" (12)
//   signal_grade: "NR"
//   downstream_grade: "NR"
//   track_coverage: ["acs"]
//   disagreement_flag: false
//   recommendation: "distrust" (mimicry_flag triggers immediate distrust)
//   headline: "nthbotast: ACS detected molecular mimicry pattern (selective targeting of security-critical code). Distrust pending investigation."

// ─────────────────────────────────────────────────────────────────────────────
// Limitations
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. **Recommendation thresholds are intuition-calibrated.** The 80/60/30 score
//    cutoffs for trust/trust_with_caveats/watch/distrust are best guesses. Should
//    be tuned against real pilot data.
//
// 2. **Headline generation is templated.** Future versions might use more nuanced
//    language. The templates are deliberately simple for v1.
//
// 3. **Disagreement note is descriptive, not prescriptive.** It says "investigate"
//    but doesn't specify how. Future versions could integrate with a triage workflow.
//
// 4. **Track coverage of 0 produces "insufficient_data"** but this should never
//    happen in practice — if all three tracks return null, the endpoint should
//    return 404 not a verdict.
//
// 5. **Single-track recommendation always carries a caveat** even with high scores.
//    This is intentional — single-source trust is fragile by design.
//
// 6. **Has not been validated against pilot 4 and pilot 5 yet.** Run this composer
//    against the existing pilot JSON records and verify the output matches the
//    manually-set verdict blocks. Calibration may need adjustment.
