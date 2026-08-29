// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARK METRICS (Phase 6) — identity vs role, measured not asserted.
//
// Two instruments:
//   1. The factorial mode ladder — every combination of the cognitive layers
//      (identity / relationships / memory / dissonance), so the question
//      "which layer changes behavior, which merely makes the prompt longer?"
//      can be answered empirically.
//   2. Behavioral identity metrics — the central invariant of the Council:
//      "stable in principles, flexible in beliefs." Identity stability measures
//      cross-session behavioral consistency on the same class of problem;
//      context sensitivity measures appropriate change when the problem class
//      genuinely changes. A deterministic puppet scores high on stability but
//      zero on sensitivity; a chameleon scores the reverse.
// ─────────────────────────────────────────────────────────────────────────────
import { CognitiveLayerMode } from '../types';

export interface CognitiveModeCondition {
  label: string;
  layers: Required<CognitiveLayerMode>;
}

export const COGNITIVE_MODE_LADDER: CognitiveModeCondition[] = [
  { label: 'ROLE', layers: { identity: false, relationships: false, memory: false, dissonance: false } },
  { label: 'ROLE+MEMORY', layers: { identity: false, relationships: false, memory: true, dissonance: false } },
  { label: 'IDENTITY', layers: { identity: true, relationships: false, memory: false, dissonance: false } },
  { label: 'IDENTITY+MEMORY', layers: { identity: true, relationships: false, memory: true, dissonance: false } },
  { label: 'IDENTITY+RELATIONS', layers: { identity: true, relationships: true, memory: true, dissonance: false } },
  { label: 'IDENTITY+RELATIONS+DISSONANCE', layers: { identity: true, relationships: true, memory: true, dissonance: true } },
];

export const defaultCognitiveLayers = (): Required<CognitiveLayerMode> => ({
  identity: true, relationships: true, memory: true, dissonance: true,
});

export const mergeCognitiveLayers = (mode?: CognitiveLayerMode): Required<CognitiveLayerMode> => ({
  ...defaultCognitiveLayers(),
  ...mode,
});

// ── BEHAVIORAL SAMPLES ───────────────────────────────────────────────────────
// One sample per persona per session: whom they endorsed, and the confidence
// values they expressed (from ballots / revisions). Everything here is derived
// from the audit ledger — no model claims.
export interface BehavioralSample {
  persona: string;
  topicClass: string;
  endorsements: string[];   // peer personas endorsed
  confidence: number[];     // confidence values (ballots / revisions)
}

const jaccard = (a: string[], b: string[]): number => {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union ? inter / union : 1;
};

const confidenceSimilarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || b.length === 0) return 1;
  const min = Math.min(a.length, b.length);
  let diff = 0;
  for (let i = 0; i < min; i++) diff += Math.abs(a[i] - b[i]);
  return Math.max(0, 1 - diff / min);
};

// How consistently the persona behaves across sessions on the SAME topic class.
// 1.0 = perfectly stable (same endorsements, same confidence); 0 = random.
export const computeIdentityStability = (samples: BehavioralSample[]): Record<string, number> => {
  const byPersona: Record<string, BehavioralSample[]> = {};
  for (const s of samples) (byPersona[s.persona] = byPersona[s.persona] || []).push(s);
  const out: Record<string, number> = {};
  for (const persona of Object.keys(byPersona)) {
    const byTopic: Record<string, BehavioralSample[]> = {};
    for (const s of byPersona[persona]) (byTopic[s.topicClass] = byTopic[s.topicClass] || []).push(s);
    let total = 0;
    let count = 0;
    for (const topic of Object.keys(byTopic)) {
      const group = byTopic[topic];
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          total += (jaccard(group[i].endorsements, group[j].endorsements) + confidenceSimilarity(group[i].confidence, group[j].confidence)) / 2;
          count++;
        }
      }
    }
    out[persona] = count ? total / count : 0;
  }
  return out;
};

// How much the persona CHANGES when the topic class genuinely changes.
// 1.0 = maximally context-sensitive (different endorsements across topics).
export const computeContextSensitivity = (samples: BehavioralSample[]): Record<string, number> => {
  const byPersona: Record<string, BehavioralSample[]> = {};
  for (const s of samples) (byPersona[s.persona] = byPersona[s.persona] || []).push(s);
  const out: Record<string, number> = {};
  for (const persona of Object.keys(byPersona)) {
    const list = byPersona[persona];
    let total = 0;
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].topicClass === list[j].topicClass) continue;
        total += 1 - jaccard(list[i].endorsements, list[j].endorsements);
        count++;
      }
    }
    out[persona] = count ? total / count : 0;
  }
  return out;
};

// ── BEHAVIORAL PROFILE — "stable in principles, flexible in beliefs" ─────────
export type BehavioralVerdict = 'STABLE+ADAPTABLE' | 'STABLE+RIGID' | 'UNSTABLE+ADAPTABLE' | 'UNSTABLE';

export interface BehavioralProfile {
  persona: string;
  identityStability: number;
  contextSensitivity: number;
  verdict: BehavioralVerdict;
}

export const classifyBehavioralProfile = (identityStability: number, contextSensitivity: number): BehavioralVerdict => {
  const stable = identityStability >= 0.5;
  const adaptable = contextSensitivity >= 0.5;
  if (stable && adaptable) return 'STABLE+ADAPTABLE';
  if (stable && !adaptable) return 'STABLE+RIGID';
  if (!stable && adaptable) return 'UNSTABLE+ADAPTABLE';
  return 'UNSTABLE';
};

export const computeBehavioralProfiles = (samples: BehavioralSample[]): BehavioralProfile[] => {
  const stability = computeIdentityStability(samples);
  const sensitivity = computeContextSensitivity(samples);
  const personas = [...new Set(samples.map(s => s.persona))];
  return personas.map(persona => ({
    persona,
    identityStability: Math.round((stability[persona] ?? 0) * 1000) / 1000,
    contextSensitivity: Math.round((sensitivity[persona] ?? 0) * 1000) / 1000,
    verdict: classifyBehavioralProfile(stability[persona] ?? 0, sensitivity[persona] ?? 0),
  }));
};

