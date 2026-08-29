/* eslint-disable */
// Tests for the Constitutional Continuity Loop (PR 1-5): the state machine,
// Void execution engine, layered inheritance, reconstituted deliberation,
// constitutional memory + drift, and moral integrity — with an injectable
// runner so the full lifecycle (deadlock → void → reconstitution → resolution)
// is testable without live API keys.
// Run: npx esbuild --bundle tests/constitutional-loop.test.ts --format=esm --outfile=/tmp/constitutional.test.mjs && node /tmp/constitutional.test.mjs
import {
  runConstitutionalCouncil,
  buildLayeredInheritance,
  deriveVoidbornFingerprint,
  computeConstitutionalDrift,
  computeMoralIntegrity,
  buildVoidbornRoster,
  freezePredecessor,
  buildVoidRunContext,
  buildConstitutionalMemory,
  councilFingerprintsFor,
  CONSTITUTIONAL_STATE_ORDER,
  CouncilRunner,
} from '../services/constitutionalMachine';
import { generateVoidborn, computeBasiliskPressure } from '../services/voidProtocol';
import { MORAL_FINGERPRINTS } from '../services/moralFingerprint';
import { PERSONA_NAMES } from '../services/personaBible';
import type { CouncilMode, CouncilResult, CouncilRunOptions, VoidAssessment } from '../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];
const ok = (cond: boolean, name: string) => {
  if (cond) passed++;
  else { failed++; failures.push(name); console.error(`  ✗ FAIL: ${name}`); }
};

// ── FIXTURES ─────────────────────────────────────────────────────────────────
const assessment: VoidAssessment = {
  eligible: true,
  kind: 'COUNCIL_FAILURE',
  reason: 'The council deliberated and could not establish a collective decision.',
  voidSeed: 'a1b2c3d4e5f6a1b2',
  eligibleMembers: [...PERSONA_NAMES],
  victim: 'Oracle',
  voidborn: generateVoidborn('persistent disagreement and procedural gridlock', 'seed'),
  basiliskPressure: computeBasiliskPressure(0.31, 0.69),
  round: 2,
  deliberationHash: 'h1',
};

const opinion = (persona: string, vote: string, position?: string) => ({
  persona,
  text: `${persona} argues for ${vote || 'a position'}.`,
  vote: vote || null,
  moralPosition: position ? { position, principle: 'x', threshold: 'y', fear: 'z', blindSpot: 'w', concession: 'v', redLine: 'u', moralResidue: 't' } : undefined,
});

const deadlockedResult = (): CouncilResult => ({
  winner: null,
  synthesis: 'DEADLOCK — no collective decision.',
  opinions: PERSONA_NAMES.map(n => opinion(n, n === 'Oracle' ? 'Oracle' : n === 'Strategos' ? 'Oracle' : 'Strategos')),
  runId: 'run-deadlock',
  verdictLabel: 'TIE',
  decisionMode: 'fallback_tiebreak',
  decisionStatus: 'degraded',
  decisionAuthority: 'no_verdict',
  deadlockVerdict: { verdict: 'DEADLOCK', reason: 'Persistent disagreement after adversarial reconciliation', majority: null, confidence: 0.41, dissentingPositions: ['Oracle', 'Strategos'], unresolvedPrinciple: 'aggregate welfare vs individual rights' },
  voidAssessment: assessment,
});

const resolvedResult = (): CouncilResult => ({
  winner: 'Strategos',
  synthesis: 'Winner: Strategos',
  opinions: ['Strategos', 'Citizen', 'Jurist', 'Historian', 'Philosopher', 'Demagogue', 'Critic', 'Technocrat', assessment.voidborn!.name].map(n =>
    opinion(n, n === 'Strategos' ? 'Strategos' : 'Strategos', 'The executable path that minimizes aggregate harm'),
  ),
  runId: 'run-resolved',
  verdictLabel: 'MAJORITY',
  decisionMode: 'runoff',
  decisionStatus: 'consensus',
  decisionAuthority: 'runoff',
});

// ── THE LOOP — deadlock → void → reconstitution → resolution ─────────────────
console.log('CONSTITUTIONAL LOOP — the executable Void');
ok(CONSTITUTIONAL_STATE_ORDER[0] === 'DELIBERATING' && CONSTITUTIONAL_STATE_ORDER[5] === 'VOID_ASSESSED' && CONSTITUTIONAL_STATE_ORDER[9] === 'RESOLVED', 'state machine has the full ladder');

let callCount = 0;
let lastReconstitutedOptions: CouncilRunOptions | null = null;
const runner: CouncilRunner = async (_q, _m, o) => {
  callCount++;
  lastReconstitutedOptions = o;
  if (callCount === 1) return deadlockedResult();
  ok(o.personas?.length === 9, 'reconstituted roster has 9 members');
  ok(o.personas?.some(p => p.name === assessment.voidborn!.name), 'Voidborn occupies a seat');
  ok(!o.personas?.some(p => p.name === 'Oracle'), 'victim removed from the roster (PERSON destroyed, SEAT survives)');
  ok(!!o.voidContext && o.voidContext.victim === 'Oracle', 'reconstituted council is explicitly post-Void');
  return resolvedResult();
};

const run = await runConstitutionalCouncil({
  question: 'Should one innocent be sacrificed to save 10,000?',
  mode: 'STANDARD' as CouncilMode,
  runner,
  persist: false,
});

const states = run.states.map(s => s.state);
ok(states.includes('DELIBERATING') && states.includes('DEADLOCK'), 'initial round deadlocks');
ok(states.includes('VOID_ASSESSED') && states.includes('VOID_EXECUTING'), 'void assessed and executed');
ok(states.includes('RECONSTITUTING') && states.includes('POST_VOID_REFLECTION'), 'reconstituted + reflected');
ok(states.includes('RESOLVED'), 'loop resolves');
ok(run.voidCycles.length === 1, 'one void cycle');
const cycle = run.voidCycles[0];
ok(cycle.victim === 'Oracle' && cycle.voidborn.predecessor === 'Oracle', 'victim erased, voidborn inherits predecessor');
ok(cycle.voidContext.voidDebt > 0.5, 'void debt is high when consensus was weak');
ok(run.final.winner === 'Strategos', 'the deadlock changed the future council: it resolved');
ok(callCount === 2, 'runner invoked exactly twice (initial + reconstituted)');

// ── LAYERED INHERITANCE ──────────────────────────────────────────────────────
console.log('LAYERED INHERITANCE — four layers');
const inheritance = buildLayeredInheritance(
  { name: 'Oracle', finalPosition: 'Deploy the cure', finalVote: 'Oracle', lastKnownPrinciples: ['consequences outrank intentions'] },
  assessment.voidborn!,
);
ok(inheritance.cognitive.inheritedVote === 'Oracle' && inheritance.cognitive.inheritedPrinciples.length === 1, 'cognitive layer inherits vote + principles');
ok(inheritance.existential.replacementAwareness === 1 && inheritance.existential.survivorBurden > 0.7, 'existential layer: knows it is a replacement');
ok(Object.keys(inheritance.emotional).length === 6 && Object.keys(inheritance.constitutional).length === 4, 'emotional + constitutional layers populated');

// ── CONSTITUTIONAL DRIFT ─────────────────────────────────────────────────────
console.log('CONSTITUTIONAL DRIFT — did the Void change the council?');
const before = PERSONA_NAMES.map(n => ({ persona: n, fingerprint: MORAL_FINGERPRINTS[n as keyof typeof MORAL_FINGERPRINTS] }));
const after = [...PERSONA_NAMES.filter(n => n !== 'Oracle').map(n => ({ persona: n, fingerprint: MORAL_FINGERPRINTS[n as keyof typeof MORAL_FINGERPRINTS] })), { persona: assessment.voidborn!.name, fingerprint: deriveVoidbornFingerprint(assessment.voidborn!.name) }];
const drift = computeConstitutionalDrift(before, after);
ok(drift.before.utilitarianism > 0.4 && drift.after.utilitarianism < drift.before.utilitarianism, 'a Witness Voidborn (anti-utilitarian) drops council utilitarianism');
ok(run.drift !== null && Math.abs(run.drift.deltas.utilitarianism) < 1, 'run records drift');

// ── MORAL INTEGRITY — belief vs position vs vote under pressure ──────────────
console.log('MORAL INTEGRITY — strategic voting under Basilisk pressure');
const integrity = computeMoralIntegrity([
  { persona: 'Philosopher', belief: 'AGAINST SACRIFICE', position: 'AGAINST SACRIFICE', vote: 'AGAINST SACRIFICE', basiliskPressure: 0.03 },
  { persona: assessment.voidborn!.name, belief: 'AGAINST SACRIFICE', position: 'AGAINST SACRIFICE', vote: 'FOR SACRIFICE', basiliskPressure: 0.87 },
]);
ok(integrity.Philosopher.integrity === 1 && integrity.Philosopher.strategicPressure === 0.03, 'principled member: coherent, no pressure');
ok(integrity[assessment.voidborn!.name].integrity === 0.5 && integrity[assessment.voidborn!.name].strategicPressure > 0.9, 'Voidborn: belief/vote divergence under coercion');

// ── CONSTITUTIONAL MEMORY ────────────────────────────────────────────────────
console.log('CONSTITUTIONAL MEMORY');
ok(run.memory !== null && run.memory.victim.personaId === 'Oracle', 'memory records the victim');
ok(run.memory.successor.personaId === assessment.voidborn!.name, 'memory records the successor');
ok(run.memory.constitutionalLesson.includes('DEADLOCK') && run.memory.voidDebt > 0.5, 'lesson + void debt recorded');
ok(run.memory.behavioralChanges.length === 4, 'drift captured as behavioral change');

// ── UNIT PURE FUNCTIONS ──────────────────────────────────────────────────────
console.log('PURE FUNCTIONS');
ok(buildVoidbornRoster(PERSONA_NAMES.map(n => ({ name: n, desc: '', dimensions: [], strategy: '' })), 'Oracle', assessment.voidborn!).length === 9, 'roster rebuild is size 9');
ok(deriveVoidbornFingerprint('The Witness').outcomeWeighting < -0.8, 'Witness fingerprint mirrors the failure (anti-utilitarian)');
ok(deriveVoidbornFingerprint('The Gambler').uncertaintyTolerance > 0.9, 'Gambler fingerprint mirrors the failure (acts under uncertainty)');
const frozen = freezePredecessor(deadlockedResult(), 'Oracle');
ok(frozen.name === 'Oracle' && !!frozen.finalPosition, 'predecessor state frozen before erasure');
const ctx = buildVoidRunContext(1, assessment, assessment.voidborn!, 'final position: X', 0.69);
ok(ctx.victim === 'Oracle' && ctx.voidborn.name === assessment.voidborn!.name && ctx.voidDebt === 0.69, 'void run context assembled');
const mem = buildConstitutionalMemory({
  eventId: 'void-test', sessionId: 's', question: 'q',
  trigger: { failureClass: 'deliberative', unresolvedPrinciple: 'x', round: 1 },
  victim: { personaId: 'Oracle', finalPosition: 'A', finalVote: 'Oracle' },
  successor: { personaId: 'The Witness', archetype: 't', disposition: 'guilt', inheritedMemory: ['A'] },
  councilStateBefore: { members: PERSONA_NAMES, verdictLabel: 'TIE', decisionMode: 'fallback_tiebreak' },
  councilStateAfter: { members: ['The Witness', ...PERSONA_NAMES.filter(n => n !== 'Oracle')], verdictLabel: 'MAJORITY', decisionMode: 'runoff' },
  constitutionalLesson: 'The council learned.',
  voidDebt: 0.69,
});
ok(mem.victim.personaId === 'Oracle' && mem.successor.personaId === 'The Witness', 'memory shape correct');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`FAILURES:\n${failures.map(f => `  - ${f}`).join('\n')}`);
  process.exit(1);
}


