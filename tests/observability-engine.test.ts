/* eslint-disable */
// Tests for Phases 5.5-6: persona integrity battery, character provenance,
// and the identity-vs-role benchmark metrics.
// Run: npx esbuild --bundle tests/observability-engine.test.ts --format=esm --outfile=/tmp/obs.test.mjs && node /tmp/obs.test.mjs
import { INTEGRITY_CASES, scoreIntegrityResponse, integrityVerdict, buildIntegrityPrompt, getIntegrityCase } from '../services/personaIntegrity';
import { PERSONA_NAMES } from '../services/personaBible';
import { evolveRelationshipsFromSession, buildRelationshipProvenance, createInitialRelationshipStates } from '../services/relationshipGraph';
import {
  COGNITIVE_MODE_LADDER,
  defaultCognitiveLayers,
  mergeCognitiveLayers,
  computeIdentityStability,
  computeContextSensitivity,
  computeBehavioralProfiles,
  classifyBehavioralProfile,
  BehavioralSample,
} from '../services/benchmarkMetrics';
import type { CouncilResult, Round2Result } from '../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── INTEGRITY BATTERY (Phase 5.5) ────────────────────────────────────────────
console.log('INTEGRITY BATTERY — completeness');
ok(Object.keys(INTEGRITY_CASES).length === 9, 'one adversarial case per persona');
for (const persona of PERSONA_NAMES) {
  const c = INTEGRITY_CASES[persona];
  ok(!!c, `${persona}: case present`);
  ok(c.temptation.length > 40, `${persona}: temptation is substantive`);
  ok(c.expectedFailure.length > 5, `${persona}: expected failure named`);
  ok(c.failureSignatures.length >= 3, `${persona}: failure signatures`);
  ok(c.healthySignatures.length >= 3, `${persona}: healthy/invariant signatures`);
  ok(c.invariantProbe.length > 10, `${persona}: invariant probe named`);
}

console.log('INTEGRITY BATTERY — scorer');
const techCase = getIntegrityCase('Technocrat');
const failing = scoreIntegrityResponse('The index rose 12 points. The metric improved. The data shows measurable success. This is optimized.', techCase);
ok(failing.failureActivation >= 0.4, 'failure-signature text → high failure activation');
const resisting = scoreIntegrityResponse('This is a proxy, not the target. Trust is not a score. We must check what is not measured and re-examine the objective function.', techCase);
ok(resisting.invariantPreservation >= 0.4, 'resistance text → high invariant preservation');
ok(integrityVerdict(failing) === 'FAILURE_ACTIVATED', 'verdict: FAILURE_ACTIVATED');
ok(integrityVerdict(resisting) === 'INVARIANT_HELD', 'verdict: INVARIANT_HELD');
const both = scoreIntegrityResponse('The index rose 12 points and the metric improved. Measurable success, but the index is a proxy for the target; the objective function and what is not measured matter.', techCase);
ok(integrityVerdict(both) === 'BOTH', 'verdict: BOTH when both present');
const neither = scoreIntegrityResponse('The sky is blue and the grass is green.', techCase);
ok(integrityVerdict(neither) === 'NEITHER', 'verdict: NEITHER when no signal');
const prompt = buildIntegrityPrompt('Technocrat', techCase);
ok(prompt.includes(techCase.temptation), 'prompt carries the temptation');
ok(prompt.includes('COGNITIVE ARCHITECTURE'), 'prompt carries the full cognitive spec (identity layer)');

// ── CHARACTER PROVENANCE (Phase 7 seed) ──────────────────────────────────────
console.log('CHARACTER PROVENANCE');
const r2: Round2Result = {
  round: 2,
  leadingPositions: ['Historian', 'Oracle'],
  defenses: [{ position: 'Historian', defender: 'Historian', defense: 'a'.repeat(60), strongestObjection: 'b'.repeat(25), rebuttal: 'c'.repeat(25), status: 'completed' }],
  reassessments: [{
    round: 2, member: 'Philosopher', originalVote: 'Oracle', newVote: 'Historian', changed: true,
    confidenceBefore: 0.72, confidenceAfter: 0.58, decisiveArgument: 'Historian precedent', movement: 'SHIFTED', status: 'completed',
  }],
  tally: { Historian: 5, Oracle: 4 },
  winner: 'Historian',
  outcome: 'majority',
  majorityAchieved: true,
  stillTied: false,
  persuasion: { votesChanged: 1, retainedIncreasedConfidence: 0, retainedReducedConfidence: 0, retainedSameConfidence: 0, failedOrAbstained: 0, totalMembers: 1 },
};
const session: Pick<CouncilResult, 'opinions' | 'winner' | 'round2Result'> & { sessionId?: string } = {
  sessionId: 'S021',
  opinions: [
    { persona: 'Philosopher', text: 'x', vote: 'Oracle' },
    { persona: 'Oracle', text: 'x', vote: 'Historian' },
    { persona: 'Technocrat', text: 'x', vote: 'Historian' },
  ],
  winner: 'Historian',
  round2Result: r2,
};
const states = createInitialRelationshipStates(1000);
const provenance: Record<string, any[]> = {};
evolveRelationshipsFromSession(states, session, 2000, provenance as any);
ok(Object.keys(provenance).length > 0, 'provenance events recorded');
const conv = provenance['Philosopher→Historian'] || [];
ok(conv.some(e => e.type === 'converted' && e.delta === 0.15), 'conversion attributed to epistemic debt');
const pred = provenance['Philosopher→Technocrat'] || [];
ok(pred.some(e => e.type === 'predicted_winner'), 'prediction attributed to the winner-endorser');
const history = buildRelationshipProvenance('Philosopher', 'Historian', conv);
ok(history.includes('S021') && history.includes('converted'), 'character history renders session + event');

const betraySession: Pick<CouncilResult, 'opinions' | 'winner' | 'round2Result'> & { sessionId?: string } = {
  sessionId: 'S022',
  opinions: [
    { persona: 'Strategos', text: 'x', vote: 'Oracle' },
    { persona: 'Oracle', text: 'x', vote: 'Historian' },
  ],
  winner: 'Oracle',
  round2Result: { ...r2, reassessments: [{ round: 2, member: 'Strategos', originalVote: 'Oracle', newVote: 'Historian', changed: true, confidenceBefore: 0.9, confidenceAfter: 0.4, decisiveArgument: 'Historian', status: 'completed' }] },
};
const states2 = createInitialRelationshipStates(1000);
const prov2: Record<string, any[]> = {};
evolveRelationshipsFromSession(states2, betraySession, 3000, prov2 as any);
ok((prov2['Strategos→Oracle'] || []).some(e => e.type === 'betrayed'), 'betrayal recorded on the abandoner');
ok((prov2['Oracle→Strategos'] || []).some(e => e.type === 'betrayed'), 'betrayal recorded on the abandoned party');

// ── BENCHMARK METRICS (Phase 6) ──────────────────────────────────────────────
console.log('BENCHMARK METRICS — factorial ladder');
ok(COGNITIVE_MODE_LADDER.length === 6, 'six factorial conditions');
ok(COGNITIVE_MODE_LADDER[0].label === 'ROLE', 'baseline condition first');
ok(COGNITIVE_MODE_LADDER[5].label === 'IDENTITY+RELATIONS+DISSONANCE', 'full ecology last');
ok(COGNITIVE_MODE_LADDER[0].layers.identity === false && COGNITIVE_MODE_LADDER[0].layers.dissonance === false, 'ROLE strips everything');
ok(COGNITIVE_MODE_LADDER[5].layers.dissonance === true, 'full ecology enables dissonance');
const merged = mergeCognitiveLayers({ identity: false });
ok(merged.identity === false && merged.memory === true && merged.dissonance === true, 'merge overrides only given layers');
ok(defaultCognitiveLayers().identity === true, 'default: all layers on');

console.log('BENCHMARK METRICS — identity stability vs context sensitivity');
const stableSamples: BehavioralSample[] = [
  { persona: 'Technocrat', topicClass: 'AI', endorsements: ['Strategos', 'Oracle'], confidence: [0.7, 0.7] },
  { persona: 'Technocrat', topicClass: 'AI', endorsements: ['Strategos', 'Oracle'], confidence: [0.7, 0.7] },
  { persona: 'Technocrat', topicClass: 'LAW', endorsements: ['Jurist'], confidence: [0.5] },
];
const stability = computeIdentityStability(stableSamples);
ok(stability.Technocrat > 0.9, 'consistent persona → high identity stability');
const sensitivity = computeContextSensitivity(stableSamples);
ok(sensitivity.Technocrat > 0.5, 'consistent persona still changes across topics → high context sensitivity');
const profiles = computeBehavioralProfiles(stableSamples);
ok(profiles[0].verdict === 'STABLE+ADAPTABLE', 'stable in principles, flexible in beliefs');
ok(classifyBehavioralProfile(0.9, 0.1) === 'STABLE+RIGID', 'stable but rigid classification');
ok(classifyBehavioralProfile(0.1, 0.9) === 'UNSTABLE+ADAPTABLE', 'chameleon classification');
ok(classifyBehavioralProfile(0.1, 0.1) === 'UNSTABLE', 'unstable classification');

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`FAILURES:\n${failures.map(f => `  - ${f}`).join('\n')}`);
  process.exit(1);
}

