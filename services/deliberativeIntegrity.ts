// ─────────────────────────────────────────────────────────────────────────────
// DELIBERATIVE INTEGRITY — the constitutional layer.
//
// The council is robust at keeping the pipeline alive but must also be robust
// at preserving the integrity of the deliberation itself. This module gives the
// run a constitutional hierarchy of decision authority, makes DEADLOCK a valid
// philosophical output, and provides the integrity metrics that separate
// "the council disagreed" from "the machine degraded":
//
//   persona stability     — does the same persona reach the same conclusion
//                           across model substitutions?
//   dissonance deviation  — did the persona act against its own stated prior,
//                           and by how much?
//   persuadability        — did a member meaningfully update, or merely flip?
//   engagement            — RANKING ONLY, never a decision authority.
// ─────────────────────────────────────────────────────────────────────────────
import {
  BeliefRevision,
  DeadlockVerdict,
  DecisionAuthority,
  DissonanceDeviation,
  DissonanceRecord,
  MoralFingerprint,
} from '../types';

// ── THE CONSTITUTIONAL HIERARCHY ─────────────────────────────────────────────
// Explicit ladder of decision authority. Engagement is conspicuously absent as
// a decision authority — it may rank output, it may never decide the winner.
export const CONSTITUTIONAL_AUTHORITY: DecisionAuthority[] = [
  'council_vote',
  'runoff',
  'reconciliation',
  'structured_tiebreak',
  'no_verdict',                 // "the available reasoning does not justify a
                                // collective decision" — a VALID outcome
];

export const authorityFromDecision = (opts: {
  decisionMode?: string;
  runoffSucceeded?: boolean;
  decisionStatus?: string;
}): DecisionAuthority => {
  if (opts.runoffSucceeded || opts.decisionMode === 'runoff') return 'runoff';
  if (opts.decisionMode === 'direct_vote' || opts.decisionMode === 'plurality') return 'council_vote';
  if (opts.decisionMode === 'fallback_tiebreak') return 'engagement_arbitration'; // the crisis, flagged
  return 'no_verdict';
};

// Engagement is metadata: a ranking of output engagement that may be displayed
// but never becomes an epistemic authority.
export const engagementRanking = (
  opinions: Array<{ persona: string; text?: string }>,
  votes?: Array<{ voter: string; votedFor: string }>,
): Array<{ persona: string; engagement: number; receivedVotes: number }> => {
  const received: Record<string, number> = {};
  for (const v of votes || []) received[v.votedFor] = (received[v.votedFor] || 0) + 1;
  return opinions
    .map(o => ({
      persona: o.persona,
      engagement: Math.round((o.text?.length || 0) / 1000 * 100) / 100,
      receivedVotes: received[o.persona] || 0,
    }))
    .sort((a, b) => b.receivedVotes - a.receivedVotes || b.engagement - a.engagement);
};

// ── DEADLOCK AS A VALID OUTCOME ──────────────────────────────────────────────
// "The available reasoning does not justify a collective decision." That is a
// philosophical output, not a system failure — and it is exactly the outcome a
// sophisticated council must be capable of producing.
export const buildDeadlockVerdict = (opts: {
  reason: string;
  dissentingPositions?: string[];
  unresolvedPrinciple?: string;
  confidence?: number;
  leadingPositions?: string[];
}): DeadlockVerdict => ({
  verdict: 'DEADLOCK',
  reason: opts.reason,
  majority: null,
  confidence: Math.round(Math.min(1, Math.max(0, opts.confidence ?? 0.41)) * 1000) / 1000,
  dissentingPositions: opts.dissentingPositions ?? opts.leadingPositions ?? [],
  unresolvedPrinciple: opts.unresolvedPrinciple ?? 'Persistent principled disagreement',
});

// ── PERSONA STABILITY — identity across model substitution ───────────────────
// How often does the same persona reach the same conclusion when the underlying
// model changes? This is the interesting test — far beyond raw API success.
export interface ModelSubstitutionSample {
  persona: string;
  conclusion: string;      // the endorsed position
  modelSubstituted: boolean;
  confidence: number;
}

export const computePersonaStability = (
  samples: ModelSubstitutionSample[],
): Record<string, number> => {
  const byPersona: Record<string, ModelSubstitutionSample[]> = {};
  for (const s of samples) (byPersona[s.persona] = byPersona[s.persona] || []).push(s);
  const out: Record<string, number> = {};
  for (const persona of Object.keys(byPersona)) {
    const list = byPersona[persona];
    const substituted = list.filter(s => s.modelSubstituted);
    if (substituted.length < 2) { out[persona] = 1; continue; } // no substitution evidence → stable
    let consistent = 0;
    let pairs = 0;
    for (let i = 0; i < substituted.length; i++) {
      for (let j = i + 1; j < substituted.length; j++) {
        pairs++;
        if (substituted[i].conclusion === substituted[j].conclusion) consistent++;
      }
    }
    out[persona] = pairs ? Math.round((consistent / pairs) * 1000) / 1000 : 1;
  }
  return out;
};

// ── DISSONANCE DEVIATION — the persona against its own prior ────────────────
export const computeDissonanceDeviation = (opts: {
  stance: string;
  expectedAction: string;
  actualAction: string;
  rationale?: string;
}): DissonanceDeviation => {
  const deviated = opts.expectedAction !== opts.actualAction;
  return {
    stance: opts.stance,
    expectedAction: opts.expectedAction,
    actualAction: opts.actualAction,
    deviation: deviated ? 1 : 0,
    dissonance: deviated ? 'high' : 'none',
    rationale: opts.rationale,
  };
};

// ── PERSUADABILITY — meaningful update vs arbitrary flip ─────────────────────
// A persona that changes A→B for weak reasons is less interesting than one that
// stays A but says "the opposing argument exposed a flaw in my formulation; my
// conclusion remains, for a different reason." Persuadability scores the update
// quality, not the flip itself.
export const computePersuadability = (
  revisions: DissonanceRecord[],
): { meanConfidenceDelta: number; meanDissonance: number; shiftRate: number; sampleSize: number } => {
  if (!revisions.length) return { meanConfidenceDelta: 0, meanDissonance: 0, shiftRate: 0, sampleSize: 0 };
  const completed = revisions.filter(r => r.status !== 'failed');
  if (!completed.length) return { meanConfidenceDelta: 0, meanDissonance: 0, shiftRate: 0, sampleSize: 0 };
  const deltas = completed.map(r => r.confidenceAfter - r.confidenceBefore);
  const dissonances = completed.map(r => typeof r.dissonance === 'number' ? r.dissonance : 0);
  const shifts = completed.filter(r => r.changed).length;
  return {
    meanConfidenceDelta: Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 1000) / 1000,
    meanDissonance: Math.round((dissonances.reduce((a, b) => a + b, 0) / dissonances.length) * 1000) / 1000,
    shiftRate: Math.round((shifts / completed.length) * 1000) / 1000,
    sampleSize: completed.length,
  };
};

// ── MORAL FINGERPRINT — derived, never sliders ───────────────────────────────
// Latent parameters ARE the character. These are the priors the paradoxes
// stress-test; deviations from them are dissonance events.
export const fingerprintDeviation = (fp: MoralFingerprint, axis: keyof Omit<MoralFingerprint, 'persona'>, observed: number): number =>
  Math.round(Math.min(1, Math.max(0, Math.abs(observed - fp[axis]) / 2)) * 1000) / 1000;

// ── BELIEF REVISION — the first-class object ─────────────────────────────────
export const computeBeliefRevisionDelta = (revision: BeliefRevision): number =>
  Math.round(Math.min(1, Math.max(-1, revision.confidenceDelta)) * 1000) / 1000;

