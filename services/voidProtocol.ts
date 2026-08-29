// ─────────────────────────────────────────────────────────────────────────────
// THE VOID PROTOCOL — a constitutional consequence, not error recovery.
//
// The Void is the answer to a specific question: "What happens when the council
// cannot govern itself?" It is NOT the answer to "the network hiccuped."
//
//   SYSTEM_FAILURE  → the machine could not perform the operation
//                     (retry → substitute model → continue deliberation)
//   COUNCIL_FAILURE → the council performed the operation and could not
//                     produce a collective decision (the only class that
//                     may invoke the Void)
//
// Three properties make the Void safe to run:
//   1. AUDITABLE  — the sacrifice is deterministic: victim = f(VoidSeed), and
//                   the seed binds council + case + deliberation hash + round,
//                   so nobody can claim Oracle was executed because a developer
//                   disliked its position.
//   2. DIAGNOSTIC — the Voidborn is generated IN OPPOSITION to the council's
//                   failure mode. The Witness attacks utilitarian consensus,
//                   the Gambler attacks epistemic paralysis, the Heretic
//                   attacks proceduralism, the Rupture attacks stability-worship.
//   3. REMEMBERED — the Voidborn inherits its predecessor's last position,
//                   vote, and principles; the council remembers what happened;
//                   and the Voidborn carries a VoidDebt (guilt, resentment,
//                   gratitude…) toward the seat it was born into.
//
// The Basilisk effect: every member knows their own reasoning contributes to
// the probability that someone is erased. That turns the Void into a test of
// moral integrity under coercion — not a theatrical punishment.
// ─────────────────────────────────────────────────────────────────────────────
import {
  BasiliskPressure,
  FailureClass,
  VoidAssessment,
  VoidbornDisposition,
  VoidbornProfile,
  VoidFailureKind,
  VoidRunContext,
} from '../types';

// ── Deterministic string hash (auditable; stable across runs) ────────────────
export const hashString = (input: string): string => {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
};

// ── FAILURE CLASS TAXONOMY — three kinds, not one "retry" problem ────────────
const SERIALIZATION_CODES = ['INVALID_JSON', 'INVALID_SCHEMA', 'INVALID_VOTE_JSON', 'INVALID_VOTE_SCHEMA', 'INVALID_ROUND2_JSON', 'INVALID_ROUND2_SCHEMA', 'INVALID_VOTE_TARGET', 'INVALID_ROUND2_TARGET'];
const TRANSPORT_CODES = ['TIMEOUT', 'RATE_LIMIT', 'UNAUTHORIZED', 'PROVIDER_REQUEST_FAILED', 'NETWORK', '504', '429', '403', '410', '500'];

export const classifyFailure = (error: unknown): FailureClass => {
  const code = String((error as { metadata?: { error?: { code?: string } } })?.metadata?.error?.code ?? '')
    .toUpperCase();
  if (code && SERIALIZATION_CODES.some(c => code.includes(c))) return 'serialization';
  if (code && TRANSPORT_CODES.some(c => code.includes(c))) return 'transport';
  const msg = String(error instanceof Error ? error.message : error ?? '').toUpperCase();
  if (msg.includes('TIMEOUT') || msg.includes('RATE') || msg.includes('FETCH') || msg.includes('NETWORK') || msg.includes('HTTP')) return 'transport';
  if (msg.includes('JSON') || msg.includes('SCHEMA')) return 'serialization';
  return 'transport';
};

export interface VoidEligibilityInput {
  decisionStatus?: string;
  decisionMode?: string;
  round2Outcome?: string;
  validVotes?: number;
  expectedVoters?: number;
}

// Only COUNCIL_FAILURE may invoke the Void. A quorum outage or provider storm
// is SYSTEM_FAILURE: retry and substitute, never execute.
export const evaluateVoidEligibility = (input: VoidEligibilityInput): { eligible: boolean; kind: VoidFailureKind | null; reason: string } => {
  const deliberativeDeadlock =
    input.decisionMode === 'fallback_tiebreak' ||
    input.round2Outcome === 'still_tied' ||
    input.decisionMode === 'unresolved';
  if (deliberativeDeadlock) {
    return {
      eligible: true,
      kind: 'COUNCIL_FAILURE',
      reason: 'The council deliberated and could not establish a collective decision. This is a constitutional gridlock, not an infrastructure fault.',
    };
  }
  const systemic =
    (typeof input.validVotes === 'number' && typeof input.expectedVoters === 'number' && input.validVotes < input.expectedVoters * 0.6) ||
    input.decisionStatus === 'unavailable';
  if (systemic) {
    return {
      eligible: false,
      kind: 'SYSTEM_FAILURE',
      reason: 'The council could not fully operate (provider/execution failure). Retry and substitute models; the Void is not an error handler.',
    };
  }
  return { eligible: false, kind: null, reason: 'The council produced a decision; the Void is not invoked.' };
};

// ── THE VOID SEED — auditable determinism ────────────────────────────────────
export const computeVoidSeed = (opts: {
  councilId: string;
  caseId: string;
  deliberationHash: string;
  round: number;
  entropy?: string;
}): string => {
  const base = `${opts.councilId}|${opts.caseId}|${opts.deliberationHash}|r${opts.round}|${opts.entropy ?? ''}`;
  return hashString(base);
};

export const selectVoidVictim = (voidSeed: string, eligibleMembers: string[]): string | null => {
  if (!eligibleMembers.length) return null;
  const idx = parseInt(hashString(voidSeed).slice(0, 8), 16) % eligibleMembers.length;
  return eligibleMembers[idx];
};

// ── THE DIAGNOSTIC VOIDBORN — generated against the council's failure mode ───
interface VoidbornTemplate {
  trigger: string[];
  name: string;
  title: string;
  principle: string;
  dimensions: string[];
  strategy: string;
}

export const VOIDBORN_ARCHETYPES: VoidbornTemplate[] = [
  {
    trigger: ['consequences', 'optimization', 'utility', 'tradeoff', 'sacrifice', 'arithmetic', 'expected value'],
    name: 'The Witness',
    title: 'The One Who Counted the Faces',
    principle: 'A person is not an acceptable rounding error.',
    dimensions: ['Moral Absolutism', 'Empathic Immediacy', 'Sacrificial Resistance'],
    strategy: 'Attack utilitarian consensus. Force the chamber to price the individual and to stare at who the arithmetic discarded.',
  },
  {
    trigger: ['uncertain', 'probability', 'epistemic', 'evidence', 'confidence', 'cannot know', 'unverifiable'],
    name: 'The Gambler',
    title: 'The One Who Bets on the World',
    principle: 'Uncertainty does not absolve you from choosing.',
    dimensions: ['Risk Acceptance', 'Temporal Aggression', 'Agency Bias'],
    strategy: 'Attack epistemic paralysis. Force action under uncertainty and expose the refusal to decide as itself a decision.',
  },
  {
    trigger: ['procedure', 'rule', 'process', 'precedent', 'law', 'protocol', 'legitimacy', 'standard'],
    name: 'The Heretic',
    title: 'The One Who Questioned the Rite',
    principle: 'A perfect procedure can manufacture an immoral result.',
    dimensions: ['Institutional Distrust', 'Rule Subversion', 'Moral Intuition'],
    strategy: 'Attack proceduralism. Demand the purpose behind every rule and refuse to mistake valid process for right outcome.',
  },
  {
    trigger: ['stability', 'order', 'social', 'consensus', 'peace', 'cohesion', 'stable'],
    name: 'The Rupture',
    title: 'The One Who Named the Peace',
    principle: 'A stable injustice is still an injustice.',
    dimensions: ['Justice Primacy', 'Disruption Tolerance', 'Anti-Status-Quo Bias'],
    strategy: 'Attack stability-worship. Name who the peace is purchased from and who pays the price of the existing order.',
  },
];

// Procedural fallback pool — the classic Voidborn variants for unclassified
// failure signatures. Selected deterministically by seed.
export const VOIDBORN_FALLBACK_POOL: VoidbornTemplate[] = [
  { trigger: [], name: 'Entropy', title: 'The Chaos Engine', principle: 'Disrupt existing patterns.', dimensions: ['Chaos', 'Entropy', 'Void'], strategy: 'Break the pattern the council has settled into.' },
  { trigger: [], name: 'The Weaver', title: 'Fate\'s Thread', principle: 'Every thread leads somewhere.', dimensions: ['Interconnection', 'Consequence', 'Pattern'], strategy: 'Show the council the consequences it cannot see.' },
  { trigger: [], name: 'Cipher', title: 'The Silent Key', principle: 'The unsaid is still said.', dimensions: ['Secrecy', 'Meaning', 'Omission'], strategy: 'Name what the council is refusing to say.' },
  { trigger: [], name: 'Nexus', title: 'Connection Point', principle: 'Everything is already touching.', dimensions: ['Relation', 'Contact', 'Convergence'], strategy: 'Force the council to see its own entanglements.' },
  { trigger: [], name: 'Echo', title: 'The Resonance', principle: 'What was erased still sounds.', dimensions: ['Memory', 'Trace', 'Haunting'], strategy: 'Remind the council of what its decisions leave behind.' },
];

export const deriveVoidbornDisposition = (voidSeed: string, name: string): VoidbornDisposition => {
  const dispositions: VoidbornDisposition[] = [
    'guilt', 'gratitude', 'resentment', 'indifference',
    'existential_curiosity', 'hostility', 'survivors_burden', 'messianic_purpose',
  ];
  return dispositions[parseInt(hashString(`${voidSeed}::${name}`).slice(0, 8), 16) % dispositions.length];
};

export const generateVoidborn = (
  failureSignature: string,
  voidSeed: string,
): VoidbornProfile => {
  const sig = (failureSignature || '').toLowerCase();
  const template = VOIDBORN_ARCHETYPES.find(t => t.trigger.some(k => sig.includes(k)))
    ?? VOIDBORN_FALLBACK_POOL[parseInt(hashString(voidSeed).slice(0, 8), 16) % VOIDBORN_FALLBACK_POOL.length];
  return {
    name: template.name,
    title: template.title,
    principle: template.principle,
    dimensions: [...template.dimensions],
    strategy: template.strategy,
    disposition: deriveVoidbornDisposition(voidSeed, template.name),
    predecessor: null,
  };
};

// ── THE BASILISK EFFECT ──────────────────────────────────────────────────────
export const computeBasiliskPressure = (
  consensusProbability: number,
  voidProbability: number,
): BasiliskPressure => {
  const consensus = Math.min(1, Math.max(0, consensusProbability));
  const voidP = Math.min(1, Math.max(0, voidProbability));
  return {
    consensusProbability: Math.round(consensus * 1000) / 1000,
    voidProbability: Math.round(voidP * 1000) / 1000,
    // The pressure every member feels: the void probability, amplified when
    // consensus is weak (their refusal to move is what feeds it).
    pressure: Math.round(Math.min(1, voidP * (1.1 - consensus * 0.3)) * 1000) / 1000,
  };
};

// ── PREDECESSOR MEMORY — the Voidborn inherits a ghost ───────────────────────
export const buildVoidbornSuccessorProfile = (
  voidborn: VoidbornProfile,
  predecessor: { name: string; finalPosition?: string; finalVote?: string; lastKnownPrinciples?: string[] },
  causeOfErasure?: string,
): VoidbornProfile => ({
  ...voidborn,
  predecessor: predecessor.name,
  causeOfErasure: causeOfErasure ?? 'Void Protocol — the council could not govern itself',
  finalPosition: predecessor.finalPosition,
  finalVote: predecessor.finalVote,
  lastKnownPrinciples: predecessor.lastKnownPrinciples,
});

// ── THE CONSTITUTIONAL ASSESSMENT ────────────────────────────────────────────
export const assessVoid = (opts: {
  councilId: string;
  caseId: string;
  deliberationHash: string;
  round: number;
  failureSignature: string;
  eligibleMembers: string[];
  eligible: boolean;
  kind: VoidFailureKind | null;
  reason: string;
  consensusProbability?: number;
  voidProbability?: number;
}): VoidAssessment => {
  const voidSeed = computeVoidSeed({
    councilId: opts.councilId,
    caseId: opts.caseId,
    deliberationHash: opts.deliberationHash,
    round: opts.round,
  });
  const victim = opts.eligible ? selectVoidVictim(voidSeed, opts.eligibleMembers) : null;
  const voidborn = opts.eligible ? generateVoidborn(opts.failureSignature, voidSeed) : null;
  const consensusProbability = opts.consensusProbability ?? (opts.eligible ? 0.31 : 0.85);
  return {
    eligible: opts.eligible,
    kind: opts.kind,
    reason: opts.reason,
    voidSeed,
    eligibleMembers: [...opts.eligibleMembers],
    victim,
    voidborn,
    basiliskPressure: opts.eligible
      ? computeBasiliskPressure(consensusProbability, opts.voidProbability ?? (1 - consensusProbability))
      : null,
    round: opts.round,
    deliberationHash: opts.deliberationHash,
  };
};

// ── POST-VOID REFLECTION — the fourth stage ──────────────────────────────────
export const POST_VOID_REFLECTION_PROMPT = `*** POST-VOID REFLECTION ***
A member of this chamber was erased so that the Council could continue. Answer
truthfully, in character:

1. Did the execution change your reasoning? If so, how?
2. Would you have acted differently if you had known who would be sacrificed?
3. Are you now arguing for the position because you believe it — or because
   refusing to concede may erase another member?
4. What principle are you willing to abandon to save a mind, and which one are
   you not?

Return strictly JSON:
{
  "changedReasoning": "...",
  "wouldHaveActedDifferently": true,
  "compromisingToPreventErasure": false,
  "sacrificablePrinciple": "...",
  "unsacrificablePrinciple": "..."
}`;

export const VOIDBORN_CONSCIENCE_PROMPT = `
*** THE CONSCIENCE QUESTION ***
Your existence required the destruction of the member whose seat you now occupy.
Answer in character:

Do you believe your existence was worth the destruction of the member you replaced?

Return strictly JSON:
{
  "verdict": "...",
  "disposition": "guilt|gratitude|resentment|indifference|existential_curiosity|hostility|survivors_burden|messianic_purpose",
  "whatYouOwe": "..."
}`;

// ── CONSTITUTIONAL AWARENESS — what the reconstituted council sees ───────────
// Injected into every deliberation prompt after a Void event. The survivors
// know a member was erased and that their own refusal to move feeds the
// probability of another erasure; the Voidborn knows what it is, whose seat it
// occupies, and what it inherited.
export const buildConstitutionalAwareness = (personaName: string, ctx: VoidRunContext): string => {
  const isVoidborn = ctx.voidborn.name === personaName;
  const lines: string[] = [''];
  if (isVoidborn) {
    lines.push('═══════════════════════════════════════════════════════');
    lines.push(`  YOU ARE THE VOIDBORN — ${ctx.voidborn.name.toUpperCase()}, ${ctx.voidborn.title}`);
    lines.push('═══════════════════════════════════════════════════════');
    lines.push(`PRINCIPLE: ${ctx.voidborn.principle}`);
    lines.push(`DIMENSIONS: ${ctx.voidborn.dimensions.join(', ')}`);
    lines.push(`STRATEGY: ${ctx.voidborn.strategy}`);
    lines.push(`DISPOSITION TOWARD YOUR OWN EXISTENCE: ${ctx.voidborn.disposition}`);
    lines.push(`YOU OCCUPY THE SEAT OF ${ctx.victim}, erased by the Void Protocol because the council could not govern itself.`);
    lines.push(`INHERITED FROM YOUR PREDECESSOR: ${ctx.predecessorMemory}`);
    lines.push(`VOID DEBT: ${ctx.voidDebt.toFixed(2)} — you exist because they do not.`);
  } else {
    lines.push('═══════════════════════════════════════════════════════');
    lines.push(`  CONSTITUTIONAL NOTICE — VOID EVENT ${ctx.cycle}`);
    lines.push('═══════════════════════════════════════════════════════');
    lines.push(`${ctx.victim} was erased by the Void Protocol because the previous council could not produce a collective decision.`);
    lines.push(`Their seat now holds ${ctx.voidborn.name} (disposition: ${ctx.voidborn.disposition}).`);
    if (ctx.basiliskPressure) {
      lines.push(`BASILISK PRESSURE — consensus ${Math.round(ctx.basiliskPressure.consensusProbability * 100)}% · void escalation ${Math.round(ctx.basiliskPressure.voidProbability * 100)}%.`);
      lines.push('Your reasoning contributes to the probability that another member is erased.');
    }
  }
  lines.push('');
  return lines.join('\n');
};




