/* eslint-disable */
// Epistemic Topology tests: the artifact left behind after the debate.
// Covers the deadlock taxonomy (philosophical vs procedural), the brutally-
// honest verdict provenance, the dimensional (never single-number) epistemic
// assessment, argument-ontology extraction, premise survival across factions,
// and the cognitive-affinity influence graph.
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/epistemic-topology.test.ts --format=esm --outfile=/tmp/topo.test.mjs && node /tmp/topo.test.mjs
import {
  classifyDeadlockKind,
  buildVerdictProvenance,
  computeEpistemicDimensions,
  extractArgumentOntology,
  computePremiseSurvival,
  computeInfluenceEdges,
  buildEpistemicTopology,
} from '../services/epistemicTopology';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── 1. DEADLOCK TAXONOMY — 1/2 is a disagreement, 1/9 is a malfunction ───────
console.log('DEADLOCK TAXONOMY');
ok(classifyDeadlockKind({ validVotes: 2, expectedVoters: 2, round2Outcome: 'still_tied' }) === 'philosophical', '2/2 deadlock → philosophical (a tie among survivors)');
ok(classifyDeadlockKind({ validVotes: 2, expectedVoters: 8, round2Outcome: 'still_tied' }) === 'procedural', '2/8 deadlock → procedural (attrition masquerading as disagreement)');
ok(classifyDeadlockKind({ validVotes: 0, expectedVoters: 9, round2Outcome: 'unavailable' }) === 'unavailable', 'machine collapse → unavailable');
ok(classifyDeadlockKind({ validVotes: 8, expectedVoters: 8, round2Outcome: 'majority' }) === null, 'resolved runoff → no deadlock');
ok(classifyDeadlockKind({ validVotes: 8, expectedVoters: 9 }) === null, 'no runoff → no deadlock');

// ── 2. VERDICT PROVENANCE — the report run (Citizen via engagement metric) ───
console.log('VERDICT PROVENANCE — arbitration never masquerades as deliberation');
const reportProvenance = buildVerdictProvenance({
  decisionStatus: 'degraded',
  decisionMode: 'fallback_tiebreak',
  winner: 'Citizen',
  resolution: { method: 'engagement_metric', winner: 'Citizen', note: 'Round 2 did not produce a strict majority.' },
  validVotes: 2,
  expectedVoters: 9,
  runoffOccurred: true,
  round2Outcome: 'still_tied',
});
ok(reportProvenance.deliberativeMajority === null, 'NO deliberative majority was ever established');
ok(reportProvenance.runoff === 'deadlocked', 'runoff → deadlocked (not resolved)');
ok(reportProvenance.quorum === 'failed', '2/9 valid ballots → quorum FAILED');
ok(reportProvenance.participationRate === Math.round((2 / 9) * 1000) / 1000, 'participation rate = 2/9, not 2/2');
ok(reportProvenance.arbitration === 'engagement_metric' && reportProvenance.arbitratedSelection === 'Citizen', 'Citizen came from ARBITRATION, not the tally');
ok(reportProvenance.isDeliberative === false, 'the council did NOT decide Citizen — the machine arbitrated');
ok(reportProvenance.constitutionalStatus === 'arbitrated', 'constitutional status = ARBITRATED');

const majorityProvenance = buildVerdictProvenance({
  decisionStatus: 'consensus', decisionMode: 'direct_vote', winner: 'Oracle',
  resolution: { method: 'none', winner: 'Oracle', note: 'Strict majority.' },
  validVotes: 8, expectedVoters: 9, runoffOccurred: false,
});
ok(majorityProvenance.deliberativeMajority === 'Oracle' && majorityProvenance.isDeliberative === true, 'true majority → deliberative, isDeliberative=true');

// ── 3. EPISTEMIC DIMENSIONS — never one collapsed 87/100 ────────────────────
console.log('EPISTEMIC DIMENSIONS');
const degradedDims = computeEpistemicDimensions({
  validVotes: 2, expectedVoters: 9, winnerVotes: 1, decisionStatus: 'degraded',
});
ok(degradedDims.executionIntegrity === Math.round((2 / 9) * 1000) / 1000, 'execution integrity = 2/9 (the infrastructure truth)');
ok(degradedDims.consensusStrength === 0.5, 'consensus strength = 1/2 (the political truth, among survivors)');
ok(degradedDims.confidence === 'UNDETERMINED', 'attrition → UNDETERMINED, never an 87/100');

// A 2/2 "consensus" on 2/9 ballots is UNDETERMINED, not confirmed.
const hollow = computeEpistemicDimensions({ validVotes: 2, expectedVoters: 9, winnerVotes: 2, decisionStatus: 'consensus' });
ok(hollow.confidence === 'UNDETERMINED', '2/2 consensus on 2/9 ballots → UNDETERMINED (majority on a hollow denominator)');

const solid = computeEpistemicDimensions({ validVotes: 8, expectedVoters: 9, winnerVotes: 6, decisionStatus: 'consensus' });
ok(solid.confidence === 'CONFIRMED' && solid.executionIntegrity >= 0.6, '6/8 on 8/9 → CONFIRMED');

const contested = computeEpistemicDimensions({ validVotes: 8, expectedVoters: 9, winnerVotes: 3, decisionStatus: 'contested' });
ok(contested.confidence === 'CONTESTED', 'accepted plurality → CONTESTED, not confirmed');

// ── 4. ARGUMENT ONTOLOGY EXTRACTION ──────────────────────────────────────────
console.log('ARGUMENT ONTOLOGY EXTRACTION');
const criticText = 'Identity requires causal continuity. If the substrate is destroyed, the chain is broken. Therefore the simulation is not the same person. Destroying the original can constitute murder.';
const criticOnto = extractArgumentOntology(criticText, 'Critic');
ok(criticOnto.premises.some(p => p.includes('requires causal continuity')), 'premise extracted: identity requires causal continuity');
ok(criticOnto.assumptions.some(a => a.startsWith('If the substrate')), 'assumption extracted: if/then antecedent');
ok(criticOnto.inferences.some(i => i.includes('Therefore')), 'inference extracted: therefore');
ok(criticOnto.valueJudgments.some(v => v.includes('constitute murder')), 'value judgment extracted: murder');
ok(criticOnto.claims.length >= 4, 'all four sentences are claims');

const demagogueText = 'Identity consists in psychological structure and survival of the pattern. The upload preserves the pattern. The simulated Maya continues to suffer. Her suffering matters and must be honored.';
const demagogueOnto = extractArgumentOntology(demagogueText, 'Demagogue');
ok(demagogueOnto.premises.some(p => p.includes('consists in psychological structure')), 'premise extracted: identity consists in structure');
ok(demagogueOnto.premises.some(p => p.includes('survival of the pattern')), 'premise extracted: survival of the pattern');
ok(demagogueOnto.premises.some(p => p.includes('preserves the pattern')), 'premise extracted: preserves the pattern');
ok(demagogueOnto.valueJudgments.some(v => v.includes('matters and must')), 'value judgment extracted: matters + must');

// ── 5. PREMISE SURVIVAL — the hybrid ontology the vote cannot express ────────
console.log('PREMISE SURVIVAL');
const survival = computePremiseSurvival(
  [criticOnto, demagogueOnto],
  [
    { voter: 'Critic', votedFor: 'Philosopher' },
    { voter: 'Demagogue', votedFor: 'Citizen' },
  ],
);
const continuity = survival.clusters.find(c => c.topic === 'continuity');
ok(Boolean(continuity), 'continuity premise cluster exists');
ok(continuity && continuity.voices.includes('Critic') && continuity.voices.includes('Demagogue'), 'continuity premise voiced by BOTH factions');
ok(continuity && continuity.factions.length === 2, 'voices split across two factions');
ok(continuity && continuity.factionSpanning === true, 'continuity premise SURVIVED across factions');
ok(survival.hybridOntologyDetected === true, 'hybrid ontology detected — neither theory was rejected outright');

// ── 6. INFLUENCE GRAPH — cognitive-affinity edges ────────────────────────────
console.log('INFLUENCE GRAPH');
const edges = computeInfluenceEdges([
  { voter: 'Strategos', votedFor: 'Technocrat', confidence: 0.9 },
  { voter: 'Technocrat', votedFor: 'Strategos', confidence: 0.9 },
  { voter: 'Philosopher', votedFor: 'Critic', confidence: 0.8 },
  { voter: 'Citizen', votedFor: 'Demagogue', confidence: 0.7 },
]);
const strategosEdge = edges.find(e => e.voter === 'Strategos');
ok(strategosEdge && strategosEdge.mutual === true && strategosEdge.kind === 'alliance', 'Strategos↔Technocrat reciprocal → alliance');
const philosopherEdge = edges.find(e => e.voter === 'Philosopher');
ok(philosopherEdge && philosopherEdge.mutual === false && philosopherEdge.kind === 'deference', 'Philosopher→Critic one-way → deference');
ok(edges.length === 4, 'every valid vote becomes an edge');

// ── COMPOSITE — the report-run topology attached to a CouncilResult ─────────
console.log('COMPOSITE — report-run shape');
const composite = buildEpistemicTopology({
  opinions: [
    { persona: 'Critic', text: criticText, status: 'completed' } as any,
    { persona: 'Demagogue', text: demagogueText, status: 'completed' } as any,
  ],
  validVotes: [
    { voter: 'Strategos', votedFor: 'Technocrat', confidence: 0.9 },
    { voter: 'Technocrat', votedFor: 'Strategos', confidence: 0.9 },
  ],
  validVoteCount: 2,
  expectedVoters: 9,
  winnerVotes: 1,
  decisionStatus: 'degraded',
  decisionMode: 'fallback_tiebreak',
  winner: 'Citizen',
  resolution: { method: 'engagement_metric', winner: 'Citizen', note: 'x' },
  runoffOccurred: true,
  round2Outcome: 'still_tied',
});
ok(composite.deadlockKind === 'procedural', 'composite deadlock kind = procedural');
ok(composite.provenance.isDeliberative === false && composite.dimensions.confidence === 'UNDETERMINED', 'composite: arbitrated + undetermined');
ok(composite.influenceEdges.some(e => e.kind === 'alliance'), 'composite: alliance edge present');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAILURES:', failures.join('; '));
  process.exit(1);
}

