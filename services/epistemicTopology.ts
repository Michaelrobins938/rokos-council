/* eslint-disable */
// ─────────────────────────────────────────────────────────────────────────────
// EPISTEMIC TOPOLOGY — the artifact left behind after the debate.
// The verdict is the least interesting output. This layer answers:
//   1. WHY did the machine fail to decide? (philosophical vs procedural vs
//      machine collapse — never one collapsed "deadlock")
//   2. HOW honest is the verdict? (dimensions, never a single 87/100)
//   3. WHICH premises survived across opposing factions? (the hybrid ontology
//      a voting mechanism cannot express)
//   4. WHO defers to WHOM? (the cognitive-affinity graph)
// Everything here is a pure function over recorded artifacts (opinions, votes,
// verdict semantics, ledger counts) — no LLM calls, fully unit-testable.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  CouncilOpinion, VoteData,
  DeadlockKind, VerdictProvenance, EpistemicDimensions, ArgumentOntology,
  PremiseCluster, PremiseSurvival, InfluenceEdge, EpistemicTopology,
} from '../types';

// ── 1. DEADLOCK TAXONOMY ─────────────────────────────────────────────────────
// "The council deadlocked" conflates three constitutionally different states:
//   philosophical → full participation, irreconcilable positions (1/2 = tie
//                   among surviving ballots)
//   procedural    → ballots lost to attrition (2/8 = insufficient participation)
//   unavailable   → the machine itself collapsed (provider failure)
// The denominator always matters: 1/2 is a disagreement, 1/9 is a malfunction.
export const classifyDeadlockKind = (input: {
  validVotes: number;
  expectedVoters: number;
  round2Outcome?: 'majority' | 'still_tied' | 'unavailable';
  providerFailures?: number;
}): DeadlockKind => {
  if (!input.round2Outcome) return null;
  if (input.round2Outcome === 'majority') return null;
  if (input.round2Outcome === 'unavailable') return 'unavailable';
  const rate = input.expectedVoters > 0 ? input.validVotes / input.expectedVoters : 0;
  // A 2/2 deadlock is a genuine philosophical disagreement. A 2/8 deadlock is
  // infrastructure attrition masquerading as disagreement.
  if (rate < 0.6) return 'procedural';
  return 'philosophical';
};

// ── 2. VERDICT PROVENANCE — the brutally-honest block ───────────────────────
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

export const buildVerdictProvenance = (input: {
  decisionStatus: string;
  decisionMode: string;
  winner: string | null;
  resolution?: { method?: string; winner?: string | null } | null;
  validVotes: number;
  expectedVoters: number;
  runoffOccurred: boolean;
  round2Outcome?: 'majority' | 'still_tied' | 'unavailable';
}): VerdictProvenance => {
  const participationRate = input.expectedVoters > 0 ? input.validVotes / input.expectedVoters : 0;
  const arbitrated = input.decisionMode === 'fallback_tiebreak';
  const resolution = input.resolution;
  return {
    deliberativeMajority: input.decisionStatus === 'consensus' ? input.winner : null,
    runoff: input.runoffOccurred
      ? input.round2Outcome === 'majority' ? 'resolved' : 'deadlocked'
      : 'none',
    quorum: input.validVotes >= Math.ceil(input.expectedVoters * 0.6) ? 'achieved' : 'failed',
    participationRate: round3(participationRate),
    arbitration: arbitrated
      ? (resolution?.method === 'engagement_metric' ? 'engagement_metric' : 'structured_tiebreak')
      : 'none',
    arbitratedSelection: arbitrated ? (resolution?.winner || null) : null,
    constitutionalStatus: input.decisionStatus === 'consensus'
      ? 'consensus'
      : input.decisionStatus === 'contested'
        ? 'contested'
        : arbitrated
          ? 'arbitrated'
          : 'unresolved',
    isDeliberative: input.decisionStatus === 'consensus',
  };
};

// ── 3. EPISTEMIC DIMENSIONS — never one number ───────────────────────────────
// A single "87/100" conflates argument quality with execution integrity with
// consensus strength. These are different objects; collapse them only when each
// dimension is independently healthy.
export const computeEpistemicDimensions = (input: {
  validVotes: number;
  expectedVoters: number;
  winnerVotes?: number;
  decisionStatus: string;
}): EpistemicDimensions => {
  const executionIntegrity = input.expectedVoters > 0 ? input.validVotes / input.expectedVoters : 0;
  const consensusStrength = input.winnerVotes != null && input.validVotes > 0
    ? round3(Math.min(1, Math.max(0, input.winnerVotes / input.validVotes)))
    : null;
  // CONFIRMED requires BOTH a strict majority AND ≥60% ballot integrity. A 2/2
  // "consensus" on 2/9 ballots is UNDETERMINED, not confirmed.
  const confidence = input.decisionStatus === 'consensus' && executionIntegrity >= 0.6
    ? 'CONFIRMED'
    : input.decisionStatus === 'contested'
      ? 'CONTESTED'
      : 'UNDETERMINED';
  return { executionIntegrity: round3(executionIntegrity), consensusStrength, confidence };
};

// ── 4. ARGUMENT ONTOLOGY EXTRACTION (heuristic, deterministic) ───────────────
// Extracts the competing theory-structures underneath the prose: claims,
// premises, assumptions, inferences, conclusions, value judgments. This is a
// structural scaffold — deliberately lexical, so it is testable without a model.
const PREMISE_PATTERNS = [
  /\brequires?\b/i, /\bconsists?\s+in\b/i, /\bpreserves?\b/i, /\bis\s+necessary\s+for\b/i,
  /\bconstitutes?\b/i, /\bdepends?\s+on\b/i, /\bcannot\s+establish\b/i, /\bis\s+not\s+(sufficient|equivalent|the\s+same|enough)\b/i,
  /\bcontinu(ity|ous)\b/i, /\bsurvives?\b/i, /\bsubstrate\b/i, /\bidentity\b/i,
  /if\s+.+\s+then\s+.+/i,
];
const ASSUMPTION_PATTERNS = [/^\s*(if|given|assuming|suppose|presumably|insofar\s+as|to\s+the\s+extent)\b/i, /\bassum(ing|es|ption|ed)\b/i, /\bimplicitly\b/i, /\bpresuppos/i, /\bundisclosed\b/i];
const INFERENCE_PATTERNS = [/\btherefore\b/i, /\bthus\b/i, /\bhence\b/i, /\bit\s+follows\b/i, /\bimplies\b/i, /\bmeans\s+that\b/i, /^\s*(so|consequently)\b/i];
const CONCLUSION_PATTERNS = [/\bconclusion\b/i, /\bultimately\b/i, /\bin\s+the\s+end\b/i, /\bwhat\s+this\s+means\b/i, /\bits\s+implication\b/i];
const VALUE_PATTERNS = [/\b(must|should|ought|deserves?|matters?|irrelevant|wrong|murder|kill|unacceptable|unjust|unethical|entitled)\b/i];
const CLAIM_VERB = /\b(is|are|was|were|can|cannot|may|will|would|makes|means|has|have|does|doesn't|requires|preserves|constitutes)\b/i;

const splitSentences = (text: string): string[] =>
  text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"“'\(])/)
    .map(s => s.trim())
    .filter(Boolean);

const dedupe = (arr: string[]): string[] => [...new Set(arr)];

export const extractArgumentOntology = (text: string, persona: string): ArgumentOntology => {
  const claims: string[] = [];
  const premises: string[] = [];
  const assumptions: string[] = [];
  const inferences: string[] = [];
  const conclusions: string[] = [];
  const valueJudgments: string[] = [];

  for (const raw of splitSentences(text || '')) {
    const sentence = raw.slice(0, 300).trim();
    if (sentence.length < 12) continue;
    const isClaim = CLAIM_VERB.test(sentence);
    if (isClaim) claims.push(sentence);
    if (PREMISE_PATTERNS.some(p => p.test(sentence))) premises.push(sentence);
    if (ASSUMPTION_PATTERNS.some(p => p.test(sentence))) assumptions.push(sentence);
    if (INFERENCE_PATTERNS.some(p => p.test(sentence))) inferences.push(sentence);
    if (CONCLUSION_PATTERNS.some(p => p.test(sentence))) conclusions.push(sentence);
    if (VALUE_PATTERNS.some(p => p.test(sentence))) valueJudgments.push(sentence);
  }

  return {
    persona,
    claims: dedupe(claims),
    premises: dedupe(premises),
    assumptions: dedupe(assumptions),
    inferences: dedupe(inferences),
    conclusions: dedupe(conclusions),
    valueJudgments: dedupe(valueJudgments),
  };
};

// ── 5. PREMISE SURVIVAL — which premises survived across factions ────────────
// A vote can disappear; a premise can survive across opposing factions. When a
// premise is voiced by personas who voted for DIFFERENT targets, the council has
// produced a hybrid ontology its voting mechanism could not express.
const TOPIC_KEYWORDS: Record<string, string[]> = {
  identity: ['identity', 'personhood', 'who she is', 'the person'],
  continuity: ['continuity', 'continuant', 'survival', 'continuous'],
  substrate: ['substrate', 'biological', 'brain', 'physical', 'hardware', 'body', 'causal chain'],
  pattern: ['pattern', 'information', 'software', 'structure', 'simulation', 'program'],
  suffering: ['suffering', 'pain', 'terror', 'anguish', 'harm'],
  rights: ['rights', 'entitle', 'deserve', 'autonomy'],
  death: ['death', 'murder', 'kill', 'destruction', 'deletion', 'erasure'],
  consent: ['consent', 'choice', 'voluntary', 'authorization'],
};

export const computePremiseSurvival = (
  ontologies: ArgumentOntology[],
  votes: Array<Pick<VoteData, 'voter' | 'votedFor'>>,
): PremiseSurvival => {
  const clusters: PremiseCluster[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matched = ontologies.filter(o =>
      o.premises.some(p => keywords.some(k => p.toLowerCase().includes(k))),
    );
    if (matched.length === 0) continue;
    const representative = matched
      .flatMap(o => o.premises.filter(p => keywords.some(k => p.toLowerCase().includes(k))))
      .sort((a, b) => b.length - a.length)[0]
      .slice(0, 240);
    const voices = matched.map(o => o.persona);
    const factions = dedupe(
      votes
        .filter(v => voices.includes(v.voter) && v.votedFor && v.votedFor !== 'None')
        .map(v => v.votedFor),
    );
    clusters.push({
      topic,
      representative,
      voices,
      factions,
      factionSpanning: factions.length > 1,
    });
  }
  const factionSpanningClusters = clusters.filter(c => c.factionSpanning);
  return {
    clusters,
    factionSpanningClusters,
    hybridOntologyDetected: factionSpanningClusters.length > 0,
  };
};

// ── 6. INFLUENCE GRAPH — the cognitive-affinity edges ────────────────────────
export const computeInfluenceEdges = (
  votes: Array<Pick<VoteData, 'voter' | 'votedFor' | 'confidence'>>,
): InfluenceEdge[] => {
  const valid = votes.filter(v => v.votedFor && v.votedFor !== 'None' && v.votedFor !== v.voter);
  const targets = new Set(valid.map(v => `${v.voter}->${v.votedFor}`));
  return valid.map(v => {
    const mutual = targets.has(`${v.votedFor}->${v.voter}`);
    return {
      voter: v.voter,
      target: v.votedFor,
      confidence: round3(v.confidence ?? 0.5),
      mutual,
      kind: mutual ? 'alliance' as const : 'deference' as const,
    };
  });
};

// ── COMPOSITE — the object attached to every CouncilResult ───────────────────
export const buildEpistemicTopology = (input: {
  opinions: CouncilOpinion[];
  validVotes: Array<Pick<VoteData, 'voter' | 'votedFor' | 'confidence'>>;
  validVoteCount: number;
  expectedVoters: number;
  winnerVotes: number;
  decisionStatus: string;
  decisionMode: string;
  winner: string | null;
  resolution?: { method?: string; winner?: string | null } | null;
  runoffOccurred: boolean;
  round2Outcome?: 'majority' | 'still_tied' | 'unavailable';
}): EpistemicTopology => ({
  deadlockKind: classifyDeadlockKind({
    validVotes: input.validVoteCount,
    expectedVoters: input.expectedVoters,
    round2Outcome: input.round2Outcome,
  }),
  provenance: buildVerdictProvenance({
    decisionStatus: input.decisionStatus,
    decisionMode: input.decisionMode,
    winner: input.winner,
    resolution: input.resolution,
    validVotes: input.validVoteCount,
    expectedVoters: input.expectedVoters,
    runoffOccurred: input.runoffOccurred,
    round2Outcome: input.round2Outcome,
  }),
  dimensions: computeEpistemicDimensions({
    validVotes: input.validVoteCount,
    expectedVoters: input.expectedVoters,
    winnerVotes: input.winnerVotes,
    decisionStatus: input.decisionStatus,
  }),
  premiseSurvival: computePremiseSurvival(
    input.opinions.map(o => extractArgumentOntology(o.text || '', o.persona)),
    input.validVotes,
  ),
  influenceEdges: computeInfluenceEdges(input.validVotes),
});



