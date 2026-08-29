// ─────────────────────────────────────────────────────────────────────────────
// DISSONANCE ENGINE — the causal belief-revision layer.
//
// Artifact 3 of the social-cognitive ecology. It sits on top of the Round 2
// ledger and separates two kinds of truth, recorded side by side and never
// conflated:
//
//   movement  → DERIVED from the ledger (confidence deltas + `changed`). The
//               behavioral fact: 0.72 → 0.58 with a changed vote.
//   trigger / defense / resolution / dissonance
//             → MODEL-REPORTED interpretation of the internal contradiction.
//
// The movement taxonomy (SHIFTED / REINFORCED / WEAKENED / STABLE) upgrades the
// old retained-increased/reduced/same ledger into a psychological one, and the
// invariant system gives every persona 3-5 things they almost never abandon —
// with INVARIANT THREATENED as the deepest dissonance state in the chamber.
//
// All functions are pure and unit-testable (no provider involvement).
// ─────────────────────────────────────────────────────────────────────────────
import {
  BeliefMovement,
  DissonanceRecord,
  InvariantStatus,
  VoteRevisionRecord,
} from '../types';

export const MOVEMENT_EPSILON = 0.02;
export const MOVEMENTS: BeliefMovement[] = ['SHIFTED', 'REINFORCED', 'WEAKENED', 'STABLE'];

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// ── MOVEMENT — the ledger-derived behavioral fact ─────────────────────────────
export const classifyMovement = (
  confidenceBefore: number,
  confidenceAfter: number,
  changed: boolean,
  epsilon: number = MOVEMENT_EPSILON,
): BeliefMovement => {
  if (changed) return 'SHIFTED';
  if (confidenceAfter > confidenceBefore + epsilon) return 'REINFORCED';
  if (confidenceAfter < confidenceBefore - epsilon) return 'WEAKENED';
  return 'STABLE';
};

// Fallback dissonance estimate when the model does not report one. Higher when
// a shift happens, higher when a position is held while confidence craters.
export const estimateDissonance = (
  confidenceBefore: number,
  confidenceAfter: number,
  changed: boolean,
): number => {
  const delta = Math.abs(confidenceAfter - confidenceBefore);
  if (changed) return clamp01(0.45 + delta * 1.5);
  if (confidenceAfter < confidenceBefore) return clamp01(0.25 + delta * 2);
  return clamp01(delta * 1.2);
};

export const isBeliefMovement = (v: unknown): v is BeliefMovement =>
  typeof v === 'string' && (MOVEMENTS as string[]).includes(v);

// ── INVARIANTS — what a persona almost never abandons ────────────────────────
// Stress accumulates from the revision ledger. Crossing thresholds moves a
// persona INTACT → STRESSED → THREATENED (REVISED is only ever set explicitly).
export const INVARIANT_STRESS_THREATENED = 5;
export const INVARIANT_STRESS_STRESSED = 2.5;

export const computeInvariantStressDelta = (record: DissonanceRecord): number => {
  if (record.status && record.status !== 'completed') return 0;
  const movement = record.movement ?? classifyMovement(record.confidenceBefore, record.confidenceAfter, record.changed);
  const dissonance = typeof record.dissonance === 'number' ? record.dissonance : estimateDissonance(record.confidenceBefore, record.confidenceAfter, record.changed);
  if (movement === 'SHIFTED' && dissonance >= 0.7) return 2;
  if (movement === 'SHIFTED' && dissonance >= 0.4) return 1;
  if (movement === 'WEAKENED' && record.confidenceAfter < 0.4) return 1;
  return 0;
};

export const deriveInvariantStatus = (stress: number): InvariantStatus => {
  if (stress >= INVARIANT_STRESS_THREATENED) return 'THREATENED';
  if (stress >= INVARIANT_STRESS_STRESSED) return 'STRESSED';
  return 'INTACT';
};

// ── RECORD BUILDER — fact + interpretation, never conflated ───────────────────
export const buildDissonanceRecord = (
  record: VoteRevisionRecord,
  reported?: Partial<Pick<DissonanceRecord, 'movement' | 'dissonance' | 'trigger' | 'defense' | 'resolution' | 'invariantStatus'>>,
): DissonanceRecord => {
  const movement = reported?.movement && isBeliefMovement(reported.movement)
    ? reported.movement
    : classifyMovement(record.confidenceBefore, record.confidenceAfter, record.changed);
  const dissonance = typeof reported?.dissonance === 'number' && Number.isFinite(reported.dissonance)
    ? clamp01(reported.dissonance)
    : estimateDissonance(record.confidenceBefore, record.confidenceAfter, record.changed);
  const recordWithMovement: DissonanceRecord = {
    ...record,
    movement,
    dissonance,
    trigger: reported?.trigger,
    defense: reported?.defense,
    resolution: reported?.resolution,
    invariantStatus: reported?.invariantStatus,
  };
  // `trigger`/`defense`/`resolution` come from the model and stay optional —
  // but the ledger-derived movement is ALWAYS present.
  return recordWithMovement;
};

// Movement census across a Round 2 ledger — the dissonance-aware upgrade of
// computeRound2Persuasion. Pure, deterministic, derived from the records.
export const computeMovementBreakdown = (
  revisions: DissonanceRecord[],
): Record<BeliefMovement, number> => {
  const breakdown: Record<BeliefMovement, number> = { SHIFTED: 0, REINFORCED: 0, WEAKENED: 0, STABLE: 0 };
  for (const r of revisions) {
    if (r.status && r.status !== 'completed') continue;
    const movement = r.movement ?? classifyMovement(r.confidenceBefore, r.confidenceAfter, r.changed);
    breakdown[movement] = (breakdown[movement] ?? 0) + 1;
  }
  return breakdown;
};
