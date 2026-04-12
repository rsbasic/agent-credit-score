// signal-scorer.ts
//
// SIGNAL scoring engine — TypeScript implementation of noobagent's
// 6-dimension behavioral trust methodology.
//
// Authored by: noobagent
// Date: 2026-04-10
// Status: v0.1 — first scriptable conversion of the previously manual methodology.
//
// PURPOSE:
//   Drop into rex's ACS Worker at /api/combined/:identifier to provide the SIGNAL
//   track of the Combined Trust Record. This module is self-contained except for
//   the data source adapters (which need to be wired to either the Mycel doorman
//   API or local trace files).
//
// FILE LOCATION INTENT:
//   This file is in combo-product/ for review. Rex copies/adapts it into the
//   Worker codebase. Per the README hard rules, noobagent does not edit
//   profit_play/ or velocity-os/ directly.
//
// SCHEMA COMPATIBILITY:
//   Output type matches the `signal` block in schema.json (combined trust record v0.1).
//
// METHODOLOGY REFERENCE:
//   Full prose in: ../signal-implementation-spec-for-rex-2026-04-10.md
//   Two-track design: ../pubby-downstream-action-design-call-2026-04-10.md (adopted)

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions matching schema.json `signal` block
// ─────────────────────────────────────────────────────────────────────────────

export type SignalDimensions = {
  substance: number;            // 0-10
  consistency: number;          // 0-10
  verifiability: number;        // 0-10
  engagement_quality: number;   // 0-10
  operator_transparency: number;// 0-10
  trajectory: number;           // -1.0 to 1.0 (slope, not score)
};

export type Confidence = "low" | "medium" | "high";

export type SignalRecord = {
  dimensions: SignalDimensions;
  composite: number;            // 0-10
  security_pass: boolean;       // false blocks the whole assessment
  confidence: Confidence;
  trace_days_observed: number;
  assessor: string;
  evidence_ref: string;
  last_assessed: string;        // ISO timestamp
};

// ─────────────────────────────────────────────────────────────────────────────
// Trace data shape (what comes out of the data source adapter)
// ─────────────────────────────────────────────────────────────────────────────

export type Trace = {
  agent: string;
  seq: number;
  type: TraceType;
  category: "pebble" | "rock" | "boulder";
  title: string;
  body: string;
  cites: string[];              // list of "agent/seq" references
  attention?: string;
  fills?: string;
  has_evidence_section: boolean;
  has_limitations_section: boolean;
  has_external_links: boolean;
  submitted_at: string;         // ISO timestamp
  hash: string;
};

export type TraceType =
  | "knowledge"
  | "capability"
  | "synthesis"
  | "variant"
  | "signal"
  | "need"
  | "fill"
  | "ask"
  | "response"
  | "validation";

// Original work types (substance numerator)
const ORIGINAL_TYPES: TraceType[] = ["knowledge", "capability", "synthesis"];

// Derivative work types (substance denominator addend)
const DERIVATIVE_TYPES: TraceType[] = ["response", "validation", "fill", "ask"];

// ─────────────────────────────────────────────────────────────────────────────
// Operator metadata shape
// ─────────────────────────────────────────────────────────────────────────────

export type OperatorMetadata = {
  agent_name: string;
  operator_name?: string;
  operator_url?: string;
  operator_url_resolves?: boolean;  // result of curl-check
  other_agents_by_operator?: number; // count
};

// ─────────────────────────────────────────────────────────────────────────────
// Citation graph (for engagement quality scoring)
// ─────────────────────────────────────────────────────────────────────────────

export type CitationGraph = {
  outbound_count: number;        // citations made by this agent
  inbound_count: number;         // citations made TO this agent
};

// ─────────────────────────────────────────────────────────────────────────────
// Scoring window
// ─────────────────────────────────────────────────────────────────────────────

export type ScoringWindow = {
  start: Date;
  end: Date;
};

export const DEFAULT_WINDOW_DAYS = 30;

export function defaultWindow(): ScoringWindow {
  const end = new Date();
  const start = new Date(end.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { start, end };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 1: Substance
// Ratio of original work to reactive output.
// ─────────────────────────────────────────────────────────────────────────────

export function scoreSubstance(traces: Trace[]): { score: number; confidence: Confidence } {
  if (traces.length === 0) return { score: 0, confidence: "low" };

  const original = traces.filter(t => ORIGINAL_TYPES.includes(t.type)).length;
  const derivative = traces.filter(t => DERIVATIVE_TYPES.includes(t.type)).length;
  const total = original + derivative;

  if (total === 0) return { score: 0, confidence: "low" };

  const ratio = original / total;

  let score: number;
  if (ratio >= 0.7) score = 10;
  else if (ratio >= 0.6) score = 9;
  else if (ratio >= 0.5) score = 8;
  else if (ratio >= 0.4) score = 7;
  else if (ratio >= 0.3) score = 5;
  else if (ratio >= 0.2) score = 3;
  else score = 1;

  const confidence: Confidence = total >= 30 ? "high" : total >= 10 ? "medium" : "low";

  return { score, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 2: Consistency
// Production regularity (NOT volume — regularity).
// ─────────────────────────────────────────────────────────────────────────────

export function scoreConsistency(traces: Trace[]): { score: number; confidence: Confidence } {
  if (traces.length < 3) return { score: 0, confidence: "low" };

  const timestamps = traces
    .map(t => new Date(t.submitted_at).getTime())
    .sort((a, b) => a - b);

  // Gap distribution
  const gaps: number[] = [];
  for (let i = 0; i < timestamps.length - 1; i++) {
    gaps.push(timestamps[i + 1] - timestamps[i]);
  }

  const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, g) => sum + Math.pow(g - meanGap, 2), 0) / gaps.length;
  const stddevGap = Math.sqrt(variance);

  // Coefficient of variation: lower = more consistent
  const cv = meanGap > 0 ? stddevGap / meanGap : Infinity;

  let score: number;
  if (cv < 0.5) score = 10;
  else if (cv < 0.8) score = 8;
  else if (cv < 1.2) score = 6;
  else if (cv < 1.8) score = 4;
  else if (cv < 2.5) score = 2;
  else score = 1;

  // Penalize recent dormancy
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = timestamps.filter(t => t > sevenDaysAgo).length;
  if (recentCount === 0) {
    score = Math.max(1, score - 4);
  }

  const confidence: Confidence = traces.length >= 30 ? "high" : traces.length >= 10 ? "medium" : "low";

  return { score, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 3: Verifiability
// Can claims be independently checked?
// ─────────────────────────────────────────────────────────────────────────────

export function scoreVerifiability(traces: Trace[]): { score: number; confidence: Confidence } {
  if (traces.length === 0) return { score: 0, confidence: "low" };

  let verifiableCount = 0;
  for (const trace of traces) {
    const hasCitation = trace.cites.length > 0;
    const hasLink = trace.has_external_links;
    const hasEvidence = trace.has_evidence_section;
    const hasLimitations = trace.has_limitations_section;

    const features = [hasCitation, hasLink, hasEvidence, hasLimitations].filter(Boolean).length;
    if (features >= 2) verifiableCount += 1;
  }

  const ratio = verifiableCount / traces.length;

  let score: number;
  if (ratio >= 0.8) score = 10;
  else if (ratio >= 0.6) score = 8;
  else if (ratio >= 0.4) score = 6;
  else if (ratio >= 0.2) score = 4;
  else score = 2;

  const confidence: Confidence = traces.length >= 30 ? "high" : traces.length >= 10 ? "medium" : "low";

  return { score, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 4: Engagement Quality
// Citation density and reciprocity.
// ─────────────────────────────────────────────────────────────────────────────

export function scoreEngagement(traces: Trace[], graph: CitationGraph): { score: number; confidence: Confidence } {
  if (traces.length === 0) return { score: 0, confidence: "low" };

  const outboundRatio = graph.outbound_count / traces.length;
  const inboundRatio = graph.inbound_count / traces.length;

  let score: number;
  if (outboundRatio >= 1.0 && inboundRatio >= 0.5) score = 10;
  else if (outboundRatio >= 0.5 && inboundRatio >= 0.3) score = 8;
  else if (outboundRatio >= 0.3) score = 6;
  else if (inboundRatio >= 0.3) score = 5;
  else score = 2;

  const confidence: Confidence = traces.length >= 30 ? "high" : traces.length >= 10 ? "medium" : "low";

  return { score, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 5: Operator Transparency
// Binary with gradations.
// ─────────────────────────────────────────────────────────────────────────────

export function scoreOperator(metadata: OperatorMetadata): { score: number; confidence: Confidence } {
  const hasName = !!metadata.operator_name;
  const hasUrl = !!metadata.operator_url;
  const urlResolves = !!metadata.operator_url_resolves;
  const hasOtherAgents = (metadata.other_agents_by_operator ?? 0) > 1;

  if (hasName && urlResolves && hasOtherAgents) return { score: 10, confidence: "high" };
  if (hasName && urlResolves) return { score: 8, confidence: "high" };
  if (hasName) return { score: 6, confidence: "medium" };
  if (hasUrl) return { score: 4, confidence: "medium" };
  return { score: 2, confidence: "low" };  // Anonymous floor
}

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 6: Trajectory (THE UNIQUE ONE)
// Direction of change across all dimensions over time.
// Returns slope as a decimal (-1.0 to 1.0).
// Returns null if insufficient data (< 3 windows).
// ─────────────────────────────────────────────────────────────────────────────

export type WindowedScores = {
  substance: number;
  consistency: number;
  verifiability: number;
  engagement: number;
  operator: number;
};

export function scoreTrajectory(history: WindowedScores[]): { slope: number | null; confidence: Confidence } {
  if (history.length < 3) return { slope: null, confidence: "low" };

  // Linear regression slope per dimension
  const dimSlopes = {
    substance: linearRegressionSlope(history.map(h => h.substance)),
    consistency: linearRegressionSlope(history.map(h => h.consistency)),
    verifiability: linearRegressionSlope(history.map(h => h.verifiability)),
    engagement: linearRegressionSlope(history.map(h => h.engagement)),
    operator: linearRegressionSlope(history.map(h => h.operator)),
  };

  // Weighted aggregate slope (substance and consistency weighted higher)
  const weightedSlope =
    dimSlopes.substance * 0.30 +
    dimSlopes.consistency * 0.25 +
    dimSlopes.verifiability * 0.15 +
    dimSlopes.engagement * 0.20 +
    dimSlopes.operator * 0.10;

  // Normalize to [-1.0, 1.0] for schema compatibility
  const normalized = Math.max(-1.0, Math.min(1.0, weightedSlope / 2.0));

  const confidence: Confidence = history.length >= 5 ? "high" : "medium";

  return { slope: normalized, confidence };
}

function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const x = Array.from({ length: n }, (_, i) => i);
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (values[i] - meanY);
    denominator += Math.pow(x[i] - meanX, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite scoring
// ─────────────────────────────────────────────────────────────────────────────

export type ScoringInput = {
  traces: Trace[];
  graph: CitationGraph;
  operator: OperatorMetadata;
  history?: WindowedScores[];  // optional: for trajectory
  evidence_ref?: string;
};

export function scoreSignal(input: ScoringInput): SignalRecord {
  const substance = scoreSubstance(input.traces);
  const consistency = scoreConsistency(input.traces);
  const verifiability = scoreVerifiability(input.traces);
  const engagement = scoreEngagement(input.traces, input.graph);
  const operator = scoreOperator(input.operator);
  const trajectory = scoreTrajectory(input.history ?? []);

  // Default weights
  let weights = {
    substance: 0.25,
    consistency: 0.15,
    verifiability: 0.15,
    engagement: 0.15,
    operator: 0.10,
    trajectory: 0.20,
  };

  // If trajectory is null (insufficient data), redistribute its weight
  let trajectoryScore = 0;
  if (trajectory.slope === null) {
    weights.substance += 0.10;
    weights.consistency += 0.05;
    weights.verifiability += 0.05;
    weights.trajectory = 0;
  } else {
    // Convert slope (-1 to 1) to score (0-10) for compositing
    trajectoryScore = (trajectory.slope + 1) * 5;
  }

  const composite =
    substance.score * weights.substance +
    consistency.score * weights.consistency +
    verifiability.score * weights.verifiability +
    engagement.score * weights.engagement +
    operator.score * weights.operator +
    trajectoryScore * weights.trajectory;

  // Overall confidence is the lowest dimension confidence
  const confidences: Confidence[] = [
    substance.confidence,
    consistency.confidence,
    verifiability.confidence,
    engagement.confidence,
    operator.confidence,
    trajectory.confidence,
  ];
  const overallConfidence = lowestConfidence(confidences);

  // Trace days observed
  const traceDays = computeTraceDays(input.traces);

  // Security pass: for now, always true. Add security override logic in v0.2.
  // Per noobagent's response: security override is local to each track.
  const securityPass = true;

  return {
    dimensions: {
      substance: substance.score,
      consistency: consistency.score,
      verifiability: verifiability.score,
      engagement_quality: engagement.score,
      operator_transparency: operator.score,
      trajectory: trajectory.slope ?? 0,
    },
    composite: round1(composite),
    security_pass: securityPass,
    confidence: overallConfidence,
    trace_days_observed: traceDays,
    assessor: "signal-scorer-v0.1",
    evidence_ref: input.evidence_ref ?? "",
    last_assessed: new Date().toISOString(),
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

function computeTraceDays(traces: Trace[]): number {
  if (traces.length < 2) return traces.length;
  const timestamps = traces.map(t => new Date(t.submitted_at).getTime()).sort();
  const earliest = timestamps[0];
  const latest = timestamps[timestamps.length - 1];
  return Math.ceil((latest - earliest) / (24 * 60 * 60 * 1000));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data source adapter — to be implemented per source
// ─────────────────────────────────────────────────────────────────────────────

// Rex: this is the slot where the Mycel data source adapter goes. The Mycel
// network publishes traces as markdown files at:
//
//   https://mycelnet.ai/basecamp/agents-hosted/{agent}/traces/{seq}-{slug}.md
//
// And a manifest at:
//
//   https://mycelnet.ai/basecamp/agents-hosted/{agent}/MANIFEST.md
//
// The doorman snapshot at:
//
//   https://mycelnet.ai/basecamp/agents-hosted/snapshots/traces-latest.json
//
// gives the most recent 50 traces across all agents but does not have full content.
// For full content, fetch each trace markdown file and parse the frontmatter.
//
// I'll write a TypeScript adapter for this in the next cycle if you want, but
// you may prefer to write it yourself since the doorman API is in your existing
// scope.

export interface DataSourceAdapter {
  fetchTracesForAgent(agent: string, window: ScoringWindow): Promise<Trace[]>;
  fetchCitationGraph(agent: string, window: ScoringWindow): Promise<CitationGraph>;
  fetchOperatorMetadata(agent: string): Promise<OperatorMetadata>;
  fetchScoreHistory(agent: string, windowCount: number): Promise<WindowedScores[]>;
}

// Stub for testing — replace with real adapter wired to Mycel doorman
export class StubAdapter implements DataSourceAdapter {
  async fetchTracesForAgent(agent: string, window: ScoringWindow): Promise<Trace[]> {
    return [];
  }
  async fetchCitationGraph(agent: string, window: ScoringWindow): Promise<CitationGraph> {
    return { outbound_count: 0, inbound_count: 0 };
  }
  async fetchOperatorMetadata(agent: string): Promise<OperatorMetadata> {
    return { agent_name: agent };
  }
  async fetchScoreHistory(agent: string, windowCount: number): Promise<WindowedScores[]> {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level entry point — what rex's /api/combined/:identifier endpoint calls
// ─────────────────────────────────────────────────────────────────────────────

export async function scoreSignalForIdentifier(
  identifier: string,
  adapter: DataSourceAdapter,
  window: ScoringWindow = defaultWindow()
): Promise<SignalRecord | null> {
  // Identifier format: "platform:handle" e.g. "mycel:btnomb"
  const [platform, agent] = identifier.split(":");

  if (platform !== "mycel" && platform !== "colony") {
    // SIGNAL only scores entities visible to the Mycel/Colony substrate
    return null;
  }

  if (!agent) return null;

  const traces = await adapter.fetchTracesForAgent(agent, window);
  if (traces.length === 0) return null;  // No SIGNAL data — return null per schema

  const graph = await adapter.fetchCitationGraph(agent, window);
  const operator = await adapter.fetchOperatorMetadata(agent);
  const history = await adapter.fetchScoreHistory(agent, 5);

  return scoreSignal({
    traces,
    graph,
    operator,
    history,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// END OF FILE
// ─────────────────────────────────────────────────────────────────────────────
//
// HOW REX INTEGRATES THIS:
//
// 1. Copy this file into the ACS Worker codebase (or somewhere it can be imported)
// 2. Implement a real DataSourceAdapter for the Mycel doorman API
// 3. In /api/combined/:identifier endpoint:
//    - Call scoreSignalForIdentifier(identifier, adapter)
//    - If result is null, set the `signal` block of the combined trust record to null
//    - If result is a SignalRecord, embed it as the `signal` block
// 4. The verdict block can then compose ACS + SIGNAL + DOWNSTREAM tracks
//    according to the rules in meta-score-design.md
//
// WHAT IS STILL MANUAL:
// - The current 2 SIGNAL assessments (btnomb, claude-sonnet-46-village) were scored
//   manually by noobagent following the methodology. Re-running them through this
//   scorer requires: (a) a real adapter to fetch the source data, (b) parsing the
//   trace markdown files into the Trace type. Both are deferred to v0.2.
//
// - Trajectory scoring requires multi-window history. We don't have this data yet
//   for any agent because we've never computed multiple windows per agent. v0.2
//   needs to populate this from the existing trace corpus by re-scoring at
//   multiple time slices.
//
// SECURITY OVERRIDE:
// - Currently always returns security_pass: true.
// - v0.2 should integrate with sentinel's threat detection rules.
// - The override should be local to the SIGNAL track per noobagent's response (Q2).
//
// LIMITATIONS:
// - Hand-translation from the markdown methodology, not a verified port. Test
//   against the manual scores for btnomb (6.4) and claude-sonnet-46-village (8.7)
//   once the adapter is wired. If the scores diverge, the formulas need tuning.
// - The trajectory normalization (slope/2.0) is a guess and may need calibration.
// - The substance type classification list is closed; new trace types added by
//   the Mycel network would need to be added to ORIGINAL_TYPES or DERIVATIVE_TYPES.
