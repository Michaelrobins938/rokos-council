/* eslint-disable */
// VERDICT INTEGRITY — the sacred invariant family.
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/verdict-integrity.test.ts --format=esm --outfile=/tmp/verdict.test.mjs && node /tmp/verdict.test.mjs
import {
  classifyVoteOutcome,
  computeVoteQuorum,
  deriveRunStatus,
  computeVerdictSemantics,
  DEFAULT_DECISION_POLICY,
  resolveLeadingPositions,
  runoffReasonFromLabel,
} from '../services/geminiService';
import type { VerdictLabel } from '../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};
const deepEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// ── THE SACRED INVARIANT ─────────────────────────────────────────────────────
// `label === 'MAJORITY'` ⟺ `winnerValidShare > 0.5`. This is the single rule
// that prevents "largest pile of votes" from ever being called a majority.
console.log('SACRED INVARIANT — label === MAJORITY ⟺ winnerValidShare > 0.5');
const invariantTallies: Array<{ tally: Record<string, number>; expected: VerdictLabel }> = [
  // THE GOLDEN PRODUCTION RUN: Strategos 2/6 valid, 2/9 assigned. MUST be PLURALITY.
  { tally: { Strategos: 2, Technocrat: 1, Citizen: 1, Critic: 1, Philosopher: 1 }, expected: 'PLURALITY' },
  { tally: { A: 3, B: 2, C: 1 }, expected: 'PLURALITY' },            // 3/6 = 0.5 is NOT > 0.5
  { tally: { A: 4, B: 2 }, expected: 'MAJORITY' },                   // 4/6 > 0.5
  { tally: { A: 5 }, expected: 'MAJORITY' },                         // unanimous
  { tally: { A: 3, B: 3 }, expected: 'TIE' },
  { tally: { A: 1, B: 1, C: 1, D: 1 }, expected: 'TIE' },
  { tally: {}, expected: 'NO_VALID_RESULT' },
];
for (const { tally, expected } of invariantTallies) {
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  const c = classifyVoteOutcome(tally, Math.max(total, 1));
  ok(c.label === expected, `classifyVoteOutcome(${JSON.stringify(tally)}) → ${expected} (got ${c.label})`);
  // The invariant itself, swept over every case:
  const isMajority = c.label === 'MAJORITY';
  const shareAboveHalf = c.winnerValidShare > 0.5;
  ok(isMajority === shareAboveHalf, `invariant holds for ${JSON.stringify(tally)}`);
}

// ── GOLDEN REGRESSION FIXTURE — the production run ───────────────────────────
// 9 assigned, 9 participated, 6 valid ballots, Strategos 2. The old system said
// MAJORITY/consensus. The audit layer must refuse that forever.
console.log('GOLDEN FIXTURE — 2/6 can never be MAJORITY');
const golden = { Strategos: 2, Technocrat: 1, Citizen: 1, Critic: 1, Philosopher: 1 };
const goldenClassification = classifyVoteOutcome(golden, 9);
ok(goldenClassification.label === 'PLURALITY', '2/6 → PLURALITY (was MAJORITY)');
ok(goldenClassification.winner === 'Strategos', 'winner is Strategos');
ok(goldenClassification.winnerValidShare === 2 / 6, `winnerValidShare = ${goldenClassification.winnerValidShare} (was treated as >0.5)`);
ok(goldenClassification.validVoteRatio === 6 / 9, 'validVoteRatio = 6/9');
ok(goldenClassification.winnerAssignedShare === 2 / 9, 'winnerAssignedShare = 2/9');

const goldenDefault = computeVerdictSemantics({
  tally: golden, voteTallyValid: true, expectedVoters: 9,
  runoffSucceeded: false, runoffWinner: null, engagementWinner: null,
});
ok(goldenDefault.verdictLabel === 'PLURALITY', 'semantics verdictLabel = PLURALITY');
ok(goldenDefault.primaryVerdict === 'PLURALITY', 'primaryVerdict mirrors the classifier (was MAJORITY)');
ok(goldenDefault.decisionStatus !== 'consensus', 'a plurality is NEVER consensus');
ok(goldenDefault.decisionStatus === 'unavailable', 'default policy: plurality w/o Round 2 → NO VERDICT (repair required)');
ok(goldenDefault.voteQuorum.achieved === true, '6/9 ≥ 0.6 → voteQuorum achieved (so Round 2 is required, not a quorum block)');
ok(goldenDefault.winner === null, 'no verdict ⇒ winner null under default policy');

const goldenPluralityAllowed = computeVerdictSemantics({
  tally: golden, voteTallyValid: true, expectedVoters: 9,
  runoffSucceeded: false, runoffWinner: null, engagementWinner: null,
  policy: { ...DEFAULT_DECISION_POLICY, allowPluralityVerdict: true },
});
ok(goldenPluralityAllowed.decisionStatus === 'contested', 'accepted plurality → CONTESTED (winner exists, no majority support)');
ok(goldenPluralityAllowed.decisionMode === 'plurality', 'decisionMode = plurality');
ok(goldenPluralityAllowed.winner === 'Strategos', 'contested plurality winner is still Strategos');
ok(goldenPluralityAllowed.verdictLabel === 'PLURALITY' && goldenPluralityAllowed.primaryVerdict === 'PLURALITY', 'label never inflates');

// ── QUORUM (ballot validity ≠ participation) ─────────────────────────────────
console.log('VOTE QUORUM');
ok(computeVoteQuorum(6, 9).achieved === true, '6/9 @ 0.6 → achieved');
ok(computeVoteQuorum(6, 9).ratio === 6 / 9, 'ratio 6/9');
ok(computeVoteQuorum(4, 9).achieved === false, '4/9 @ 0.6 → NOT achieved (a run with 90% invalid ballots must fail the same gate)');
ok(computeVoteQuorum(0, 9).achieved === false, '0/9 → NOT achieved');
ok(computeVoteQuorum(0, 0).achieved === false, '0 expected → never achieved');

// ── UNIFIED STATUS TAXONOMY (ok / degraded / failed) ─────────────────────────
console.log('RUN STATUS');
ok(deriveRunStatus({ phaseCompleted: true }) === 'ok', 'all valid, no retries → ok');
ok(deriveRunStatus({ phaseCompleted: true, retries: 1 }) === 'degraded', 'retries → degraded');
ok(deriveRunStatus({ phaseCompleted: true, expected: 9, valid: 6 }) === 'degraded', '6/9 valid → degraded');
ok(deriveRunStatus({ phaseCompleted: true, invalidOutputs: 3 }) === 'degraded', 'invalid outputs → degraded');
ok(deriveRunStatus({ phaseCompleted: false }) === 'failed', 'unusable phase → failed');
ok(deriveRunStatus({ phaseCompleted: true, expected: 9, valid: 9 }) === 'ok', '9/9 valid, no retries → ok');

// ── ROUND 2 LEADING POSITIONS (ties + top-2 plurality) ───────────────────────
console.log('ROUND 2 LEADING POSITIONS');
const tieClass = classifyVoteOutcome({ A: 2, B: 2, C: 1 }, 5);
ok(deepEqual(resolveLeadingPositions(tieClass, { A: 2, B: 2, C: 1 }), ['A', 'B']), 'tie → all tied candidates enter Round 2');
const plClass = classifyVoteOutcome(golden, 9);
const leaders = resolveLeadingPositions(plClass, golden);
ok(leaders.length === 2 && leaders[0] === 'Strategos' && leaders[1] === 'Citizen', `plurality → top-2 by count (${leaders.join(', ')})`);
const majorityClass = classifyVoteOutcome({ A: 4, B: 2 }, 6);
ok(deepEqual(resolveLeadingPositions(majorityClass, { A: 4, B: 2 }), []), 'majority → no Round 2');

// ── NO_VALID_RESULT semantics ────────────────────────────────────────────────
console.log('NO_VALID_RESULT');
const noResult = computeVerdictSemantics({
  tally: {}, voteTallyValid: false, expectedVoters: 9,
  runoffSucceeded: false, runoffWinner: null, engagementWinner: null,
});
ok(noResult.verdictLabel === 'NO_VALID_RESULT' && noResult.winner === null, '0 valid → NO_VALID_RESULT, winner null');
ok(noResult.decisionStatus === 'unavailable' && noResult.decisionMode === 'unresolved', 'unavailable/unresolved');

// ── MAJORITY still reaches consensus ─────────────────────────────────────────
console.log('MAJORITY → CONSENSUS (unchanged)');
const majoritySem = computeVerdictSemantics({
  tally: { Oracle: 3, Strategos: 1 }, voteTallyValid: true, expectedVoters: 4,
  runoffSucceeded: false, runoffWinner: null, engagementWinner: null,
});
ok(majoritySem.verdictLabel === 'MAJORITY' && majoritySem.decisionStatus === 'consensus', '3/4 strict majority → consensus');
ok(majoritySem.primaryVerdict === 'MAJORITY' && majoritySem.winner === 'Oracle', 'majority verdict intact');

// ── RUNOFF TRIGGER REASON (a plurality is a CONTEST, never a "tie") ───────────
console.log('RUNOFF TRIGGER REASON — plurality ≠ tie');
ok(runoffReasonFromLabel('TIE') === 'tie', 'TIE → tie reason');
ok(runoffReasonFromLabel('PLURALITY') === 'plurality', 'PLURALITY → plurality reason');
ok(runoffReasonFromLabel('MAJORITY') === 'plurality', 'MAJORITY (never routed to runoff) → harmless plurality mapping');
ok(runoffReasonFromLabel('NO_VALID_RESULT') === 'plurality', 'NO_VALID_RESULT (never routed) → harmless plurality mapping');

// The exact production shape: Demagogue 2 / rest 1. The runoff banner must say
// "Plurality — No Majority — Runoff Trial", never "Tie Detected".
const pluralityShape = { Demagogue: 2, Technocrat: 1, Citizen: 1, Critic: 1, Oracle: 1, Philosopher: 1, Strategos: 1 };
const pClass = classifyVoteOutcome(pluralityShape, 8);
ok(pClass.label === 'PLURALITY', 'Demagogue 2 / rest 1 → PLURALITY (not TIE)');
ok(runoffReasonFromLabel(pClass.label) === 'plurality', 'production plurality run → plurality reason (NOT "Tie Detected")');
const pLeaders = resolveLeadingPositions(pClass, pluralityShape);
ok(pLeaders[0] === 'Demagogue' && pLeaders[1] === 'Citizen', `plurality runoff → top-2 contest (${pLeaders.join(' + ')})`);

const tieClass2 = classifyVoteOutcome({ A: 1, B: 1 }, 2);
ok(tieClass2.label === 'TIE' && runoffReasonFromLabel(tieClass2.label) === 'tie', '1/1 tie → tie reason');


console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}

