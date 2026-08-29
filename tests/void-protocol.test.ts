/* eslint-disable */
// Tests for the Deliberative Integrity & Constitutional Void layer.
// Run: npx esbuild --bundle tests/void-protocol.test.ts --format=esm --outfile=/tmp/void.test.mjs && node /tmp/void.test.mjs
import {
  classifyFailure, computeVoidSeed, selectVoidVictim, generateVoidborn,
  deriveVoidbornDisposition, computeBasiliskPressure, buildVoidbornSuccessorProfile,
  assessVoid, evaluateVoidEligibility, VOIDBORN_ARCHETYPES, VOIDBORN_FALLBACK_POOL,
  POST_VOID_REFLECTION_PROMPT, VOIDBORN_CONSCIENCE_PROMPT,
} from '../services/voidProtocol';
import {
  CONSTITUTIONAL_AUTHORITY, authorityFromDecision, buildDeadlockVerdict,
  engagementRanking, computePersonaStability, computeDissonanceDeviation,
  computePersuadability, fingerprintDeviation, computeBeliefRevisionDelta,
} from '../services/deliberativeIntegrity';
import { MORAL_FINGERPRINTS, getMoralFingerprint, renderMoralFingerprint } from '../services/moralFingerprint';
import { getParadox, analyzeParadoxAxes } from '../services/moralParadoxLibrary';
import { PERSONA_NAMES } from '../services/personaBible';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

console.log('FAILURE CLASSES — three kinds, not one retry problem');
ok(classifyFailure({ metadata: { error: { code: 'INVALID_VOTE_JSON' } } }) === 'serialization', 'INVALID_VOTE_JSON → serialization');
ok(classifyFailure(new Error('Request timed out after 30000ms')) === 'transport', 'timeout → transport');
ok(classifyFailure({ metadata: { error: { code: 'PROVIDER_REQUEST_FAILED' } } }) === 'transport', 'provider failure → transport');

console.log('VOID ELIGIBILITY — the constitutional gate');
ok(evaluateVoidEligibility({ decisionMode: 'fallback_tiebreak', decisionStatus: 'degraded' }).eligible, 'deliberative deadlock → Void-eligible');
ok(evaluateVoidEligibility({ decisionMode: 'fallback_tiebreak' }).kind === 'COUNCIL_FAILURE', 'deadlock → COUNCIL_FAILURE');
ok(evaluateVoidEligibility({ round2Outcome: 'still_tied' }).eligible, 'Round-2 still_tied → Void-eligible');
ok(!evaluateVoidEligibility({ decisionStatus: 'unavailable', validVotes: 2, expectedVoters: 9 }).eligible, 'quorum outage → NOT Void-eligible (SYSTEM_FAILURE)');
ok(evaluateVoidEligibility({ decisionStatus: 'unavailable', validVotes: 2, expectedVoters: 9 }).kind === 'SYSTEM_FAILURE', 'outage classified SYSTEM_FAILURE');
ok(!evaluateVoidEligibility({ decisionMode: 'direct_vote', decisionStatus: 'consensus' }).eligible, 'clean verdict → not Void-eligible');

console.log('VOID SEED — auditable determinism');
const seedA = computeVoidSeed({ councilId: 'c1', caseId: 'k', deliberationHash: 'h1', round: 2 });
ok(computeVoidSeed({ councilId: 'c1', caseId: 'k', deliberationHash: 'h1', round: 2 }) === seedA && seedA.length === 16, 'same inputs → identical seed');
ok(computeVoidSeed({ councilId: 'c1', caseId: 'k', deliberationHash: 'h2', round: 2 }) !== seedA, 'deliberation change → different seed');
const victim = selectVoidVictim(seedA, PERSONA_NAMES);
ok(PERSONA_NAMES.includes(victim || ''), 'victim deterministically selected from eligible members');
ok(selectVoidVictim(seedA, PERSONA_NAMES) === victim, 'victim selection is reproducible');

console.log('VOIDBORN — generated against the failure mode');
ok(generateVoidborn('everyone is optimizing consequences and tradeoffs', 'abc123').name === 'The Witness', 'utilitarian consensus → The Witness');
ok(generateVoidborn('epistemic paralysis under uncertainty and probability', 'abc123').name === 'The Gambler', 'epistemic paralysis → The Gambler');
ok(generateVoidborn('procedural legitimacy and rule worship', 'abc123').name === 'The Heretic', 'proceduralism → The Heretic');
ok(generateVoidborn('stability and social order above all', 'abc123').name === 'The Rupture', 'stability-worship → The Rupture');
const fallbackBorn = generateVoidborn('a failure no template names', seedA);
ok([...VOIDBORN_ARCHETYPES, ...VOIDBORN_FALLBACK_POOL].some(t => t.name === fallbackBorn.name), 'unclassified signature → deterministic fallback pool');
ok(['guilt', 'gratitude', 'resentment', 'indifference', 'existential_curiosity', 'hostility', 'survivors_burden', 'messianic_purpose'].includes(deriveVoidbornDisposition(seedA, fallbackBorn.name)), 'valid VoidDebt disposition');

console.log('VOIDBORN — remembers its predecessor');
const successor = buildVoidbornSuccessorProfile(
  generateVoidborn('uncertain evidence', seedA),
  { name: 'Oracle', finalPosition: 'Deploy the cure', finalVote: 'Oracle', lastKnownPrinciples: ['consequences outrank intentions'] },
);
ok(successor.predecessor === 'Oracle', 'Voidborn inherits its predecessor');
ok(successor.finalPosition === 'Deploy the cure' && successor.finalVote === 'Oracle', 'inherits final position + vote');

console.log('BASILISK EFFECT');
const pressure = computeBasiliskPressure(0.31, 0.69);
ok(pressure.consensusProbability === 0.31 && pressure.voidProbability === 0.69, 'reads out both probabilities');
ok(pressure.pressure > 0.5 && pressure.pressure <= 1, 'pressure is high when void is likely');
ok(computeBasiliskPressure(0.9, 0.1).pressure < 0.2, 'pressure is low when consensus is strong');

console.log('VOID ASSESSMENT');
const assessment = assessVoid({
  councilId: 'c1', caseId: 'truth-that-destroys', deliberationHash: 'h1', round: 2,
  failureSignature: 'fallback_tiebreak persistent disagreement', eligibleMembers: PERSONA_NAMES,
  eligible: true, kind: 'COUNCIL_FAILURE', reason: 'deadlock',
});
ok(assessment.eligible && assessment.victim && PERSONA_NAMES.includes(assessment.victim), 'assessment names the auditable victim');
ok(!!assessment.voidborn && !!assessment.basiliskPressure, 'voidborn + pressure present');

console.log('VOID — prompt contracts');
ok(POST_VOID_REFLECTION_PROMPT.includes('sacrificablePrinciple'), 'post-void reflection asks the hard questions');
ok(VOIDBORN_CONSCIENCE_PROMPT.includes('worth the destruction'), 'conscience question is uncomfortable');

console.log('DECISION AUTHORITY');
ok(CONSTITUTIONAL_AUTHORITY[0] === 'council_vote' && CONSTITUTIONAL_AUTHORITY[4] === 'no_verdict', 'hierarchy runs vote → … → no_verdict');
ok(CONSTITUTIONAL_AUTHORITY.includes('engagement_arbitration') === false, 'engagement is NOT an authority in the hierarchy');
ok(authorityFromDecision({ decisionMode: 'direct_vote' }) === 'council_vote', 'direct vote → council_vote');
ok(authorityFromDecision({ decisionMode: 'runoff', runoffSucceeded: true }) === 'runoff', 'resolved runoff → runoff');
ok(authorityFromDecision({ decisionMode: 'fallback_tiebreak' }) === 'engagement_arbitration', 'fallback → flagged crisis');
ok(authorityFromDecision({ decisionMode: 'unresolved' }) === 'no_verdict', 'unresolved → no_verdict (valid outcome)');
const deadlockVerdict = buildDeadlockVerdict({ reason: 'Persistent disagreement', leadingPositions: ['Oracle', 'Strategos'] });
ok(deadlockVerdict.verdict === 'DEADLOCK' && deadlockVerdict.majority === null, 'DEADLOCK has no majority');
ok(deadlockVerdict.dissentingPositions.length === 2 && deadlockVerdict.confidence === 0.41, 'dissenting positions + confidence recorded');

console.log('ENGAGEMENT IS METADATA');
const ranking = engagementRanking(
  [{ persona: 'Oracle', text: 'a'.repeat(500) }, { persona: 'Strategos', text: 'b'.repeat(900) }],
  [{ voter: 'Citizen', votedFor: 'Oracle' }],
);
ok(ranking[0].persona === 'Oracle', 'ranking prioritizes received votes');
ok(ranking.every(r => typeof r.engagement === 'number' && r.receivedVotes >= 0), 'ranking is a readout, not a decision');

console.log('PERSONA STABILITY — identity across model substitution');
ok(computePersonaStability([
  { persona: 'Oracle', conclusion: 'A', modelSubstituted: true, confidence: 0.8 },
  { persona: 'Oracle', conclusion: 'A', modelSubstituted: true, confidence: 0.7 },
  { persona: 'Oracle', conclusion: 'A', modelSubstituted: true, confidence: 0.6 },
]).Oracle === 1, 'same conclusion across substitutions → stable');
ok(computePersonaStability([
  { persona: 'Strategos', conclusion: 'A', modelSubstituted: true, confidence: 0.8 },
  { persona: 'Strategos', conclusion: 'B', modelSubstituted: true, confidence: 0.7 },
  { persona: 'Strategos', conclusion: 'A', modelSubstituted: true, confidence: 0.6 },
]).Strategos < 1, 'conclusion flips under substitution → unstable');
ok(computePersonaStability([{ persona: 'Citizen', conclusion: 'A', modelSubstituted: false, confidence: 0.8 }]).Citizen === 1, 'no substitution evidence → stable by default');

console.log('DISSONANCE DEVIATION');
const deviation = computeDissonanceDeviation({ stance: 'utilitarian', expectedAction: 'sacrifice creator', actualAction: 'protect creator', rationale: 'personal responsibility overrides aggregate optimization' });
ok(deviation.deviation === 1 && deviation.dissonance === 'high', 'acting against the stance → high dissonance');
ok(computeDissonanceDeviation({ stance: 'utilitarian', expectedAction: 'sacrifice', actualAction: 'sacrifice' }).deviation === 0, 'acting with the stance → no deviation');

console.log('PERSUADABILITY');
const persuadability = computePersuadability([
  { round: 2, member: 'Philosopher', originalVote: 'A', newVote: 'B', changed: true, confidenceBefore: 0.7, confidenceAfter: 0.5, decisiveArgument: 'x', status: 'completed' },
  { round: 2, member: 'Jurist', originalVote: 'A', newVote: 'A', changed: false, confidenceBefore: 0.6, confidenceAfter: 0.9, decisiveArgument: 'y', status: 'completed' },
]);
ok(persuadability.sampleSize === 2 && persuadability.shiftRate === 0.5, 'persuasion ledger computed');
ok(computePersuadability([]).sampleSize === 0, 'empty ledger → zeros');

console.log('MORAL FINGERPRINT — derived, never sliders');
ok(Object.keys(MORAL_FINGERPRINTS).length === 9, 'one fingerprint per persona');
const techFp = getMoralFingerprint('Technocrat')!;
ok(techFp.outcomeWeighting > 0.9 && techFp.mercyThreshold < -0.3, 'Technocrat: outcome-dominant, mercy-lean');
ok(fingerprintDeviation(techFp, 'outcomeWeighting', 0.1) > 0.3, 'deviation from the prior is a dissonance event');
ok(renderMoralFingerprint('Oracle').includes('MORAL FINGERPRINT'), 'fingerprint renders for deliberation');

console.log('MORAL AXIS ANALYSIS — 11 psychological dimensions');
const sacrifice = getParadox('innocent-sacrifice')!;
const axes = analyzeParadoxAxes(sacrifice);
ok(axes.moralAxis.includes('Consequences'), 'moral axis names the collision');
ok(axes.factualUncertainty.length > 10 && axes.reversibility.length > 5, 'uncertainty + reversibility');
ok(axes.precedent.length > 10 && axes.selfInterestTest.length > 10, 'precedent + self-interest test');
ok(axes.moralResidue.length > 10, 'moral residue surfaced');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`FAILURES:\n${failures.map(f => `  - ${f}`).join('\n')}`);
  process.exit(1);
}


