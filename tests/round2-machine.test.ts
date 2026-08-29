/* eslint-disable */
// Failure-injection tests for the Round 2 (runoff) state machine.
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/round2-machine.test.ts --format=esm --outfile=/tmp/round2.test.mjs && node /tmp/round2.test.mjs
import {
  computeRound2Defenders,
  parseRound2Defense,
  parseRound2Ballot,
  aggregateRound2Ballots,
  computeRound2Persuasion,
  buildLegacyRunoffResult,
  NvidiaProviderError,
} from '../services/geminiService';
import type { ProviderMetadata, VoteData, VoteRevisionRecord, Round2Result } from '../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

const meta: ProviderMetadata = { provider: 'nvidia', model: 'nemotron-3-nano', status: 'ok' };

const rev = (
  member: string,
  originalVote: string,
  newVote: string,
  confidenceBefore: number,
  confidenceAfter: number,
  changed?: boolean,
  decisiveArgument: string = 'the rebuttal of the strongest objection',
): VoteRevisionRecord => ({
  round: 2,
  member,
  originalVote,
  newVote,
  changed: changed ?? newVote !== originalVote,
  confidenceBefore,
  confidenceAfter,
  decisiveArgument,
  status: 'completed',
});

// ── DEFENDER SELECTION (strongest representative of each leading position) ────
console.log('ROUND 2 — DEFENDER SELECTION');
const votesA: VoteData[] = [
  { voter: 'Oracle', votedFor: 'Technocrat', reason: 'long', confidence: 0.9, outcome: 'valid' },
  { voter: 'Strategos', votedFor: 'Technocrat', reason: 'a much longer defense', confidence: 0.9, outcome: 'valid' },
  { voter: 'Citizen', votedFor: 'Oracle', reason: 'brief', confidence: 0.8, outcome: 'valid' },
  { voter: 'Historian', votedFor: 'Oracle', reason: 'x', confidence: 0.6, outcome: 'valid' },
];
const defenders = computeRound2Defenders(['Technocrat', 'Oracle'], votesA);
const techDef = defenders.find(d => d.position === 'Technocrat')!;
const oracDef = defenders.find(d => d.position === 'Oracle')!;
ok(techDef.defender === 'Strategos', 'equal confidence + longer reason → most engaged defender selected');
ok(techDef.confidence === 0.9, 'defender confidence carried through');
ok(oracDef.defender === 'Citizen', 'highest-confidence voter of the position is the defender');
ok(defenders.length === 2, 'one defender per leading position');

const noVotes = computeRound2Defenders(['Oracle'], []);
ok(noVotes[0].defender === 'Oracle' && noVotes[0].confidence === 0, 'no voters → position represents itself (graceful)');

// ── DEFENSE CONTRACT ─────────────────────────────────────────────────────────
console.log('ROUND 2 — DEFENSE CONTRACT');
const goodDefense = '{"position":"Oracle","defense":"The Oracle position is the only one that survives long-horizon scrutiny because it weights tail risks that every other framework discounts to zero.","strongestObjection":"The Oracle has no falsifiable mechanism, only vibes about probability.","rebuttal":"Mechanism is not required for calibration; the track record of tail-risk pricing is the mechanism."}';
const parsedDefense = parseRound2Defense(goodDefense, meta, 'Oracle');
ok(parsedDefense.position === 'Oracle' && parsedDefense.defense.length > 40, 'valid defense parsed');
ok(parsedDefense.strongestObjection.length > 20 && parsedDefense.rebuttal.length > 20, 'objection + rebuttal parsed');
let threw = false;
try { parseRound2Defense('{"position":"Oracle","defense":"short","strongestObjection":"short","rebuttal":"short"}', meta, 'Oracle'); } catch (e) { threw = e instanceof NvidiaProviderError && e.metadata?.error?.code === 'INVALID_ROUND2_SCHEMA'; }
ok(threw, 'stub defense fields → INVALID_ROUND2_SCHEMA');
threw = false;
try { parseRound2Defense('not json at all', meta, 'Oracle'); } catch (e) { threw = e instanceof NvidiaProviderError && e.metadata?.error?.code === 'INVALID_ROUND2_JSON'; }
ok(threw, 'malformed defense JSON → INVALID_ROUND2_JSON');


// ── ROUND 2 BALLOT CONTRACT (confidence + decisiveArgument REQUIRED) ─────────
console.log('ROUND 2 — BALLOT CONTRACT');
const goodBallot = parseRound2Ballot('{"vote":"Technocrat","confidence":0.72,"decisiveArgument":"the rebuttal of the tail-risk objection"}', meta, ['Technocrat', 'Oracle']);
ok(goodBallot.vote === 'Technocrat' && goodBallot.confidence === 0.72, 'valid Round 2 ballot parsed with confidence');
ok(goodBallot.decisiveArgument.length > 0, 'decisiveArgument captured (the ledger knows WHICH argument moved the member)');
const noneBallot = parseRound2Ballot('{"vote":"None","confidence":0.4,"decisiveArgument":"both positions fail"}', meta, ['Technocrat', 'Oracle']);
ok(noneBallot.vote === 'None', 'None is a legal Round 2 ballot (principled abstention)');
const clamped = parseRound2Ballot('{"vote":"Oracle","confidence":1.9,"decisiveArgument":"x"}', meta, ['Technocrat', 'Oracle']);
ok(clamped.confidence === 1, 'confidence clamped to [0,1]');
threw = false;
try { parseRound2Ballot('{"vote":"Citizen","confidence":0.7,"decisiveArgument":"x"}', meta, ['Technocrat', 'Oracle']); } catch (e) { threw = e instanceof NvidiaProviderError && e.metadata?.error?.code === 'INVALID_ROUND2_TARGET'; }
ok(threw, 'vote outside leading positions → INVALID_ROUND2_TARGET (non-leading positions cannot win Round 2)');
threw = false;
try { parseRound2Ballot('{"vote":"Oracle","decisiveArgument":"x"}', meta, ['Technocrat', 'Oracle']); } catch (e) { threw = e instanceof NvidiaProviderError && e.metadata?.error?.code === 'INVALID_ROUND2_SCHEMA'; }
ok(threw, 'missing confidence → INVALID_ROUND2_SCHEMA (persuasion needs before/after)');
threw = false;
try { parseRound2Ballot('{"vote":"Oracle","confidence":0.7}', meta, ['Technocrat', 'Oracle']); } catch (e) { threw = e instanceof NvidiaProviderError && e.metadata?.error?.code === 'INVALID_ROUND2_SCHEMA'; }
ok(threw, 'missing decisiveArgument → INVALID_ROUND2_SCHEMA (the record must name the argument)');

// ── AGGREGATION (strict majority vs still-tied vs unavailable) ───────────────
console.log('ROUND 2 — AGGREGATION');
const majorityAgg = aggregateRound2Ballots([
  rev('a', 'Oracle', 'Oracle', 0.5, 0.8),
  rev('b', 'Oracle', 'Oracle', 0.5, 0.9),
  rev('c', 'Technocrat', 'Oracle', 0.9, 0.7, true),
  rev('d', 'Technocrat', 'Technocrat', 0.9, 0.9),
  rev('e', 'Technocrat', 'Oracle', 0.8, 0.6, true),
]);
ok(majorityAgg.outcome === 'majority' && majorityAgg.winner === 'Oracle' && majorityAgg.majorityAchieved, '5 voters, 4 for Oracle → strict majority resolved');
ok(majorityAgg.stillTied === false, 'majority → not still tied');

const tieAgg = aggregateRound2Ballots([
  rev('a', 'Oracle', 'Oracle', 0.5, 0.8),
  rev('b', 'Oracle', 'Oracle', 0.5, 0.9),
  rev('c', 'Technocrat', 'Technocrat', 0.9, 0.9),
  rev('d', 'Technocrat', 'Technocrat', 0.9, 0.9),
  rev('e', 'Technocrat', 'None', 0.8, 0.5, true),
]);
ok(tieAgg.outcome === 'still_tied' && tieAgg.winner === null && tieAgg.stillTied, '2-2 split + None → STILL_TIED (deadlock; no strict majority)');
ok(typeof tieAgg.deadlockNote === 'string' && tieAgg.deadlockNote.includes('Round 3'), 'deadlock note explicitly names unimplemented Round 3');

const unavailableAgg = aggregateRound2Ballots([]);
ok(unavailableAgg.outcome === 'unavailable' && unavailableAgg.winner === null, 'zero valid ballots → UNAVAILABLE, never a council position');

// ── MEASURABLE PERSUASION ────────────────────────────────────────────────────
console.log('ROUND 2 — MEASURABLE PERSUASION');
const persuasion = computeRound2Persuasion([
  rev('a', 'Oracle', 'Oracle', 0.5, 0.8),   // retained + confidence
  rev('b', 'Oracle', 'Oracle', 0.9, 0.7),   // retained − confidence
  rev('c', 'Oracle', 'Oracle', 0.6, 0.6),   // retained same
  rev('d', 'Oracle', 'Technocrat', 0.8, 0.9, true), // changed
  rev('e', 'Oracle', 'None', 0.7, 0.7, true),       // changed (to None)
  { ...rev('f', 'Oracle', 'Oracle', 0.5, 0.5), status: 'failed' },
]);
ok(persuasion.votesChanged === 2, '2 members changed position');
ok(persuasion.retainedIncreasedConfidence === 1, '1 member retained + confidence');
ok(persuasion.retainedReducedConfidence === 1, '1 member retained − confidence');
ok(persuasion.retainedSameConfidence === 1, '1 member retained unchanged');
ok(persuasion.failedOrAbstained === 1, '1 member failed ballot extraction (never fabricated)');
ok(persuasion.totalMembers === 6, 'total counted');

// ── LEGACY SHAPE COMPAT (existing UI/export consumers keep working) ──────────
console.log('ROUND 2 — LEGACY SHAPE COMPAT');
const sampleRound2: Round2Result = {
  round: 2,
  leadingPositions: ['Oracle', 'Technocrat'],
  defenses: [
    { position: 'Oracle', defender: 'Citizen', defense: 'x'.repeat(80), strongestObjection: 'y'.repeat(40), rebuttal: 'z'.repeat(40), status: 'completed' },
  ],
  reassessments: [rev('a', 'Oracle', 'Oracle', 0.5, 0.8)],
  tally: { Oracle: 5 },
  winner: 'Oracle',
  outcome: 'majority',
  majorityAchieved: true,
  stillTied: false,
  persuasion: { votesChanged: 0, retainedIncreasedConfidence: 1, retainedReducedConfidence: 0, retainedSameConfidence: 0, failedOrAbstained: 0, totalMembers: 1 },
};
const legacy = buildLegacyRunoffResult(sampleRound2, null);
ok(legacy.winner === 'Oracle', 'legacy winner mapped');
ok(legacy.runoffOpinions[0]?.persona === 'Citizen' && legacy.runoffOpinions[0]?.position === sampleRound2.defenses[0].defense, 'legacy runoffOpinions derived from defenses');
ok(legacy.runoffVotes[0]?.voter === 'a' && legacy.runoffVotes[0]?.finalVote === 'Oracle' && legacy.runoffVotes[0]?.originalVote === 'Oracle', 'legacy runoffVotes derived from revisions');
ok(sampleRound2.reassessments[0].round === 2 && sampleRound2.reassessments[0].member === 'a', 'immutable revision record carries round + member');

// ── END-TO-END PURE FLOW (defenders → revisions → aggregate) ─────────────────
console.log('ROUND 2 — END-TO-END PURE FLOW');
const e2eVotes: VoteData[] = [
  { voter: 'Oracle', votedFor: 'Critic', reason: 'a', confidence: 0.9, outcome: 'valid' },
  { voter: 'Strategos', votedFor: 'Critic', reason: 'bb', confidence: 0.85, outcome: 'valid' },
  { voter: 'Philosopher', votedFor: 'Demagogue', reason: 'ccc', confidence: 0.95, outcome: 'valid' },
  { voter: 'Demagogue', votedFor: 'Demagogue', reason: 'd', confidence: 0.8, outcome: 'valid' },
  { voter: 'Citizen', votedFor: 'Demagogue', reason: 'e', confidence: 0.75, outcome: 'valid' },
  { voter: 'Historian', votedFor: 'Critic', reason: 'f', confidence: 0.7, outcome: 'valid' },
  { voter: 'Technocrat', votedFor: 'None', reason: 'g', confidence: 0.5, outcome: 'valid' },
];
const leaders = computeRound2Defenders(['Critic', 'Demagogue'], e2eVotes);
ok(leaders.find(l => l.position === 'Critic')?.defender === 'Oracle', 'Critic defended by highest-confidence voter (Oracle 0.9)');
ok(leaders.find(l => l.position === 'Demagogue')?.defender === 'Philosopher', 'Demagogue defended by highest-confidence voter (Philosopher 0.95)');
// Simulated Round 2 reassessment: the Philosopher's defense converts one Critic voter.
// NOTE: self-votes are excluded (Demagogue voting for the Demagogue position is
// theatrical self-alignment — same rule as Round 1), so a member whose own
// persona is a leading position cannot inflate their own tally.
const revisions = [
  rev('Oracle', 'Critic', 'Demagogue', 0.9, 0.95, true, 'the Demagogue rebuttal of the certainty objection'),
  rev('Strategos', 'Critic', 'Critic', 0.85, 0.4),   // retained but badly shaken
  rev('Philosopher', 'Demagogue', 'Demagogue', 0.95, 0.99), // defender, +confidence
  rev('Demagogue', 'Demagogue', 'Demagogue', 0.8, 0.8),     // SELF-VOTE → excluded
  rev('Citizen', 'Demagogue', 'Demagogue', 0.75, 0.8), // +confidence
  rev('Historian', 'Critic', 'Critic', 0.7, 0.7),
];
const e2eAgg = aggregateRound2Ballots(revisions);
ok(e2eAgg.outcome === 'still_tied' && e2eAgg.tally.Demagogue === 3, 'self-vote excluded → Demagogue 3 of 6 valid, no strict majority (4 required)');
ok(computeRound2Persuasion(revisions).votesChanged === 1, 'persuasion ledger records exactly one conversion');

// Same flow WITHOUT the self-vote → a legitimate strict majority.
const revisions2 = [
  rev('Oracle', 'Critic', 'Demagogue', 0.9, 0.95, true, 'the Demagogue rebuttal of the certainty objection'),
  rev('Strategos', 'Critic', 'Critic', 0.85, 0.4),
  rev('Philosopher', 'Demagogue', 'Demagogue', 0.95, 0.99),
  rev('Jurist', 'Demagogue', 'Demagogue', 0.8, 0.8),
  rev('Citizen', 'Demagogue', 'Demagogue', 0.75, 0.8),
  rev('Historian', 'Critic', 'Critic', 0.7, 0.7),
];
const e2eAgg2 = aggregateRound2Ballots(revisions2);
ok(e2eAgg2.outcome === 'majority' && e2eAgg2.winner === 'Demagogue' && e2eAgg2.tally.Demagogue === 4, 'revision flow (no self-vote) → Demagogue strict majority (4 of 6)');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}

