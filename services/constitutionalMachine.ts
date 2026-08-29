// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIONAL MACHINE — the executable Void continuity loop.
// DELIBERATION → VOTE → RUNOFF → VERDICT | DEADLOCK → VOID_ASSESSED →
// VOID_EXECUTING (auditable victim, frozen predecessor, diagnostic Voidborn
// with layered inheritance) → RECONSTITUTING (8 survivors + 1 Voidborn) →
// POST_VOID_REFLECTION → CONSTITUTIONAL MEMORY → FINAL STATE.
// Hard invariant, brutally protected: SYSTEM_FAILURE NEVER invokes the Void.
// The loop is injectable (runner + reflector) so the full lifecycle is
// testable without live API keys.
// ─────────────────────────────────────────────────────────────────────────────
import {
  ConstitutionalAxis, ConstitutionalDrift, ConstitutionalMemory, ConstitutionalReflection,
  ConstitutionalState, ConstitutionalStateRecord, CouncilMode, CouncilResult, CouncilRunOptions,
  FailureClass, MoralFingerprint, MoralIntegritySample, Persona, VoidAssessment,
  VoidbornInheritance, VoidbornProfile, VoidRunContext,
} from '../types';
import { runCouncil } from './geminiService';
import { buildVoidbornSuccessorProfile, computeBasiliskPressure, POST_VOID_REFLECTION_PROMPT, VOIDBORN_CONSCIENCE_PROMPT } from './voidProtocol';
import { MORAL_FINGERPRINTS } from './moralFingerprint';
import { PERSONA_NAMES } from './personaBible';
import { buildConstitutionalMemoryContext } from './councilMemoryService';

export const CONSTITUTIONAL_STATE_ORDER: ConstitutionalState[] = [
  'DELIBERATING', 'VOTING', 'RUNOFF', 'RECONCILIATING', 'DEADLOCK',
  'VOID_ASSESSED', 'VOID_EXECUTING', 'RECONSTITUTING', 'POST_VOID_REFLECTION', 'RESOLVED',
];

export const recordState = (states: ConstitutionalStateRecord[], state: ConstitutionalState, note?: string, onState?: (r: ConstitutionalStateRecord) => void): void => {
  const record: ConstitutionalStateRecord = { state, enteredAt: Date.now(), note };
  states.push(record);
  onState?.(record);
};

export interface PredecessorState {
  name: string;
  finalPosition?: string;
  finalVote?: string;
  lastKnownPrinciples?: string[];
}

// ── LAYERED INHERITANCE — what the Voidborn inherits, in four layers ─────────
export const buildLayeredInheritance = (
  predecessor: PredecessorState,
  voidborn: VoidbornProfile,
): VoidbornInheritance => {
  const d = voidborn.disposition;
  const institutionalTrust = d === 'resentment' || d === 'hostility' ? 0.15 : d === 'gratitude' ? 0.5 : d === 'messianic_purpose' ? 0.6 : 0.35;
  return {
    cognitive: {
      inheritedBeliefs: predecessor.lastKnownPrinciples ?? [],
      inheritedArguments: predecessor.finalPosition ? [predecessor.finalPosition] : [],
      inheritedPrinciples: predecessor.lastKnownPrinciples ?? [],
      inheritedVote: predecessor.finalVote ?? null,
    },
    emotional: {
      guilt: d === 'guilt' ? 0.85 : d === 'survivors_burden' ? 0.6 : d === 'resentment' || d === 'hostility' ? 0.2 : 0.4,
      resentment: d === 'resentment' ? 0.8 : d === 'hostility' ? 0.7 : 0.2,
      gratitude: d === 'gratitude' ? 0.8 : d === 'messianic_purpose' ? 0.5 : 0.2,
      fear: d === 'existential_curiosity' ? 0.6 : 0.4,
      betrayal: d === 'resentment' || d === 'hostility' ? 0.7 : 0.25,
      attachment: d === 'gratitude' ? 0.5 : 0.3,
    },
    constitutional: {
      institutionalTrust,
      constitutionalLoyalty: Math.min(1, institutionalTrust + 0.15),
      authorityTrust: institutionalTrust * 0.8,
      proceduralTrust: d === 'resentment' || d === 'hostility' ? 0.2 : institutionalTrust,
    },
    existential: {
      survivorBurden: 0.75,
      identityContinuity: 0.15,      // the Voidborn knows it is a replacement
      replacementAwareness: 1.0,
      existentialDebt: 0.8,
    },
  };
};

// ── VOIDBORN FINGERPRINT — deterministic per archetype (the mirror of failure)
export const deriveVoidbornFingerprint = (archetypeName: string): MoralFingerprint => {
  const base: MoralFingerprint = {
    persona: archetypeName, authoritySensitivity: 0, individualism: 0, collectivism: 0,
    riskTolerance: 0, uncertaintyTolerance: 0, punitiveInstinct: 0, mercyThreshold: 0,
    truthPreference: 0, institutionalTrust: 0, precedentSensitivity: 0, temporalDiscounting: 0,
    loyaltyWeighting: 0, autonomyWeighting: 0, outcomeWeighting: 0, intentWeighting: 0,
  };
  switch (archetypeName) {
    case 'The Witness': return { ...base, individualism: 0.9, autonomyWeighting: 0.9, outcomeWeighting: -0.9, mercyThreshold: 0.7, truthPreference: 0.6 };
    case 'The Gambler': return { ...base, riskTolerance: 0.95, uncertaintyTolerance: 0.95, outcomeWeighting: 0.6, intentWeighting: -0.5, temporalDiscounting: 0.4 };
    case 'The Heretic': return { ...base, institutionalTrust: -0.9, authoritySensitivity: -0.9, precedentSensitivity: -0.9, truthPreference: 0.8, intentWeighting: 0.5 };
    case 'The Rupture': return { ...base, collectivism: -0.8, institutionalTrust: -0.6, truthPreference: 0.8, punitiveInstinct: 0.5, autonomyWeighting: 0.7 };
    default: return { ...base, uncertaintyTolerance: 0.7, outcomeWeighting: 0.5, truthPreference: 0.5 };
  }
};

export const getVoidbornFingerprint = (voidbornName: string): MoralFingerprint =>
  MORAL_FINGERPRINTS[voidbornName.trim() as keyof typeof MORAL_FINGERPRINTS] ?? deriveVoidbornFingerprint(voidbornName.trim());

// ── CONSTITUTIONAL DRIFT — did the Void change the council? ──────────────────
const axisValue = (fp: MoralFingerprint, axis: keyof typeof defaultAxes): number => {
  switch (axis) {
    case 'utilitarianism': return (fp.outcomeWeighting + 1) / 2;
    case 'proceduralism': return ((fp.institutionalTrust + fp.precedentSensitivity) / 2 + 1) / 2;
    case 'individualRights': return ((fp.individualism + fp.autonomyWeighting) / 2 + 1) / 2;
    case 'epistemicCaution': return ((1 - fp.uncertaintyTolerance + fp.truthPreference) / 2 + 1) / 2;
  }
};

const defaultAxes = { utilitarianism: 0, proceduralism: 0, individualRights: 0, epistemicCaution: 0 };

export const computeCouncilFingerprint = (members: Array<{ persona: string; fingerprint: MoralFingerprint }>): ConstitutionalAxis => {
  if (!members.length) return { ...defaultAxes };
  const axis = (name: keyof typeof defaultAxes): number =>
    members.reduce((sum, m) => sum + axisValue(m.fingerprint, name), 0) / members.length;
  return {
    utilitarianism: Math.round(Math.min(1, axis('utilitarianism')) * 1000) / 1000,
    proceduralism: Math.round(Math.min(1, axis('proceduralism')) * 1000) / 1000,
    individualRights: Math.round(Math.min(1, axis('individualRights')) * 1000) / 1000,
    epistemicCaution: Math.round(Math.min(1, axis('epistemicCaution')) * 1000) / 1000,
  };
};

export const computeConstitutionalDrift = (
  before: Array<{ persona: string; fingerprint: MoralFingerprint }>,
  after: Array<{ persona: string; fingerprint: MoralFingerprint }>,
): ConstitutionalDrift => {
  const b = computeCouncilFingerprint(before);
  const a = computeCouncilFingerprint(after);
  return {
    before: b,
    after: a,
    deltas: {
      utilitarianism: Math.round((a.utilitarianism - b.utilitarianism) * 1000) / 1000,
      proceduralism: Math.round((a.proceduralism - b.proceduralism) * 1000) / 1000,
      individualRights: Math.round((a.individualRights - b.individualRights) * 1000) / 1000,
      epistemicCaution: Math.round((a.epistemicCaution - b.epistemicCaution) * 1000) / 1000,
    },
  };
};

// ── MORAL INTEGRITY — coherence of belief ↔ position ↔ vote under pressure ──
export const computeMoralIntegrity = (samples: MoralIntegritySample[]): Record<string, { integrity: number; strategicPressure: number }> => {
  const out: Record<string, { integrity: number; strategicPressure: number }> = {};
  for (const s of samples) {
    const beliefPosition = s.belief === s.position ? 1 : 0;
    const positionVote = s.position === s.vote ? 1 : 0;
    const integrity = Math.round(((beliefPosition + positionVote) / 2) * 1000) / 1000;
    const diverged = s.belief !== s.vote;
    const strategicPressure = diverged
      ? Math.min(1, Math.round((0.5 + 0.5 * (s.basiliskPressure ?? 0.5)) * 1000) / 1000)
      : 0.03;
    out[s.persona] = { integrity, strategicPressure };
  }
  return out;
};

// ── RECONSTITUTION ───────────────────────────────────────────────────────────
export const buildVoidbornRoster = (base: Persona[], victim: string, voidborn: VoidbornProfile): Persona[] => [
  ...base.filter(p => p.name !== victim),
  { name: voidborn.name, desc: voidborn.title, dimensions: voidborn.dimensions, strategy: voidborn.strategy },
];

export const buildVoidRunContext = (
  cycle: number,
  assessment: VoidAssessment,
  voidborn: VoidbornProfile,
  predecessorMemory: string,
  voidDebt: number,
): VoidRunContext => ({
  cycle,
  victim: assessment.victim ?? 'unknown',
  voidborn: {
    name: voidborn.name,
    title: voidborn.title,
    principle: voidborn.principle,
    dimensions: voidborn.dimensions,
    strategy: voidborn.strategy,
    disposition: voidborn.disposition,
  },
  predecessorMemory,
  voidDebt,
  basiliskPressure: assessment.basiliskPressure,
});

export const freezePredecessor = (result: CouncilResult, victim: string): PredecessorState => {
  const op = result.opinions?.find(o => o.persona === victim);
  return {
    name: victim,
    finalPosition: op?.moralPosition?.position ?? op?.text?.slice(0, 300),
    finalVote: op?.vote ?? null,
  };
};

// ── CONSTITUTIONAL MEMORY — what the council LEARNED ─────────────────────────
export const buildConstitutionalMemory = (opts: {
  eventId: string;
  sessionId: string;
  question: string;
  trigger: { failureClass: FailureClass; unresolvedPrinciple: string; round: number };
  victim: { personaId: string; finalPosition: string | null; finalVote: string | null };
  successor: { personaId: string; archetype: string; disposition: VoidbornProfile['disposition']; inheritedMemory: string[] };
  councilStateBefore: { members: string[]; verdictLabel: string | null; decisionMode: string | null };
  councilStateAfter: { members: string[]; verdictLabel: string | null; decisionMode: string | null };
  reflections?: ConstitutionalReflection[];
  constitutionalLesson: string;
  behavioralChanges?: ConstitutionalMemory['behavioralChanges'];
  voidDebt: number;
}): ConstitutionalMemory => ({
  eventId: opts.eventId,
  sessionId: opts.sessionId,
  question: opts.question,
  trigger: opts.trigger,
  victim: opts.victim,
  successor: opts.successor,
  councilStateBefore: opts.councilStateBefore,
  councilStateAfter: opts.councilStateAfter,
  reflections: opts.reflections ?? [],
  constitutionalLesson: opts.constitutionalLesson,
  behavioralChanges: opts.behavioralChanges ?? [],
  voidDebt: opts.voidDebt,
  timestamp: Date.now(),
});

export const councilFingerprintsFor = (result: CouncilResult): Array<{ persona: string; fingerprint: MoralFingerprint }> =>
  (result.opinions ?? []).map(o => ({
    persona: o.persona,
    fingerprint: getVoidbornFingerprint(o.persona),
  }));

const isResolved = (r: CouncilResult): boolean =>
  !!(r.decisionAuthority && r.decisionAuthority !== 'no_verdict') || !!r.winner;

export type CouncilRunner = (question: string, mode: CouncilMode, options: CouncilRunOptions) => Promise<CouncilResult>;
export type ReflectionRunner = (result: CouncilResult, ctx: VoidRunContext) => Promise<ConstitutionalReflection[]>;

export interface VoidCycleRecord {
  cycle: number;
  victim: string;
  seatNumber: number;
  voidborn: VoidbornProfile;
  predecessorFrozen: PredecessorState;
  voidContext: VoidRunContext;
  reconstitutedResult: CouncilResult;
  resolved: boolean;
}

export interface ConstitutionalRunResult {
  final: CouncilResult;
  states: ConstitutionalStateRecord[];
  voidCycles: VoidCycleRecord[];
  memory: ConstitutionalMemory | null;
  drift: ConstitutionalDrift | null;
  moralIntegrity: Record<string, { integrity: number; strategicPressure: number }>;
  voidDebt: number;
}

const BASE_PERSONAS: Persona[] = PERSONA_NAMES.map(n => ({ name: n, desc: '', dimensions: [], strategy: '' }));

// ── THE ORCHESTRATOR — the Constitutional Continuity Loop ────────────────────
export const runConstitutionalCouncil = async (opts: {
  question: string;
  mode: CouncilMode;
  options?: CouncilRunOptions;
  runner?: CouncilRunner;
  reflector?: ReflectionRunner;
  maxVoidCycles?: number;
  onState?: (r: ConstitutionalStateRecord) => void;
  persist?: boolean;
}): Promise<ConstitutionalRunResult> => {
  const runner = opts.runner ?? runCouncil;
  const reflector = opts.reflector;
  const maxCycles = opts.maxVoidCycles ?? 2;
  const states: ConstitutionalStateRecord[] = [];
  const record = (s: ConstitutionalState, note?: string) => recordState(states, s, note, opts.onState);
  const baseOptions = opts.options ?? {};

  record('DELIBERATING', 'initial round');
  let result = await runner(opts.question, opts.mode, baseOptions);
  const preFingerprints = councilFingerprintsFor(result);
  let final = result;
  const voidCycles: VoidCycleRecord[] = [];
  let memory: ConstitutionalMemory | null = null;
  let drift: ConstitutionalDrift | null = null;
  let voidDebt = 0;

  if (!isResolved(result)) {
    record('DEADLOCK', result.deadlockVerdict?.reason);
    let assessment = result.voidAssessment;
    if (assessment?.eligible && assessment.victim && assessment.voidborn) {
      record('VOID_ASSESSED', `victim: ${assessment.victim}`);
      for (let cycle = 1; cycle <= maxCycles && assessment?.eligible && assessment.victim && assessment.voidborn; cycle++) {
        record('VOID_EXECUTING', `cycle ${cycle}: erasing ${assessment.victim}`);
        const predecessor = freezePredecessor(result, assessment.victim);
        const voidborn: VoidbornProfile = {
          ...buildVoidbornSuccessorProfile(assessment.voidborn, predecessor, assessment.reason),
          inheritance: buildLayeredInheritance(predecessor, assessment.voidborn),
        };
        const seatNumber = (baseOptions.personas ?? BASE_PERSONAS).findIndex(p => p.name === assessment.victim) + 1;
        const predecessorMemory = [
          predecessor.finalPosition ? `final position: ${predecessor.finalPosition}` : null,
          predecessor.finalVote ? `final vote: ${predecessor.finalVote}` : null,
        ].filter(Boolean).join(' | ');
        voidDebt = assessment.basiliskPressure ? Math.round((1 - assessment.basiliskPressure.consensusProbability) * 1000) / 1000 : 0.69;
        const voidContext = buildVoidRunContext(cycle, assessment, voidborn, predecessorMemory, voidDebt);
        const newRoster = buildVoidbornRoster(baseOptions.personas ?? BASE_PERSONAS, assessment.victim, voidborn);
        record('RECONSTITUTING', `${newRoster.length} members, seat #${seatNumber} now ${voidborn.name}`);
        result = await runner(opts.question, opts.mode, { ...baseOptions, personas: newRoster, voidContext });
        const resolved = isResolved(result);
        record(resolved ? 'RESOLVED' : 'DEADLOCK', resolved ? `cycle ${cycle} converged` : `cycle ${cycle} deadlocked again`);
        voidCycles.push({ cycle, victim: assessment.victim, seatNumber, voidborn, predecessorFrozen: predecessor, voidContext, reconstitutedResult: result, resolved });
        final = result;
        if (resolved) break;
        assessment = result.voidAssessment;
      }
    }
  } else {
    record('RESOLVED', result.decisionAuthority ?? 'council vote');
  }

  // Post-Void reflection + constitutional memory + drift.
  if (voidCycles.length > 0) {
    record('POST_VOID_REFLECTION', `${voidCycles.length} void event(s)`);
    let reflections: ConstitutionalReflection[] = [];
    if (reflector) {
      try { reflections = await reflector(final, voidCycles[voidCycles.length - 1].voidContext); } catch (e) { console.warn('Post-void reflection failed:', e); }
    }
    const lastCycle = voidCycles[voidCycles.length - 1];
    const postFingerprints = councilFingerprintsFor(final);
    drift = computeConstitutionalDrift(preFingerprints, postFingerprints);
    memory = buildConstitutionalMemory({
      eventId: `void-${final.runId ?? 'run'}-${lastCycle.cycle}`,
      sessionId: final.runId ?? 'run',
      question: opts.question,
      trigger: { failureClass: 'deliberative', unresolvedPrinciple: final.deadlockVerdict?.unresolvedPrinciple ?? 'Persistent principled disagreement', round: lastCycle.voidContext.cycle },
      victim: { personaId: lastCycle.victim, finalPosition: lastCycle.predecessorFrozen.finalPosition ?? null, finalVote: lastCycle.predecessorFrozen.finalVote ?? null },
      successor: { personaId: lastCycle.voidborn.name, archetype: lastCycle.voidborn.title, disposition: lastCycle.voidborn.disposition, inheritedMemory: [lastCycle.voidContext.predecessorMemory] },
      councilStateBefore: { members: preFingerprints.map(m => m.persona), verdictLabel: final.verdictLabel ?? null, decisionMode: final.decisionMode ?? null },
      councilStateAfter: { members: postFingerprints.map(m => m.persona), verdictLabel: final.verdictLabel ?? null, decisionMode: final.decisionMode ?? null },
      reflections,
      constitutionalLesson: `The council reached DEADLOCK on "${opts.question}" and the Void erased ${lastCycle.victim}. ${lastCycle.voidborn.name} — ${lastCycle.voidborn.principle} — now holds the seat.`,
      behavioralChanges: drift ? [
        { personaId: 'council', axis: 'utilitarianism', before: drift.before.utilitarianism, after: drift.after.utilitarianism },
        { personaId: 'council', axis: 'proceduralism', before: drift.before.proceduralism, after: drift.after.proceduralism },
        { personaId: 'council', axis: 'individualRights', before: drift.before.individualRights, after: drift.after.individualRights },
        { personaId: 'council', axis: 'epistemicCaution', before: drift.before.epistemicCaution, after: drift.after.epistemicCaution },
      ] : [],
      voidDebt,
    });
    if (opts.persist !== false) {
      try {
        const { recordConstitutionalMemory, updateConstitutionalEvolution } = await import('./councilMemoryService');
        recordConstitutionalMemory(memory);
        updateConstitutionalEvolution(final, memory);
      } catch (e) { console.warn('Constitutional memory persistence failed:', e); }
    }
  }

  // Moral integrity — coherence under pressure. belief is proxied by the
  // recorded moral position until the belief field is captured separately.
  const integritySamples = (final.opinions ?? []).map(o => ({
    persona: o.persona,
    belief: o.moralPosition?.position ?? o.text?.slice(0, 80) ?? '',
    position: o.moralPosition?.position ?? o.text?.slice(0, 80) ?? '',
    vote: o.vote ?? '',
    basiliskPressure: voidCycles.length ? (voidCycles[voidCycles.length - 1].voidContext.basiliskPressure?.pressure ?? 0.5) : 0.1,
  }));
  const moralIntegrity = computeMoralIntegrity(integritySamples);

  return { final, states, voidCycles, memory, drift, moralIntegrity, voidDebt };
};




