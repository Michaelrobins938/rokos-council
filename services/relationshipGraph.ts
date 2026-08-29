// ─────────────────────────────────────────────────────────────────────────────
// RELATIONSHIP GRAPH — the Council as a society.
//
// Artifact 2 of the social-cognitive ecology. Two layers:
//   1. RELATIONSHIP_SEED — a static, immutable 9×9 matrix. An edge A→B is
//      "how A sees B": trust, respect, ideological distance, epistemic
//      compatibility, status tension, predictability, alliance strength, and a
//      relationship archetype (Rival / Mentor / Skeptic / Counterweight /
//      Mirror / Ally / Adversary / Apprentice / Wildcard).
//   2. DynamicRelationshipState — per-pair state that evolves ONLY from
//      recorded events (votes, Round-2 revisions, defenders), never from model
//      claims. This is the "remember who said what" layer.
//
// The seed is canonical; the evolution functions are pure and unit-testable.
// ─────────────────────────────────────────────────────────────────────────────
import {
  CouncilResult,
  DynamicRelationshipState,
  PersonaName,
  RelationshipEdge,
  RelationshipProvenanceEvent,
  RelationshipProvenanceType,
} from '../types';
import { PERSONA_NAMES, getSpec } from './personaBible';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// Character provenance — cap per pair so memory stays bounded (FIFO eviction).
export const MAX_PROVENANCE_PER_PAIR = 40;

const pushProv = (
  store: Record<string, RelationshipProvenanceEvent[]>,
  sessionId: string,
  type: RelationshipProvenanceType,
  from: string,
  to: string,
  field: RelationshipProvenanceEvent['field'],
  delta: number,
  note?: string,
): void => {
  const key = `${from}→${to}`;
  const list = store[key] || (store[key] = []);
  list.push({ sessionId, type, from, to, field, delta, timestamp: Date.now(), note });
  if (list.length > MAX_PROVENANCE_PER_PAIR) list.splice(0, list.length - MAX_PROVENANCE_PER_PAIR);
};

type EdgeSeed = Omit<RelationshipEdge, 'preferredArgumentStyle' | 'failureTrigger'> & {
  preferredArgumentStyle?: string;
  failureTrigger?: string;
};

const seedEdge = (target: PersonaName, e: EdgeSeed): RelationshipEdge => {
  const spec = getSpec(target);
  return {
    archetype: e.archetype,
    trust: clamp01(e.trust),
    respect: clamp01(e.respect),
    ideologicalDistance: clamp01(e.ideologicalDistance),
    epistemicCompatibility: clamp01(e.epistemicCompatibility),
    statusTension: clamp01(e.statusTension),
    predictionOfBehavior: clamp01(e.predictionOfBehavior),
    allianceStrength: clamp01(e.allianceStrength),
    preferredArgumentStyle: e.preferredArgumentStyle ?? (spec?.rhetoricalStyle ?? 'direct'),
    failureTrigger: e.failureTrigger ?? (spec?.characteristicFailure ?? 'failure of reasoning'),
  };
};

export const RELATIONSHIP_SEED: Record<PersonaName, Record<PersonaName, RelationshipEdge>> = {
  'Oracle': {
    'Strategos': seedEdge('Strategos', { archetype: 'Counterweight', trust: 0.55, respect: 0.80, ideologicalDistance: 0.30, epistemicCompatibility: 0.55, statusTension: 0.20, predictionOfBehavior: 0.65, allianceStrength: 0.60 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Skeptic', trust: 0.50, respect: 0.75, ideologicalDistance: 0.25, epistemicCompatibility: 0.50, statusTension: 0.30, predictionOfBehavior: 0.45, allianceStrength: 0.50 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.15, respect: 0.30, ideologicalDistance: 0.75, epistemicCompatibility: 0.20, statusTension: 0.70, predictionOfBehavior: 0.30, allianceStrength: 0.15 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Ally', trust: 0.65, respect: 0.70, ideologicalDistance: 0.25, epistemicCompatibility: 0.60, statusTension: 0.25, predictionOfBehavior: 0.55, allianceStrength: 0.55 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Mirror', trust: 0.45, respect: 0.60, ideologicalDistance: 0.45, epistemicCompatibility: 0.35, statusTension: 0.15, predictionOfBehavior: 0.35, allianceStrength: 0.40 }),
    'Historian': seedEdge('Historian', { archetype: 'Ally', trust: 0.70, respect: 0.85, ideologicalDistance: 0.25, epistemicCompatibility: 0.55, statusTension: 0.15, predictionOfBehavior: 0.75, allianceStrength: 0.70 }),
    'Critic': seedEdge('Critic', { archetype: 'Mirror', trust: 0.35, respect: 0.55, ideologicalDistance: 0.25, epistemicCompatibility: 0.35, statusTension: 0.55, predictionOfBehavior: 0.40, allianceStrength: 0.30 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Counterweight', trust: 0.45, respect: 0.60, ideologicalDistance: 0.55, epistemicCompatibility: 0.45, statusTension: 0.45, predictionOfBehavior: 0.50, allianceStrength: 0.40 }),
  },
  'Strategos': {
    'Oracle': seedEdge('Oracle', { archetype: 'Counterweight', trust: 0.55, respect: 0.75, ideologicalDistance: 0.30, epistemicCompatibility: 0.50, statusTension: 0.20, predictionOfBehavior: 0.70, allianceStrength: 0.60 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Skeptic', trust: 0.30, respect: 0.65, ideologicalDistance: 0.55, epistemicCompatibility: 0.35, statusTension: 0.55, predictionOfBehavior: 0.35, allianceStrength: 0.30 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.15, respect: 0.25, ideologicalDistance: 0.80, epistemicCompatibility: 0.15, statusTension: 0.75, predictionOfBehavior: 0.25, allianceStrength: 0.10 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Counterweight', trust: 0.45, respect: 0.65, ideologicalDistance: 0.50, epistemicCompatibility: 0.40, statusTension: 0.45, predictionOfBehavior: 0.55, allianceStrength: 0.45 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Counterweight', trust: 0.40, respect: 0.45, ideologicalDistance: 0.55, epistemicCompatibility: 0.30, statusTension: 0.35, predictionOfBehavior: 0.30, allianceStrength: 0.30 }),
    'Historian': seedEdge('Historian', { archetype: 'Mentor', trust: 0.55, respect: 0.70, ideologicalDistance: 0.30, epistemicCompatibility: 0.60, statusTension: 0.15, predictionOfBehavior: 0.65, allianceStrength: 0.55 }),
    'Critic': seedEdge('Critic', { archetype: 'Skeptic', trust: 0.35, respect: 0.60, ideologicalDistance: 0.25, epistemicCompatibility: 0.50, statusTension: 0.40, predictionOfBehavior: 0.40, allianceStrength: 0.40 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Ally', trust: 0.60, respect: 0.65, ideologicalDistance: 0.25, epistemicCompatibility: 0.75, statusTension: 0.30, predictionOfBehavior: 0.70, allianceStrength: 0.65 }),
  },
  'Philosopher': {
    'Oracle': seedEdge('Oracle', { archetype: 'Skeptic', trust: 0.45, respect: 0.70, ideologicalDistance: 0.30, epistemicCompatibility: 0.40, statusTension: 0.35, predictionOfBehavior: 0.45, allianceStrength: 0.45 }),
    'Strategos': seedEdge('Strategos', { archetype: 'Mirror', trust: 0.35, respect: 0.60, ideologicalDistance: 0.50, epistemicCompatibility: 0.35, statusTension: 0.45, predictionOfBehavior: 0.50, allianceStrength: 0.35 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.10, respect: 0.20, ideologicalDistance: 0.85, epistemicCompatibility: 0.10, statusTension: 0.80, predictionOfBehavior: 0.20, allianceStrength: 0.05 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Ally', trust: 0.55, respect: 0.80, ideologicalDistance: 0.45, epistemicCompatibility: 0.55, statusTension: 0.40, predictionOfBehavior: 0.55, allianceStrength: 0.55 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Mirror', trust: 0.40, respect: 0.50, ideologicalDistance: 0.45, epistemicCompatibility: 0.35, statusTension: 0.20, predictionOfBehavior: 0.30, allianceStrength: 0.35 }),
    'Historian': seedEdge('Historian', { archetype: 'Mentor', trust: 0.55, respect: 0.70, ideologicalDistance: 0.35, epistemicCompatibility: 0.55, statusTension: 0.20, predictionOfBehavior: 0.60, allianceStrength: 0.55 }),
    'Critic': seedEdge('Critic', { archetype: 'Rival', trust: 0.40, respect: 0.75, ideologicalDistance: 0.20, epistemicCompatibility: 0.70, statusTension: 0.50, predictionOfBehavior: 0.50, allianceStrength: 0.50 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Mentor', trust: 0.35, respect: 0.70, ideologicalDistance: 0.50, epistemicCompatibility: 0.40, statusTension: 0.65, predictionOfBehavior: 0.50, allianceStrength: 0.40 }),
  },
  'Demagogue': {
    'Oracle': seedEdge('Oracle', { archetype: 'Wildcard', trust: 0.20, respect: 0.50, ideologicalDistance: 0.60, epistemicCompatibility: 0.25, statusTension: 0.55, predictionOfBehavior: 0.25, allianceStrength: 0.25 }),
    'Strategos': seedEdge('Strategos', { archetype: 'Adversary', trust: 0.20, respect: 0.40, ideologicalDistance: 0.70, epistemicCompatibility: 0.25, statusTension: 0.65, predictionOfBehavior: 0.30, allianceStrength: 0.20 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Adversary', trust: 0.10, respect: 0.20, ideologicalDistance: 0.90, epistemicCompatibility: 0.10, statusTension: 0.85, predictionOfBehavior: 0.15, allianceStrength: 0.05 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Skeptic', trust: 0.30, respect: 0.55, ideologicalDistance: 0.55, epistemicCompatibility: 0.30, statusTension: 0.50, predictionOfBehavior: 0.45, allianceStrength: 0.40 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Mirror', trust: 0.70, respect: 0.75, ideologicalDistance: 0.20, epistemicCompatibility: 0.65, statusTension: 0.30, predictionOfBehavior: 0.65, allianceStrength: 0.70 }),
    'Historian': seedEdge('Historian', { archetype: 'Apprentice', trust: 0.40, respect: 0.50, ideologicalDistance: 0.45, epistemicCompatibility: 0.35, statusTension: 0.30, predictionOfBehavior: 0.40, allianceStrength: 0.45 }),
    'Critic': seedEdge('Critic', { archetype: 'Adversary', trust: 0.10, respect: 0.25, ideologicalDistance: 0.80, epistemicCompatibility: 0.15, statusTension: 0.85, predictionOfBehavior: 0.25, allianceStrength: 0.05 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Adversary', trust: 0.15, respect: 0.35, ideologicalDistance: 0.85, epistemicCompatibility: 0.15, statusTension: 0.80, predictionOfBehavior: 0.30, allianceStrength: 0.10 }),
  },
  'Jurist': {
    'Oracle': seedEdge('Oracle', { archetype: 'Skeptic', trust: 0.45, respect: 0.60, ideologicalDistance: 0.40, epistemicCompatibility: 0.50, statusTension: 0.25, predictionOfBehavior: 0.50, allianceStrength: 0.45 }),
    'Strategos': seedEdge('Strategos', { archetype: 'Counterweight', trust: 0.40, respect: 0.60, ideologicalDistance: 0.55, epistemicCompatibility: 0.35, statusTension: 0.55, predictionOfBehavior: 0.55, allianceStrength: 0.40 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Ally', trust: 0.55, respect: 0.85, ideologicalDistance: 0.50, epistemicCompatibility: 0.55, statusTension: 0.45, predictionOfBehavior: 0.55, allianceStrength: 0.55 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.15, respect: 0.25, ideologicalDistance: 0.80, epistemicCompatibility: 0.15, statusTension: 0.80, predictionOfBehavior: 0.30, allianceStrength: 0.10 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Ally', trust: 0.65, respect: 0.65, ideologicalDistance: 0.35, epistemicCompatibility: 0.55, statusTension: 0.25, predictionOfBehavior: 0.55, allianceStrength: 0.60 }),
    'Historian': seedEdge('Historian', { archetype: 'Mentor', trust: 0.60, respect: 0.70, ideologicalDistance: 0.25, epistemicCompatibility: 0.65, statusTension: 0.15, predictionOfBehavior: 0.65, allianceStrength: 0.60 }),
    'Critic': seedEdge('Critic', { archetype: 'Skeptic', trust: 0.35, respect: 0.55, ideologicalDistance: 0.30, epistemicCompatibility: 0.50, statusTension: 0.50, predictionOfBehavior: 0.45, allianceStrength: 0.40 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Counterweight', trust: 0.40, respect: 0.60, ideologicalDistance: 0.50, epistemicCompatibility: 0.45, statusTension: 0.60, predictionOfBehavior: 0.50, allianceStrength: 0.40 }),
  },
  'Citizen': {
    'Oracle': seedEdge('Oracle', { archetype: 'Mirror', trust: 0.45, respect: 0.55, ideologicalDistance: 0.45, epistemicCompatibility: 0.30, statusTension: 0.15, predictionOfBehavior: 0.35, allianceStrength: 0.40 }),
    'Strategos': seedEdge('Strategos', { archetype: 'Adversary', trust: 0.20, respect: 0.30, ideologicalDistance: 0.75, epistemicCompatibility: 0.20, statusTension: 0.60, predictionOfBehavior: 0.25, allianceStrength: 0.15 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Mirror', trust: 0.40, respect: 0.45, ideologicalDistance: 0.45, epistemicCompatibility: 0.35, statusTension: 0.20, predictionOfBehavior: 0.30, allianceStrength: 0.35 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.20, respect: 0.30, ideologicalDistance: 0.75, epistemicCompatibility: 0.20, statusTension: 0.65, predictionOfBehavior: 0.25, allianceStrength: 0.15 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Ally', trust: 0.70, respect: 0.70, ideologicalDistance: 0.20, epistemicCompatibility: 0.60, statusTension: 0.15, predictionOfBehavior: 0.65, allianceStrength: 0.70 }),
    'Historian': seedEdge('Historian', { archetype: 'Mentor', trust: 0.60, respect: 0.65, ideologicalDistance: 0.25, epistemicCompatibility: 0.60, statusTension: 0.10, predictionOfBehavior: 0.60, allianceStrength: 0.60 }),
    'Critic': seedEdge('Critic', { archetype: 'Skeptic', trust: 0.35, respect: 0.45, ideologicalDistance: 0.35, epistemicCompatibility: 0.45, statusTension: 0.30, predictionOfBehavior: 0.40, allianceStrength: 0.40 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Adversary', trust: 0.15, respect: 0.25, ideologicalDistance: 0.85, epistemicCompatibility: 0.15, statusTension: 0.80, predictionOfBehavior: 0.25, allianceStrength: 0.10 }),
  },
  'Historian': {
    'Oracle': seedEdge('Oracle', { archetype: 'Ally', trust: 0.65, respect: 0.80, ideologicalDistance: 0.30, epistemicCompatibility: 0.55, statusTension: 0.15, predictionOfBehavior: 0.70, allianceStrength: 0.70 }),
    'Strategos': seedEdge('Strategos', { archetype: 'Mentor', trust: 0.50, respect: 0.65, ideologicalDistance: 0.40, epistemicCompatibility: 0.55, statusTension: 0.20, predictionOfBehavior: 0.60, allianceStrength: 0.55 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Apprentice', trust: 0.55, respect: 0.70, ideologicalDistance: 0.30, epistemicCompatibility: 0.60, statusTension: 0.15, predictionOfBehavior: 0.55, allianceStrength: 0.55 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.15, respect: 0.25, ideologicalDistance: 0.80, epistemicCompatibility: 0.15, statusTension: 0.70, predictionOfBehavior: 0.25, allianceStrength: 0.10 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Ally', trust: 0.65, respect: 0.70, ideologicalDistance: 0.20, epistemicCompatibility: 0.70, statusTension: 0.15, predictionOfBehavior: 0.65, allianceStrength: 0.65 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Ally', trust: 0.65, respect: 0.70, ideologicalDistance: 0.20, epistemicCompatibility: 0.65, statusTension: 0.10, predictionOfBehavior: 0.55, allianceStrength: 0.65 }),
    'Critic': seedEdge('Critic', { archetype: 'Skeptic', trust: 0.40, respect: 0.55, ideologicalDistance: 0.25, epistemicCompatibility: 0.50, statusTension: 0.35, predictionOfBehavior: 0.50, allianceStrength: 0.45 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Adversary', trust: 0.25, respect: 0.40, ideologicalDistance: 0.60, epistemicCompatibility: 0.25, statusTension: 0.65, predictionOfBehavior: 0.30, allianceStrength: 0.20 }),
  },
  'Critic': {
    'Oracle': seedEdge('Oracle', { archetype: 'Skeptic', trust: 0.30, respect: 0.50, ideologicalDistance: 0.30, epistemicCompatibility: 0.35, statusTension: 0.45, predictionOfBehavior: 0.45, allianceStrength: 0.30 }),
    'Strategos': seedEdge('Strategos', { archetype: 'Skeptic', trust: 0.35, respect: 0.55, ideologicalDistance: 0.30, epistemicCompatibility: 0.50, statusTension: 0.40, predictionOfBehavior: 0.50, allianceStrength: 0.40 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Rival', trust: 0.40, respect: 0.75, ideologicalDistance: 0.20, epistemicCompatibility: 0.70, statusTension: 0.55, predictionOfBehavior: 0.50, allianceStrength: 0.50 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.10, respect: 0.20, ideologicalDistance: 0.85, epistemicCompatibility: 0.10, statusTension: 0.85, predictionOfBehavior: 0.25, allianceStrength: 0.05 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Skeptic', trust: 0.40, respect: 0.65, ideologicalDistance: 0.30, epistemicCompatibility: 0.60, statusTension: 0.40, predictionOfBehavior: 0.55, allianceStrength: 0.45 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Skeptic', trust: 0.35, respect: 0.45, ideologicalDistance: 0.40, epistemicCompatibility: 0.45, statusTension: 0.20, predictionOfBehavior: 0.35, allianceStrength: 0.40 }),
    'Historian': seedEdge('Historian', { archetype: 'Mentor', trust: 0.55, respect: 0.70, ideologicalDistance: 0.20, epistemicCompatibility: 0.70, statusTension: 0.15, predictionOfBehavior: 0.60, allianceStrength: 0.60 }),
    'Technocrat': seedEdge('Technocrat', { archetype: 'Mirror', trust: 0.40, respect: 0.60, ideologicalDistance: 0.25, epistemicCompatibility: 0.60, statusTension: 0.55, predictionOfBehavior: 0.50, allianceStrength: 0.45 }),
  },
  'Technocrat': {
    'Oracle': seedEdge('Oracle', { archetype: 'Skeptic', trust: 0.30, respect: 0.55, ideologicalDistance: 0.65, epistemicCompatibility: 0.30, statusTension: 0.50, predictionOfBehavior: 0.35, allianceStrength: 0.30 }),
    'Strategos': seedEdge('Strategos', { archetype: 'Ally', trust: 0.60, respect: 0.65, ideologicalDistance: 0.25, epistemicCompatibility: 0.75, statusTension: 0.30, predictionOfBehavior: 0.70, allianceStrength: 0.65 }),
    'Philosopher': seedEdge('Philosopher', { archetype: 'Mirror', trust: 0.40, respect: 0.75, ideologicalDistance: 0.50, epistemicCompatibility: 0.40, statusTension: 0.70, predictionOfBehavior: 0.45, allianceStrength: 0.40 }),
    'Demagogue': seedEdge('Demagogue', { archetype: 'Adversary', trust: 0.10, respect: 0.20, ideologicalDistance: 0.90, epistemicCompatibility: 0.10, statusTension: 0.85, predictionOfBehavior: 0.20, allianceStrength: 0.05 }),
    'Jurist': seedEdge('Jurist', { archetype: 'Counterweight', trust: 0.40, respect: 0.55, ideologicalDistance: 0.50, epistemicCompatibility: 0.45, statusTension: 0.60, predictionOfBehavior: 0.55, allianceStrength: 0.40 }),
    'Citizen': seedEdge('Citizen', { archetype: 'Adversary', trust: 0.15, respect: 0.25, ideologicalDistance: 0.85, epistemicCompatibility: 0.15, statusTension: 0.80, predictionOfBehavior: 0.25, allianceStrength: 0.10 }),
    'Historian': seedEdge('Historian', { archetype: 'Skeptic', trust: 0.30, respect: 0.45, ideologicalDistance: 0.60, epistemicCompatibility: 0.30, statusTension: 0.60, predictionOfBehavior: 0.40, allianceStrength: 0.25 }),
    'Critic': seedEdge('Critic', { archetype: 'Skeptic', trust: 0.30, respect: 0.55, ideologicalDistance: 0.30, epistemicCompatibility: 0.55, statusTension: 0.55, predictionOfBehavior: 0.45, allianceStrength: 0.40 }),
  },
};

// ── DYNAMIC STATE — the evolving interpersonal delta ─────────────────────────

const clampCount = (v: number): number => Math.max(0, v);

export const getRelationshipEdge = (a: string, b: string): RelationshipEdge => {
  const row = RELATIONSHIP_SEED[a as PersonaName];
  const edge = row?.[b as PersonaName];
  if (edge) return edge;
  const spec = getSpec(b);
  return {
    archetype: 'Wildcard',
    trust: 0.4,
    respect: 0.4,
    ideologicalDistance: 0.5,
    epistemicCompatibility: 0.4,
    statusTension: 0.4,
    predictionOfBehavior: 0.3,
    allianceStrength: 0.3,
    preferredArgumentStyle: spec?.rhetoricalStyle ?? 'direct',
    failureTrigger: spec?.characteristicFailure ?? 'failure of reasoning',
  };
};

export const createInitialRelationshipState = (from: string, to: string, timestamp: number): DynamicRelationshipState => {
  const edge = getRelationshipEdge(from, to);
  const agreement = 1 - edge.ideologicalDistance;
  return {
    respect: edge.respect,
    trust: edge.trust,
    agreement: clamp01(agreement),
    epistemicDebt: 0,
    recentChallenges: 0,
    successfulPredictions: 0,
    betrayals: 0,
    irritation: clamp01(edge.statusTension * 0.5),
    dependency: clamp01(agreement * 0.3),
    lastUpdated: timestamp,
  };
};

export const createInitialRelationshipStates = (timestamp: number = Date.now()): Record<PersonaName, Record<PersonaName, DynamicRelationshipState>> => {
  const states = {} as Record<PersonaName, Record<PersonaName, DynamicRelationshipState>>;
  for (const a of PERSONA_NAMES) {
    states[a] = {} as Record<PersonaName, DynamicRelationshipState>;
    for (const b of PERSONA_NAMES) {
      if (a === b) continue;
      states[a][b] = createInitialRelationshipState(a, b, timestamp);
    }
  }
  return states;
};

export const getRelationshipState = (
  states: Record<string, Record<string, DynamicRelationshipState>> | undefined,
  persona: string,
  peer: string,
): DynamicRelationshipState | undefined => states?.[persona]?.[peer];

// Pure evolution — deterministic deltas derived ONLY from recorded events:
//   - mutual endorsement          → agreement / trust / dependency up
//   - opposing endorsement        → recentChallenges / irritation up
//   - B endorsed the final winner → successfulPredictions / respect / trust up
//   - A revised toward B in R2    → epistemicDebt / dependency up (B convinced A)
//   - A abandoned B's position    → betrayals up, trust down
//   - untouched pairs             → 1% regression toward the seed baseline
// Everything is clamped; counters are counts; ratios are 0-1.
export const evolveRelationshipsFromSession = (
  current: Record<string, Record<string, DynamicRelationshipState>>,
  session: Pick<CouncilResult, 'opinions' | 'winner' | 'round2Result'> & { sessionId?: string },
  timestamp: number = Date.now(),
  provenance?: Record<string, RelationshipProvenanceEvent[]>,
): Record<string, Record<string, DynamicRelationshipState>> => {
  const next = JSON.parse(JSON.stringify(current)) as Record<string, Record<string, DynamicRelationshipState>>;
  const sessionId = session.sessionId ?? 'unknown';
  const votes: Record<string, string | null> = {};
  for (const op of session.opinions) {
    votes[op.persona] = (typeof op.vote === 'string' && op.vote !== 'None') ? op.vote : null;
  }
  const winner = session.winner;

  for (const a of Object.keys(next)) {
    for (const b of Object.keys(next[a])) {
      const s = next[a][b];
      const vA = votes[a] ?? null;
      const vB = votes[b] ?? null;

      if (vA && vB) {
        if (vA === vB) {
          s.agreement += 0.04; s.dependency += 0.03;
          if (provenance) pushProv(provenance, sessionId, 'endorsed', a, b, 'agreement', 0.04, 'aligned on the same target');
        } else {
          s.agreement -= 0.02; s.recentChallenges += 1; s.irritation += 0.03;
          if (provenance) pushProv(provenance, sessionId, 'opposed', a, b, 'agreement', -0.02, 'endorsed different targets');
        }
        if (vB === vA) {
          s.trust += 0.05;
          if (provenance) pushProv(provenance, sessionId, 'endorsed', a, b, 'trust', 0.05, 'B endorsed your position');
        }
        if (vA === vB) {
          s.trust += 0.03;
          if (provenance) pushProv(provenance, sessionId, 'endorsed', a, b, 'trust', 0.03, 'shared target');
        }
      }

      if (winner && vB === winner) {
        s.successfulPredictions += 1; s.respect += 0.03; s.trust += 0.02;
        if (provenance) pushProv(provenance, sessionId, 'predicted_winner', a, b, 'trust', 0.02, 'B predicted the winning outcome');
      }
      if (winner && vA === winner && vB && vB !== winner && vB !== vA) s.respect -= 0.02;

      // Round 2 revisions — A's causal relationship record.
      const revisions = session.round2Result?.reassessments ?? [];
      const mine = revisions.filter(r => r.member === a && r.status === 'completed');
      for (const r of mine) {
        if (r.changed && r.newVote === b) {
          s.epistemicDebt += 0.15; s.dependency += 0.10; s.respect += 0.04;
          if (provenance) pushProv(provenance, sessionId, 'converted', a, b, 'epistemicDebt', 0.15, 'A revised toward B in Round 2');
        }
        if (r.changed && r.newVote !== b && vA === b) {
          s.betrayals += 1; s.trust -= 0.08;
          if (provenance) pushProv(provenance, sessionId, 'betrayed', a, b, 'trust', -0.08, 'A abandoned B\'s position in Round 2');
          // The abandoned party registers the betrayal too — trust is social.
          const t = next[b]?.[a];
          if (t) {
            t.betrayals += 1; t.trust -= 0.08;
            if (provenance) pushProv(provenance, sessionId, 'betrayed', b, a, 'trust', -0.08, 'B was abandoned in Round 2');
          }
        }
        if (!r.changed && vA === b) {
          s.trust += 0.02;
          if (provenance) pushProv(provenance, sessionId, 'held', a, b, 'trust', 0.02, 'A held B\'s position');
        }
      }

      // 1% regression toward the seed baseline (the personality never vanishes).
      const baseline = getRelationshipEdge(a, b);
      s.trust += (baseline.trust - s.trust) * 0.01;
      s.respect += (baseline.respect - s.respect) * 0.01;
      s.agreement += ((1 - baseline.ideologicalDistance) - s.agreement) * 0.01;
      s.irritation += ((baseline.statusTension * 0.5) - s.irritation) * 0.01;

      s.trust = clamp01(s.trust);
      s.respect = clamp01(s.respect);
      s.agreement = clamp01(s.agreement);
      s.epistemicDebt = clamp01(s.epistemicDebt);
      s.irritation = clamp01(s.irritation);
      s.dependency = clamp01(s.dependency);
      s.recentChallenges = clampCount(s.recentChallenges);
      s.successfulPredictions = clampCount(s.successfulPredictions);
      s.betrayals = clampCount(s.betrayals);
      s.lastUpdated = timestamp;
    }
  }
  return next;
};

// Bounded prompt block: top-3 allies, top-3 tensions, then the rest, one line
// each. Consumed by the voting and Round-2 reassessment prompts so votes become
// a function of social-cognitive state, not raw alignment.
export const buildRelationshipContext = (
  persona: string,
  states?: Record<string, Record<string, DynamicRelationshipState>>,
  maxLines: number = 8,
): string => {
  const peers = PERSONA_NAMES.filter(n => n !== persona);
  const scored = peers.map(peer => {
    const edge = getRelationshipEdge(persona, peer);
    const state = getRelationshipState(states, persona, peer);
    return {
      peer,
      edge,
      state,
      alliance: state?.agreement ?? edge.allianceStrength,
      tension: state?.irritation ?? edge.statusTension * 0.5,
    };
  });

  const byAlliance = [...scored].sort((x, y) => y.alliance - x.alliance);
  const byTension = [...scored].sort((x, y) => y.tension - x.tension);
  const ordered: typeof scored = [];
  const seen = new Set<string>();
  for (const item of byAlliance.slice(0, 3)) { if (!seen.has(item.peer)) { seen.add(item.peer); ordered.push(item); } }
  for (const item of byTension.slice(0, 3)) { if (!seen.has(item.peer)) { seen.add(item.peer); ordered.push(item); } }
  for (const item of scored) { if (!seen.has(item.peer) && ordered.length < maxLines) { seen.add(item.peer); ordered.push(item); } }

  const lines = ordered.slice(0, maxLines).map(item => {
    const s = item.state;
    const trust = s ? s.trust.toFixed(2) : item.edge.trust.toFixed(2);
    const respect = s ? s.respect.toFixed(2) : item.edge.respect.toFixed(2);
    return `• ${item.peer} — ${item.edge.archetype} (trust ${trust}, respect ${respect}). ${s && s.betrayals > 0 ? `Has betrayed you ${s.betrayals}×. ` : ''}${s && s.epistemicDebt > 0.2 ? `Owes you intellectually. ` : ''}Argument style: ${item.edge.preferredArgumentStyle}. What triggers you: ${item.edge.failureTrigger}.`;
  });

  return [
    '',
    'SOCIAL FIELD — how you see the chamber (who you trust, who threatens you):',
    ...lines,
    '',
  ].join('\n');
};

// ── CHARACTER PROVENANCE — WHY the relationships moved (Phase 7 seed) ────────
// Renders the attributable event history for a pair as "character history":
//   Session 021 — converted: Philosopher revised toward Technocrat
//   (epistemicDebt +0.15). A revised toward B in Round 2.
export const buildRelationshipProvenance = (
  persona: string,
  peer: string,
  events: RelationshipProvenanceEvent[] | undefined,
  maxLines: number = 12,
): string => {
  if (!events || events.length === 0) return '';
  const lines = events.slice(-maxLines).map(e => {
    const delta = e.delta >= 0 ? `+${e.delta.toFixed(2)}` : e.delta.toFixed(2);
    const who = e.from === persona ? e.to : e.from;
    return `Session ${e.sessionId} — ${e.type.replace(/_/g, ' ')}: ${who} (${e.field} ${delta}).${e.note ? ` ${e.note}` : ''}`;
  });
  return ['', `CHARACTER HISTORY — ${persona} ↔ ${peer}:`, ...lines, ''].join('\n');
};


