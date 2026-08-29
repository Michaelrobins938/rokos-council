/* eslint-disable */
// Tests for the social-cognitive ecology (Artifacts 1-4):
//   persona bible completeness · relationship seed integrity · dissonance
//   engine · relationship evolution · memory wiring.
// Run: node node_modules/esbuild/bin/esbuild --bundle tests/cognitive-engine.test.ts --format=esm --outfile=/tmp/cognitive.test.mjs && node /tmp/cognitive.test.mjs
import { PERSONA_BIBLE, PERSONA_NAMES, renderCognitiveSpec, renderSocialCognition, getSpec } from '../services/personaBible';
import {
  RELATIONSHIP_SEED,
  createInitialRelationshipStates,
  evolveRelationshipsFromSession,
  buildRelationshipContext,
} from '../services/relationshipGraph';
import {
  classifyMovement,
  buildDissonanceRecord,
  computeMovementBreakdown,
  computeInvariantStressDelta,
  deriveInvariantStatus,
  INVARIANT_STRESS_THREATENED,
} from '../services/dissonanceEngine';
import { categorizeTopic, buildMemoryContext } from '../services/councilMemoryService';
import type { CouncilResult, RelationshipArchetype, Round2Result } from '../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── PERSONA BIBLE COMPLETENESS ───────────────────────────────────────────────
console.log('PERSONA BIBLE — completeness');
ok(PERSONA_NAMES.length === 9, 'exactly 9 personas');
const ARCHETYPES: RelationshipArchetype[] = ['Rival', 'Mentor', 'Skeptic', 'Counterweight', 'Mirror', 'Ally', 'Adversary', 'Apprentice', 'Wildcard'];
for (const name of PERSONA_NAMES) {
  const spec = PERSONA_BIBLE[name];
  ok(!!spec, `${name}: present`);
  ok(spec.identity.archetype.length > 3, `${name}: archetype`);
  ok(spec.identity.ontology.length > 10, `${name}: ontology`);
  ok(spec.identity.epistemology.length > 5, `${name}: epistemology`);
  ok(spec.identity.theoryOfTruth.length > 10, `${name}: theory of truth`);
  ok(spec.identity.telos.length > 5, `${name}: telos`);
  ok(spec.psychology.coreValues.length >= 3, `${name}: core values`);
  ok(spec.psychology.strengths.length >= 2, `${name}: strengths`);
  ok(spec.psychology.biases.length >= 2, `${name}: biases`);
  ok(spec.psychology.blindSpots.length >= 1, `${name}: blind spots`);
  ok(spec.psychology.shadow.length > 5, `${name}: shadow`);
  ok(spec.psychology.contradiction.length > 10, `${name}: contradiction`);
  ok(spec.cognition.preferredEvidence.length > 5, `${name}: preferredEvidence`);
  ok(spec.cognition.defaultHeuristic.length > 5, `${name}: defaultHeuristic`);
  ok(spec.cognition.characteristicFailure.length > 5, `${name}: characteristicFailure (benchmarkable)`);
  ok(spec.cognition.invariants.length >= 3, `${name}: invariants (>= 3)`);
  ok(spec.social.trustModel.length > 5, `${name}: trust model`);
  ok(spec.social.statusBehavior.length > 5, `${name}: status behavior`);
}
const tech = getSpec('Technocrat')!;
ok(tech.cognition.preferredEvidence.toLowerCase().includes('measurable'), 'Technocrat: preferredEvidence = measurable outcomes');
ok(tech.cognition.characteristicFailure.toLowerCase().includes('metric'), 'Technocrat: characteristicFailure = metric substitution');

// ── RELATIONSHIP SEED INTEGRITY ──────────────────────────────────────────────
console.log('RELATIONSHIP GRAPH — seed integrity');
let edgeCount = 0;
for (const a of PERSONA_NAMES) {
  for (const b of PERSONA_NAMES) {
    if (a === b) continue;
    const e = RELATIONSHIP_SEED[a][b];
    ok(!!e, `${a}→${b}: edge present`);
    if (!e) continue;
    edgeCount++;
    ok(ARCHETYPES.includes(e.archetype), `${a}→${b}: valid archetype ${e.archetype}`);
    for (const key of ['trust', 'respect', 'ideologicalDistance', 'epistemicCompatibility', 'statusTension', 'predictionOfBehavior', 'allianceStrength'] as const) {
      ok(e[key] >= 0 && e[key] <= 1, `${a}→${b}: ${key} in [0,1]`);
    }
    ok(e.preferredArgumentStyle.length > 0, `${a}→${b}: argument style derived`);
    ok(e.failureTrigger.length > 0, `${a}→${b}: failure trigger derived`);
  }
}
ok(edgeCount === 72, '9×9 directed matrix complete (72 edges)');

// ── DISSONANCE ENGINE ────────────────────────────────────────────────────────
console.log('DISSONANCE ENGINE — movement classifier');
ok(classifyMovement(0.7, 0.7, false) === 'STABLE', 'no change, no confidence move → STABLE');
ok(classifyMovement(0.7, 0.58, false) === 'WEAKENED', 'held position, confidence dropped → WEAKENED');
ok(classifyMovement(0.58, 0.7, false) === 'REINFORCED', 'held position, confidence rose → REINFORCED');
ok(classifyMovement(0.72, 0.58, true) === 'SHIFTED', 'changed vote → SHIFTED (regardless of deltas)');
ok(classifyMovement(0.5, 0.5 + 0.01, false) === 'STABLE', 'sub-epsilon change → STABLE');

const rec = buildDissonanceRecord({
  round: 2, member: 'Philosopher', originalVote: 'Oracle', newVote: 'Jurist', changed: true,
  confidenceBefore: 0.72, confidenceAfter: 0.58, decisiveArgument: 'Jurist exposed contradiction', status: 'completed',
});
ok(rec.movement === 'SHIFTED', 'movement derived from ledger when model silent');
ok(rec.dissonance !== undefined && rec.dissonance >= 0 && rec.dissonance <= 1, 'dissonance derived and bounded');
ok(rec.trigger === undefined, 'model-reported trigger stays undefined when not reported');

const rec2 = buildDissonanceRecord({
  round: 2, member: 'Oracle', originalVote: 'Historian', newVote: 'Historian', changed: false,
  confidenceBefore: 0.6, confidenceAfter: 0.9, decisiveArgument: 'Historian precedent', status: 'completed',
}, { movement: 'INVALID' as never, dissonance: 1.7, trigger: 'Historian' });
ok(rec2.movement === 'REINFORCED', 'invalid model movement falls back to ledger-derived');
ok(rec2.dissonance === 1, 'model dissonance clamped to [0,1]');

const breakdown = computeMovementBreakdown([rec, rec2, buildDissonanceRecord({
  round: 2, member: 'Citizen', originalVote: 'Citizen', newVote: 'Citizen', changed: false,
  confidenceBefore: 0.5, confidenceAfter: 0.3, decisiveArgument: 'x', status: 'completed',
})]);
ok(breakdown.SHIFTED === 1 && breakdown.REINFORCED === 1 && breakdown.WEAKENED === 1, 'movement census counts correctly');

console.log('DISSONANCE ENGINE — invariants');
ok(computeInvariantStressDelta(rec) >= 1, 'SHIFTED with dissonance → invariant stress accrues');
ok(deriveInvariantStatus(INVARIANT_STRESS_THREATENED) === 'THREATENED', 'crossing threshold → INVARIANT THREATENED');
ok(deriveInvariantStatus(0) === 'INTACT', 'zero stress → INTACT');

// ── RELATIONSHIP EVOLUTION ───────────────────────────────────────────────────
console.log('RELATIONSHIP GRAPH — dynamic evolution');
const initial = createInitialRelationshipStates(1000);
const r2Minimal: Round2Result = {
  round: 2,
  leadingPositions: ['Historian', 'Oracle'],
  defenses: [{ position: 'Historian', defender: 'Historian', defense: 'a'.repeat(60), strongestObjection: 'b'.repeat(25), rebuttal: 'c'.repeat(25), status: 'completed' }],
  reassessments: [{
    round: 2, member: 'Philosopher', originalVote: 'Oracle', newVote: 'Historian', changed: true,
    confidenceBefore: 0.72, confidenceAfter: 0.58, decisiveArgument: 'Historian precedent', movement: 'SHIFTED',
    status: 'completed',
  }],
  tally: { Historian: 5, Oracle: 4 },
  winner: 'Historian',
  outcome: 'majority',
  majorityAchieved: true,
  stillTied: false,
  persuasion: { votesChanged: 1, retainedIncreasedConfidence: 0, retainedReducedConfidence: 0, retainedSameConfidence: 0, failedOrAbstained: 0, totalMembers: 1 },
};
const session: Pick<CouncilResult, 'opinions' | 'winner' | 'round2Result'> = {
  opinions: [
    { persona: 'Philosopher', text: 'x', vote: 'Oracle' },
    { persona: 'Oracle', text: 'x', vote: 'Historian' },
    { persona: 'Historian', text: 'x' },
    { persona: 'Strategos', text: 'x', vote: 'Historian' },
  ],
  winner: 'Historian',
  round2Result: r2Minimal,
};
const before = initial.Philosopher!.Historian;
const evolved = evolveRelationshipsFromSession(initial, session, 2000);
const after = evolved.Philosopher!.Historian;
ok(after.epistemicDebt > before.epistemicDebt, 'revision toward B → epistemicDebt up (B convinced A)');
ok(evolved.Philosopher!.Oracle!.successfulPredictions > initial.Philosopher!.Oracle!.successfulPredictions, 'peer endorsed winner → successfulPredictions up');
ok(evolved.Strategos!.Philosopher!.recentChallenges >= 1 && evolved.Philosopher!.Strategos!.recentChallenges >= 1, 'opposing endorsements → recentChallenges up (both directions)');
ok(after.trust > 0 && after.trust <= 1 && after.respect > 0 && after.respect <= 1, 'ratios stay clamped');

const betraySession: Pick<CouncilResult, 'opinions' | 'winner' | 'round2Result'> = {
  opinions: [
    { persona: 'Strategos', text: 'x', vote: 'Oracle' },
    { persona: 'Oracle', text: 'x', vote: 'Historian' },
  ],
  winner: 'Oracle',
  round2Result: {
    ...r2Minimal,
    reassessments: [{
      round: 2, member: 'Strategos', originalVote: 'Oracle', newVote: 'Historian', changed: true,
      confidenceBefore: 0.9, confidenceAfter: 0.4, decisiveArgument: 'Historian', status: 'completed',
    }],
  },
};
const bet1 = createInitialRelationshipStates(1000);
const bet2 = evolveRelationshipsFromSession(bet1, betraySession, 3000);
ok(bet2.Strategos!.Oracle!.betrayals >= 1, 'abandoning B\'s position in R2 → betrayals up');
ok(bet2.Oracle!.Strategos!.betrayals >= 1, 'abandoned party registers the betrayal too (social trust)');
ok(bet2.Strategos!.Oracle!.trust < bet1.Strategos!.Oracle!.trust, 'betrayal → trust down');

// ── PROMPT CONTEXT BUILDERS ──────────────────────────────────────────────────
console.log('CONTEXT BUILDERS');
const cog = renderCognitiveSpec('Technocrat');
ok(cog.includes('MEASURABLE OUTCOMES') || cog.includes('measurable'), 'deliberation block carries the epistemology');
ok(cog.includes('INVARIANTS'), 'deliberation block carries invariants');
const rel = buildRelationshipContext('Oracle', evolved);
ok(rel.includes('SOCIAL FIELD'), 'relationship block present');
ok(rel.includes('Historian'), 'relationship block lists a peer');
ok(rel.split('\n').length < 15, 'relationship block is bounded');
const soc = renderSocialCognition('Demagogue');
ok(soc.length > 20 && soc.length < 600, 'voting block is compact');

// ── MEMORY WIRING ────────────────────────────────────────────────────────────
console.log('MEMORY WIRING');
ok(categorizeTopic('Should we regulate artificial intelligence?') === 'AI & INTELLIGENCE', 'topic classification (AI)');
ok(categorizeTopic('Climate emissions policy') === 'ENVIRONMENT', 'topic classification (environment)');
ok(categorizeTopic('The color of the sky') === 'GENERAL', 'topic classification fallback');
ok(buildMemoryContext('Oracle') === '', 'no memory → empty context (safe in Node)');

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`FAILURES:\n${failures.map(f => `  - ${f}`).join('\n')}`);
  process.exit(1);
}


