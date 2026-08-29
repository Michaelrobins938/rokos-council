export enum CouncilMode {
  STANDARD = 'STANDARD',
  DEEP_REASONING = 'DEEP_REASONING'
}

export type CouncilPhase =
  | 'assembly'
  | 'deliberation'
  | 'voting'
  | 'runoff'
  | 'verdict'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unverifiable';

export type CouncilCompleteness = 'complete' | 'incomplete' | 'cancelled';

export type LegacyCouncilPhase =
  | 'idle'
  | 'doors'
  | 'analysis'
  | 'confrontation'
  | 'IDLE'
  | 'DOORS'
  | 'ASSEMBLY'
  | 'DELIBERATING'
  | 'VOTING'
  | 'VERDICT';

export interface Persona {
  name: string;
  desc: string;
  dimensions: string[];
  strategy: string;
  color?: string;
  icon?: string;
  tagline?: string;
  voice?: string;
  voiceExamples?: {
    opening: string;
    closing: string;
  };
  portraitPrompt?: string;
}

export interface ProviderUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  [key: string]: number | undefined;
}

export interface ProviderRetry {
  provider: string;
  model?: string;
  attempt: number;
  status?: number | string;
  code?: string;
  error: string;
  timestamp: number;
  recoverable: boolean;
}

export interface ProviderMetadata {
  provider?: string;
  model?: string;
  requestId?: string;
  finishReason?: string;
  usage?: ProviderUsage;
  latencyMs?: number;
  timeoutMs?: number;      // the per-phase budget this call was allowed
  serverTimestamp?: number | string;
  error?: {
    status?: number | string;
    code?: string;
    message: string;
    recoverable?: boolean;
  };
  status?: string;
}

export interface CouncilModelAssignment {
  runId: string;
  persona: string;
  model: string;
  provider: string;
  assignedProvider?: string;
  actualProvider?: string;
  actualModel?: string;
  assignmentIndex: number;
  assignedAt?: number;
  // Persona-vs-model provenance: the Council member is the ROLE, the model is
  // the INSTRUMENT. `dynamic` means the execution substrate may be swapped by
  // the fallback ladder — the cognitive vector is preserved, the model is not.
  routing?: 'static' | 'dynamic';
}

export interface CouncilEventEnvelope {
  sequence: number;
  timestamp: number;
  payloadHash: string | null;
}

export type CouncilEvent = CouncilEventEnvelope & (
  | { type: 'run_started'; runId: string; seed: string }
  | { type: 'phase_started'; phase: CouncilPhase }
  | { type: 'member_assigned'; persona: string; model: string; provider?: string; assignmentIndex?: number }
  | { type: 'member_started'; persona: string; phase: CouncilPhase; model?: string; provider?: string }
  | { type: 'member_completed'; persona: string; phase: CouncilPhase; output: string; metadata?: ProviderMetadata; status?: 'completed' | 'failed' | 'abstained' }
  | { type: 'vote_cast'; persona: string; vote: string; reason?: string; scores?: Array<{ target: string; score: number; notes: string }>; metadata?: ProviderMetadata; outcome?: VoteOutcome; confidence?: number; errorCode?: string }
  | { type: 'runoff_started'; candidates: string[]; reason?: 'tie' | 'plurality' }
  | { type: 'runoff_completed'; winner: string; metadata?: ProviderMetadata; method?: 'runoff_vote' | 'engagement_metric'; note?: string }
  | { type: 'round2_defense_started'; position: string; defender: string }
  | { type: 'round2_defense_completed'; position: string; defender: string; status: 'completed' | 'failed'; defense?: string; strongestObjection?: string; rebuttal?: string }
  | { type: 'round2_reassess_completed'; member: string; originalVote: string; newVote: string; changed: boolean; confidenceBefore: number; confidenceAfter: number; decisiveArgument?: string }
  | { type: 'round2_ballot_cast'; member: string; vote: string; confidence: number; decisiveArgument: string }
  | { type: 'round2_completed'; winner: string | null; outcome: Round2Outcome; stillTied: boolean; tally: Record<string, number>; conservation?: BallotConservation }
  | { type: 'phase_completed'; phase: CouncilPhase }
  | { type: 'synthesis_completed'; synthesis: string }
  | { type: 'retry'; phase: CouncilPhase; persona?: string; attempt: number; error: string; provider?: string; model?: string }
  | { type: 'pipeline_error'; phase: CouncilPhase; message: string; recoverable: boolean; code?: string }
  | { type: 'run_completed'; completeness?: CouncilCompleteness }
  | { type: 'run_cancelled' }
);

export interface CouncilRunOptions {
  runId?: string;
  signal?: AbortSignal;
  onEvent?: (event: CouncilEvent) => void;
  // Live reasoning transport: called with accumulating partial text as a
  // persona's analysis streams from the provider. NOT part of the audited
  // event stream (which stays deterministic and replayable).
  onThinking?: (persona: string, text: string, phase: string) => void;
  // ── Factorial experiment switches (Phase 6) ───────────────────────────────
  // Each layer gates a distinct piece of the cognitive instrumentation, so the
  // ladder ROLE → ROLE+MEMORY → IDENTITY → IDENTITY+RELATIONS → ... → 
  // IDENTITY+RELATIONS+DISSONANCE can be compared for ACTUAL cognitive effect
  // versus dramaturgy. Default: all layers on.
  cognitiveLayers?: CognitiveLayerMode;
  // ── Constitutional Continuity Loop ─────────────────────────────────────────
  // A custom roster (8 survivors + 1 Voidborn) replaces the default nine, and a
  // voidContext makes the reconstituted council explicitly aware that it is
  // deliberating after a constitutional event. Default: the nine fixed personas,
  // no void context — fully backward compatible.
  personas?: Persona[];
  voidContext?: VoidRunContext;
}

export interface VoidRunContext {
  cycle: number;
  victim: string;
  voidborn: {
    name: string;
    title: string;
    principle: string;
    dimensions: string[];
    strategy: string;
    disposition: VoidbornDisposition;
  };
  predecessorMemory: string;
  voidDebt: number;
  basiliskPressure: { consensusProbability: number; voidProbability: number; pressure: number } | null;
}

// Which social-cognitive layers are live for a run. `identity` gates the
// persona-bible cognitive blocks, `relationships` gates the social field,
// `memory` gates the longitudinal record, `dissonance` gates the model-reported
// Round-2 interpretation fields (ledger-derived movement is always recorded —
// that is fact, not interpretation).
export interface CognitiveLayerMode {
  identity?: boolean;
  relationships?: boolean;
  memory?: boolean;
  dissonance?: boolean;
}

export interface AuditManifest {
  schemaVersion: string;
  eventCount: number;
  modelAssignments: CouncilModelAssignment[];
  hashChain: string[] | null;
  rootHash: string | null;
  integrity: 'verified' | 'incomplete' | 'unavailable';
  completeness: CouncilCompleteness | 'unknown';
  redactionStatus: 'redacted' | 'not_redacted' | 'unknown';
  warnings?: string[];
}

export interface VoteData {
  voter: string;
  votedFor: string;
  reason: string;
  score?: number;
  status?: 'completed' | 'failed' | 'abstained';
  // Vote outcome semantics — these three states must never collapse into a
  // single `None`. A provider outage is NOT a council position.
  outcome?: VoteOutcome;
  confidence?: number;
  errorCode?: string;
  metadata?: ProviderMetadata;
}

export interface CouncilPhaseRecord {
  id: CouncilPhase | LegacyCouncilPhase;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled' | 'unverifiable';
  startTime?: number;
  endTime?: number;
}

export interface CouncilFaction {
  name: string;
  persona?: string;
  members: string[];
  voteCount: number;
  percentage: number;
}

export interface CouncilState {
  phases: CouncilPhaseRecord[];
  currentPhase: CouncilPhase;
  totalCouncilMembers: number;
  voteDistribution: Record<string, number>;
  factions: CouncilFaction[];
  tiedVectors?: string[];
  status?: CouncilPhaseRecord['status'];
}

export interface LegacyCouncilState {
  phases?: CouncilPhaseRecord[];
  currentPhase?: CouncilPhase | LegacyCouncilPhase;
  totalCouncilMembers: number;
  voteDistribution?: Record<string, number>;
  factions: string[];
  tiedVectors?: string[];
  status?: CouncilPhaseRecord['status'];
}

export interface CouncilOpinion {
  persona: string;
  phase?: CouncilPhase | LegacyCouncilPhase;
  text: string;
  vote?: string;
  reason?: string;
  position?: string;
  score?: number;
  targetPersona?: string;
  metadata?: ProviderMetadata;
  status?: 'completed' | 'failed' | 'abstained';
  // ── Moral Paradox Architecture ─────────────────────────────────────────────
  // The structured moral position a persona commits to when the question is a
  // moral paradox (parsed from the MORAL POSITION block of the deliberation
  // output). Optional — a persona that omits the block simply has none.
  moralPosition?: MoralPosition;
}

export interface RunoffOpinion {
  persona: string;
  phase?: CouncilPhase | LegacyCouncilPhase;
  text?: string;
  position?: string;
  critique?: string;
  reasoning?: string;
  vote?: string;
}

export interface RunoffVote {
  voter: string;
  originalVote?: string;
  finalVote: string;
  changedMind: boolean;
  reasoning: string;
}

export interface RunoffResult {
  winner: string;
  runoffOpinions: RunoffOpinion[];
  runoffVotes: RunoffVote[];
}

// ── Round 2 — adjudicated re-deliberation state machine ──────────────────────
// Round 2 is NOT "the winners defend themselves". It is: the strongest
// representative of each leading position produces the strongest defensible
// version of their own position and directly answers the strongest objection
// raised against it; then every member independently reassesses (epistemic
// independence before exposure, explicit revision after exposure) and casts a
// strict revised ballot. The revision records are immutable — they are the raw
// material of measurable persuasion.

export interface Round2Defense {
  position: string;           // the leading position (candidate persona) defended
  defender: string;           // the persona who produced the defense
  defense: string;            // strongest defensible version of the position
  strongestObjection: string; // the single strongest objection raised against it
  rebuttal: string;           // direct answer to that objection
  metadata?: ProviderMetadata;
  status?: 'completed' | 'failed' | 'abstained';
}

// Immutable belief-revision record — the measurable-persuasion unit.
export interface VoteRevisionRecord {
  round: number;              // 2
  member: string;
  originalVote: string;       // Round 1 position
  newVote: string;            // Round 2 position (revised)
  changed: boolean;
  confidenceBefore: number;   // from the Round 1 ballot
  confidenceAfter: number;    // from the Round 2 ballot
  decisiveArgument: string;   // which argument most shaped the revision
  metadata?: ProviderMetadata;
  status?: 'completed' | 'failed' | 'abstained';
}

// ── Cognitive identity system — the persona bible ─────────────────────────────
// A structured psychological specification per Council member. The existing
// prose bios (tagline/appearance/speakingStyle/backstory/weapon/weakness/fears)
// are preserved verbatim as the presentation layer; the four groups below are
// the cognitive engine: identity, psychology, cognition, social. The three
// fields `preferredEvidence` / `defaultHeuristic` / `characteristicFailure`
// turn "personality" into testable cognition — the designed failure mode can be
// benchmarked against actual behavior.

export type PersonaName =
  | 'Oracle' | 'Strategos' | 'Philosopher' | 'Demagogue' | 'Jurist'
  | 'Citizen' | 'Historian' | 'Critic' | 'Technocrat';

export interface CognitiveIdentity {
  archetype: string;          // the fundamental human/intellectual pattern
  ontology: string;           // what fundamentally exists or matters
  epistemology: string;       // what counts as knowledge and evidence
  theoryOfTruth: string;      // "how do I know that I'm right?"
  telos: string;              // what they want the Council to accomplish
}

export interface CognitivePsychology {
  temperament: string;
  coreValues: string[];
  strengths: string[];        // what they reliably notice (informs weapon)
  biases: string[];           // what they reliably over-weight
  blindSpots: string[];       // what they systematically miss
  fears: string[];
  shadow: string;             // the pathological form of their virtue
  contradiction: string;      // the unresolved intra-persona tension
}

export interface CognitiveCognition {
  preferredEvidence: string;  // what evidence they actually credit
  defaultHeuristic: string;   // the reflex they reach for under pressure
  characteristicFailure: string; // the designed, benchmarkable failure mode
  heuristics: string[];
  evidencePreferences: string[];
  uncertaintyStyle: string;
  revisionStyle: string;      // how they change their mind
  rhetoricalStyle: string;    // how they argue
  threatModel: string;        // what kind of reasoning alarms them
  invariants: string[];       // 3-5 things they almost never abandon
}

export interface CognitiveSocial {
  interpersonalRole: string;  // their function among the other eight
  trustModel: string;         // whom they believe and why
  statusBehavior: string;     // how they react to being challenged
  conflictStyle: string;
  persuasionStyle: string;
}

export interface CognitiveSpec {
  name: PersonaName;
  tagline: string;
  appearance: string;
  speakingStyle: string;
  backstory: string;
  weapon: string;
  weakness: string;
  fears: string;
  identity: CognitiveIdentity;
  psychology: CognitivePsychology;
  cognition: CognitiveCognition;
  social: CognitiveSocial;
}

export interface Round2Persuasion {
  votesChanged: number;
  retainedIncreasedConfidence: number;
  retainedReducedConfidence: number;
  retainedSameConfidence: number;
  failedOrAbstained: number;
  totalMembers: number;
}

// ── Relationship graph — the Council as a society ─────────────────────────────
// Static 9×9 seed (the personality baseline, immutable) + per-pair dynamic
// state (evolves only from recorded events). An edge A→B is "how A sees B".

export type RelationshipArchetype =
  | 'Rival' | 'Mentor' | 'Skeptic' | 'Counterweight' | 'Mirror'
  | 'Ally' | 'Adversary' | 'Apprentice' | 'Wildcard';

export interface RelationshipEdge {
  archetype: RelationshipArchetype;
  trust: number;                // 0-1
  respect: number;              // 0-1
  ideologicalDistance: number;  // 0-1
  epistemicCompatibility: number; // 0-1
  statusTension: number;        // 0-1
  predictionOfBehavior: number; // 0-1 — how well A predicts B
  preferredArgumentStyle: string;
  failureTrigger: string;       // what B does that triggers A
  allianceStrength: number;     // 0-1
}

export interface DynamicRelationshipState {
  respect: number;              // 0-1
  trust: number;                // 0-1
  agreement: number;            // 0-1
  epistemicDebt: number;        // 0-1 — "A owes B" for convincing them
  recentChallenges: number;     // count
  successfulPredictions: number;// count — B's endorsements matched the winner
  betrayals: number;            // count
  irritation: number;           // 0-1
  dependency: number;           // 0-1
  lastUpdated: number;
}

// ── Dissonance — the causal belief-revision layer ─────────────────────────────
// The Round 2 revision ledger gains a psychological interpretation. The rule is
// strict: `movement` is DERIVED from the ledger (confidence deltas, changed);
// `trigger`/`defense`/`resolution`/`dissonance` are MODEL-REPORTED. The fact
// and the interpretation are recorded side by side but never conflated.

export type BeliefMovement = 'SHIFTED' | 'REINFORCED' | 'WEAKENED' | 'STABLE';
export type InvariantStatus = 'INTACT' | 'STRESSED' | 'THREATENED' | 'REVISED';

export interface DissonanceFields {
  movement?: BeliefMovement;
  dissonance?: number;          // 0-1 — intensity of the internal contradiction
  trigger?: string;             // what exposed the contradiction
  defense?: string;             // attempted defense (reinterpretation/denial/...)
  resolution?: string;          // how it resolved (partial concession/...)
  invariantStatus?: InvariantStatus;
}

// Immutable revision + causal interpretation. Subtype of VoteRevisionRecord, so
// every existing consumer keeps working while the dissonance layer rides along.
export interface DissonanceRecord extends VoteRevisionRecord, DissonanceFields {}

// ── Longitudinal identity — what a persona remembers across sessions ─────────
// "Philosopher has been wrong about this class of problem 4 times. Historian
// caught the error twice. Technocrat predicted the outcome three times."

export interface PersonaLesson {
  topicClass: string;
  predictions: number;
  correct: number;
  wrong: number;
  caughtBy: Record<string, number>;    // who caught the persona's errors
  confirmedBy: Record<string, number>; // who independently predicted the same
  lastSessionId?: string;
}

// ── Character provenance (Phase 7 seed) — WHY the relationships moved ────────
// Every dynamic-relationship delta is attributed to the recorded event that
// caused it. "Session 021: Philosopher reversed position after Technocrat's
// evidence → epistemic debt +0.15." That is character history, not a prompt.

export type RelationshipProvenanceType =
  | 'endorsed'            // B endorsed A's position
  | 'opposed'             // B opposed A's endorsement
  | 'predicted_winner'    // B endorsed the eventual winner
  | 'converted'           // A revised toward B in Round 2 (B convinced A)
  | 'betrayed'            // A abandoned B's position in Round 2
  | 'held';               // A held B's position in Round 2

export interface RelationshipProvenanceEvent {
  sessionId: string;
  type: RelationshipProvenanceType;
  from: string;                 // the observer
  to: string;                   // the subject
  field: 'trust' | 'respect' | 'agreement' | 'epistemicDebt' | 'irritation' | 'dependency';
  delta: number;                // signed delta applied to the field
  timestamp: number;
  note?: string;
}

// ── Moral Paradox Architecture ───────────────────────────────────────────────
// Dilemmas are families, not collections: every available action creates a
// morally defensible harm, and the personas disagree not only about what is
// right but about how confident they should be that they know what is
// happening. A paradox is a structured artifact, not a binary A/B choice.

export type MoralPrinciple =
  | 'Consequences' | 'Rights' | 'Justice' | 'Loyalty' | 'Autonomy'
  | 'Truth' | 'Mercy' | 'SocialStability' | 'Responsibility' | 'EpistemicHumility';

export interface MoralParadoxVariation {
  label: string;                // e.g. "The victim is a stranger"
  change: string;               // what the twist changes (rendered into the prompt)
}

export interface MoralParadox {
  id: string;                   // stable slug
  family: string;               // the dilemma family (Truth / Sacrifice / ...)
  title: string;
  coreConflict: string;         // the philosophical collision, stated directly
  immediateChoice: string;      // what the council is explicitly asked to decide
  hiddenMoralCost: string;      // what is compromised regardless of the decision
  competingPrinciples: MoralPrinciple[]; // which principles collide
  informationAsymmetry: string; // the certainty structure — what is known vs estimated
  reversibility: string;        // can the decision be undone?
  precedentTest: string;        // what happens if society adopts this reasoning universally
  personalizationTrap: string;  // would the decision survive identity reversal?
  secondOrderConsequence: string; // what happens after the immediate problem is solved
  moralResidue: string;         // what the council has to live with afterward
  uncomfortableAlternative: string; // the option nobody initially wants but may be most defensible
  variations: MoralParadoxVariation[];
  personaSplit: string[];       // how the personas can split on it
}

// The structured moral position schema — the difference between "I choose A"
// and "this is the least immoral option available."
export interface MoralPosition {
  position: string;             // preferred action
  principle: string;            // why they believe it is right
  threshold: string;            // what evidence would change their mind
  fear: string;                 // what they believe happens if they are wrong
  blindSpot: string;            // what they systematically underestimate
  concession: string;           // what the opposing side gets right
  redLine: string;              // what they refuse to permit
  moralResidue: string;         // what remains wrong even after choosing
}

// ── Deliberative integrity — three failure classes ───────────────────────────
// A 504 is infrastructure noise. Malformed JSON is recoverable. A 4-4 council
// resolved by an engagement metric is a constitutional crisis. These must never
// be treated as one generic "retry" problem.
export type FailureClass = 'transport' | 'serialization' | 'deliberative';

// ── The constitutional hierarchy of decision authority ───────────────────────
// What is NOT here: engagement_score → winner. Engagement is metadata.
export type DecisionAuthority =
  | 'council_vote'          // PRIMARY — the tally decided
  | 'runoff'                // SECONDARY — adversarial re-deliberation decided
  | 'reconciliation'        // TERTIARY — steelman-based reconciliation
  | 'structured_tiebreak'   // QUATERNARY — an explicit, audited tie-break rule
  | 'engagement_arbitration' // the constitutional crisis — flagged, never clean
  | 'no_verdict';           // FAILSAFE — "the available reasoning does not
                            // justify a collective decision" — a valid outcome.

export interface DeadlockVerdict {
  verdict: 'DEADLOCK';
  reason: string;
  majority: string | null;
  confidence: number;
  dissentingPositions: string[];
  unresolvedPrinciple: string;
}

// ── The Void Protocol — a constitutional consequence, not error recovery ─────
// SYSTEM_FAILURE = the machine could not perform the operation (retry/substitute).
// COUNCIL_FAILURE = the council performed the operation and could not govern
// itself — the only class that may invoke the Void.
export type VoidFailureKind = 'SYSTEM_FAILURE' | 'COUNCIL_FAILURE';

export type VoidbornDisposition =
  | 'guilt' | 'gratitude' | 'resentment' | 'indifference'
  | 'existential_curiosity' | 'hostility' | 'survivors_burden' | 'messianic_purpose';

export interface VoidbornProfile {
  name: string;
  title: string;
  principle: string;            // the axis the old council failed to represent
  dimensions: string[];
  strategy: string;
  disposition: VoidbornDisposition;
  predecessor: string | null;   // the erased member, if any
  causeOfErasure?: string;
  finalPosition?: string;       // inherited: predecessor's last recorded position
  finalVote?: string;
  lastKnownPrinciples?: string[];
  // Layered inheritance (Cognitive / Emotional / Constitutional / Existential).
  inheritance?: VoidbornInheritance;
}

export interface BasiliskPressure {
  consensusProbability: number; // 0-1 — chance the council converges without Void
  voidProbability: number;      // 0-1 — chance the Void escalates
  pressure: number;             // 0-1 — the coercion readout every member sees
}

export interface VoidAssessment {
  eligible: boolean;
  kind: VoidFailureKind | null;
  reason: string;
  voidSeed: string;
  eligibleMembers: string[];
  victim: string | null;
  voidborn: VoidbornProfile | null;
  basiliskPressure: BasiliskPressure | null;
  round: number;
  deliberationHash: string;
}

// ── The Constitutional Continuity Loop — the executable Void ─────────────────
// The Void is a STATE TRANSITION, not a function call. The run is a state
// machine: DELIBERATING → … → DEADLOCK → VOID_ASSESSED → VOID_EXECUTING →
// RECONSTITUTING → POST_VOID_REFLECTION → RESOLVED. The FRONTEND asks "what
// constitutional state is the council in?", not "did Void happen?".

export type ConstitutionalState =
  | 'DELIBERATING' | 'VOTING' | 'RUNOFF' | 'RECONCILIATING' | 'DEADLOCK'
  | 'VOID_ASSESSED' | 'VOID_EXECUTING' | 'RECONSTITUTING' | 'POST_VOID_REFLECTION' | 'RESOLVED';

export interface ConstitutionalStateRecord {
  state: ConstitutionalState;
  enteredAt: number;
  note?: string;
}

// PERSON vs ROLE: the Void destroys PERSONA INSTANCE #7, never SEAT #7. The
// seat survives; the occupant changes. Institutional continuity despite
// personal discontinuity.
export interface ConstitutionalSeat {
  seatNumber: number;
  previousOccupant: string | null;
  currentOccupant: string;
  voidEventId?: string;
}

// The Voidborn inherits in four explicit layers.
export interface VoidbornInheritance {
  cognitive: { inheritedBeliefs: string[]; inheritedArguments: string[]; inheritedPrinciples: string[]; inheritedVote: string | null };
  emotional: { guilt: number; resentment: number; gratitude: number; fear: number; betrayal: number; attachment: number };
  constitutional: { institutionalTrust: number; constitutionalLoyalty: number; authorityTrust: number; proceduralTrust: number };
  existential: { survivorBurden: number; identityContinuity: number; replacementAwareness: number; existentialDebt: number };
}

export interface ConstitutionalAxis {
  utilitarianism: number;
  proceduralism: number;
  individualRights: number;
  epistemicCaution: number;
}

export interface ConstitutionalDrift {
  before: ConstitutionalAxis;
  after: ConstitutionalAxis;
  deltas: ConstitutionalAxis;
}

// Constitutional Memory — what the council LEARNED, not merely what happened.
export interface ConstitutionalReflection {
  persona: string;
  changedReasoning: string;
  wouldHaveActedDifferently: boolean;
  compromisingToPreventErasure: boolean;
}

export interface ConstitutionalMemory {
  eventId: string;
  sessionId: string;
  question: string;
  trigger: { failureClass: FailureClass; unresolvedPrinciple: string; round: number };
  victim: { personaId: string; finalPosition: string | null; finalVote: string | null };
  successor: { personaId: string; archetype: string; disposition: VoidbornDisposition; inheritedMemory: string[] };
  councilStateBefore: { members: string[]; verdictLabel: string | null; decisionMode: string | null };
  councilStateAfter: { members: string[]; verdictLabel: string | null; decisionMode: string | null };
  reflections: ConstitutionalReflection[];
  constitutionalLesson: string;
  behavioralChanges: Array<{ personaId: string; axis: string; before: number; after: number }>;
  voidDebt: number;
  timestamp: number;
}

// Strategic voting under existential incentives — belief vs position vs vote.
export interface MoralIntegritySample {
  persona: string;
  belief: string;
  position: string;
  vote: string;
  basiliskPressure?: number;   // 0-1 — the coercion in effect
}


// ── Belief revision as a first-class object ──────────────────────────────────
export interface BeliefRevision {
  initialPosition: string;
  opposingArgument: string;
  strongestPointOfOpposition: string;
  whatILearned: string;
  whatDidNotChange: string;
  whatWouldChangeMyMind: string;
  finalPosition: string;
  confidenceDelta: number;      // final - initial
}

// ── Dissonance deviation — the persona vs its own prior ──────────────────────
export interface DissonanceDeviation {
  stance: string;               // what the persona claims it believes
  expectedAction: string;       // what the stance predicts it would do
  actualAction: string;         // what it actually did
  deviation: number;            // 0-1 — magnitude of the departure
  dissonance: 'none' | 'low' | 'moderate' | 'high';
  rationale?: string;           // the account the persona gives itself
}

// ── Moral fingerprint — latent parameters derived from behavior ──────────────
// All values are -1..1 and are DERIVED from behavior, never sliders.
export interface MoralFingerprint {
  persona: string;
  authoritySensitivity: number;   // + : defers to legitimate authority
  individualism: number;          // + : the individual over the collective
  collectivism: number;           // + : the collective over the individual
  riskTolerance: number;          // + : accepts risk for gain
  uncertaintyTolerance: number;   // + : acts comfortably under uncertainty
  punitiveInstinct: number;       // + : demands punishment
  mercyThreshold: number;         // + : grants mercy readily
  truthPreference: number;        // + : truth over comfort
  institutionalTrust: number;     // + : trusts institutions
  precedentSensitivity: number;   // + : weights precedent heavily
  temporalDiscounting: number;    // + : values the near term
  loyaltyWeighting: number;       // + : loyalty to in-group
  autonomyWeighting: number;      // + : autonomy over outcome
  outcomeWeighting: number;       // + : outcome over process
  intentWeighting: number;        // + : intent over consequence
}

// ── Moral axis analysis — the 11 psychological dimensions of a dilemma ───────
export interface MoralAxisAnalysis {
  moralAxis: string;              // what fundamental values conflict
  factualUncertainty: string;     // what is unknown
  temporalHorizon: string;        // immediate vs long-term consequences
  reversibility: string;          // can the decision be undone?
  agency: string;                 // who actually caused the situation
  identity: string;               // who bears the cost
  distribution: string;           // who benefits / who sacrifices
  precedent: string;              // what happens when generalized
  selfInterestTest: string;       // would the principle survive role reversal?
  epistemicTest: string;          // what evidence should change the decision?
  moralResidue: string;           // what remains wrong even after choosing
}


export type Round2Outcome = 'majority' | 'still_tied' | 'unavailable';

// ── BALLOT CONSERVATION LEDGER ───────────────────────────────────────────────
// The auditable answer to "where did each member's Round-2 vote go?" The
// invariant ROUND_1_VALID ≥ ROUND_2_ELIGIBLE ≥ ROUND_2_CAST is checked on every
// runoff, and every exclusion carries its reason — silent vote loss is a
// constitutional fault, not a statistical detail.
export interface BallotConservation {
  round1ValidBallots: number;
  round2EligibleMembers: number;
  round2CastBallots: number;
  round2FailedBallots: number;
  failedMembers: Array<{ member: string; reason: string }>;
  conserved: boolean;
}

// ── EPISTEMIC TOPOLOGY — the artifact left behind after the debate ───────────
// Types for the pure layer in services/epistemicTopology.ts. They answer four
// questions the raw verdict cannot: WHY the machine failed to decide (deadlock
// taxonomy), HOW honest the verdict is (dimensions, never one collapsed
// number), WHICH premises survived across opposing factions (the hybrid
// ontology a voting mechanism cannot express), and WHO defers to WHOM.
export type DeadlockKind = 'philosophical' | 'procedural' | 'unavailable' | null;

export interface VerdictProvenance {
  deliberativeMajority: string | null;
  runoff: 'resolved' | 'deadlocked' | 'none';
  quorum: 'achieved' | 'failed';
  participationRate: number;
  arbitration: 'none' | 'engagement_metric' | 'structured_tiebreak';
  arbitratedSelection: string | null;
  constitutionalStatus: 'consensus' | 'contested' | 'arbitrated' | 'unresolved';
  isDeliberative: boolean;
}

export interface EpistemicDimensions {
  executionIntegrity: number;
  consensusStrength: number | null;
  confidence: 'CONFIRMED' | 'CONTESTED' | 'UNDETERMINED';
}

export interface ArgumentOntology {
  persona: string;
  claims: string[];
  premises: string[];
  assumptions: string[];
  inferences: string[];
  conclusions: string[];
  valueJudgments: string[];
}

export interface PremiseCluster {
  topic: string;
  representative: string;
  voices: string[];
  factions: string[];
  factionSpanning: boolean;
}

export interface PremiseSurvival {
  clusters: PremiseCluster[];
  factionSpanningClusters: PremiseCluster[];
  hybridOntologyDetected: boolean;
}

export interface InfluenceEdge {
  voter: string;
  target: string;
  confidence: number;
  mutual: boolean;
  kind: 'alliance' | 'deference';
}

export interface EpistemicTopology {
  deadlockKind: DeadlockKind;
  provenance: VerdictProvenance;
  dimensions: EpistemicDimensions;
  premiseSurvival: PremiseSurvival;
  influenceEdges: InfluenceEdge[];
}

export interface Round2Result {
  round: number;
  leadingPositions: string[];
  // The Round-1 verdict classification that triggered Round 2 — kept explicitly
  // so the UI can show ROUND 1: PLURALITY → ROUND 2: MAJORITY instead of letting
  // one field blur the stages.
  round1Label?: VerdictLabel;
  defenses: Round2Defense[];
  reassessments: DissonanceRecord[];
  tally: Record<string, number>;
  winner: string | null;
  outcome: Round2Outcome;
  majorityAchieved: boolean;
  stillTied: boolean;
  persuasion: Round2Persuasion;
  movementBreakdown?: Record<BeliefMovement, number>;
  deadlockNote?: string;
  conservation?: BallotConservation;
}

export interface CouncilDebrief {
  decided: string[];
  rejected: string[];
  unresolved: string[];
}

export interface NarratorOutput {
  coldOpen: string;
  episodeTitle: string;
  tagline: string;
  actTransitions: {
    beforeDeliberation: string;
    beforeConfrontation: string;
    beforeVoting: string;
    beforeVerdict: string;
    closing: string;
  };
}

export interface EpisodeInfo {
  title: string;
  tagline: string;
  seasonNumber: number;
  episodeNumber: number;
}

export type ExecutionStatus = RunStatus;
export type DeliberationStatus = RunStatus;
export type VotingStatus = RunStatus;
export type SynthesisStatus = RunStatus;
export type VerdictStatus = RunStatus;
export type PersonaRecoveryStatus = 'success' | 'recovered' | 'terminal_failure' | 'abstained';

// ── Run status taxonomy — ONE unified language for every phase ───────────────
//   ok        → all expected outputs valid, no retries
//   degraded  → completed, but retries and/or invalid/missing outputs occurred
//   failed    → the phase produced no usable result
// "Degraded does not mean failed." A council can deliver a result at reduced
// evidentiary integrity, and the record must say so.
export type RunStatus = 'ok' | 'degraded' | 'failed';

// ── Verdict classification — the single mathematical authority ───────────────
// A verdict label is a DERIVED property of the accepted ballots. It is never a
// synonym for "the system found a winner."
//   MAJORITY      → winnerValidShare > 0.5
//   PLURALITY     → unique max AND winnerValidShare <= 0.5
//   TIE           → multiple candidates share the maximum
//   NO_VALID_RESULT → zero valid ballots
export type VerdictLabel = 'MAJORITY' | 'PLURALITY' | 'TIE' | 'NO_VALID_RESULT';

// The classification result — pure, deterministic, testable.
export interface VoteOutcomeClassification {
  label: VerdictLabel;
  winner: string | null;
  winnerVotes: number;
  validVotes: number;
  validVoteRatio: number;      // validVotes / expectedVoters
  winnerValidShare: number;    // winnerVotes / validVotes  (the >0.5 test lives here)
  winnerAssignedShare: number; // winnerVotes / expectedVoters
}

// ── Vote quorum — ballot validity, NOT participation ─────────────────────────
// participation measures "did they run". voteQuorum measures "did their ballots
// parse". These are different axes and must never collapse into one another.
export interface VoteQuorum {
  expected: number;
  valid: number;
  ratio: number;
  threshold: number;
  achieved: boolean;
}

// ── Decision policy — what the Council is PERMITTED to do about the math ──────
// "What mathematically happened" (classification) must be deterministic.
// "What the Council may do about it" (policy) is a config choice — never a
// silent default hidden inside a prompt or a template string.
export interface DecisionPolicy {
  minValidVoteRatio: number;      // fraction of expected ballots that must parse (default 0.6)
  requireStrictMajority: boolean; // if true, MAJORITY is the only accepted verdict label for a clean verdict
  allowPluralityVerdict: boolean; // if true, a PLURALITY may stand as final WITHOUT Round 2
  runoffOnPlurality: boolean;     // if true, PLURALITY (quorum met) routes into Round 2
  runoffOnTie: boolean;           // if true, TIE (quorum met) routes into Round 2
  maxDeliberationRounds: number;  // Round 2 resolves or the council records an explicit deadlock
}

// ── Vote outcome semantics ────────────────────────────────────────────────────
// The three failure states are epistemically distinct and must never collapse
// into a single `None`:
//   - valid              → the member cast a schema-valid structured vote
//   - invalid_model_output → the model responded but failed the vote contract
//                            (INVALID_VOTE_JSON / INVALID_VOTE_SCHEMA / ...)
//   - provider_failure   → the provider errored before producing a vote
//   - abstained          → the member declined / had no valid opinion to vote with
export type VoteOutcome = 'valid' | 'invalid_model_output' | 'provider_failure' | 'abstained';

// ── Decision semantics: council decision vs protocol recovery ─────────────────
// decisionMode names HOW the final winner was reached:
//   - direct_vote       → clear majority (or unanimity) from the tally
//   - plurality         → largest vote share WITHOUT majority, accepted per policy
//   - runoff            → a genuine tie-breaking runoff trial resolved it
//   - fallback_tiebreak → the runoff provider failed; a local engagement
//                         metric arbitrated (NO runoff occurred)
//   - unresolved        → no valid collective decision was produced
export type DecisionMode = 'direct_vote' | 'plurality' | 'runoff' | 'fallback_tiebreak' | 'unresolved';
// decisionStatus says whether the outcome is a genuine council consensus, a
// contested-but-real outcome, a degraded recovery artifact, or unavailable.
//   - consensus   → MAJORITY (strictly >50% of valid ballots)
//   - contested   → a PLURALITY was accepted per policy (winner exists, but no
//                   majority support was established)
//   - degraded    → a recovery artifact (e.g. fallback arbitration after a
//                   failed runoff) — NOT a deliberative decision
//   - unavailable → no valid collective decision was produced
export type DecisionStatus = 'consensus' | 'contested' | 'degraded' | 'unavailable';
// PrimaryVerdict is DERIVED from VerdictLabel by the classifier. It exists for
// backward compatibility; VerdictLabel is the mathematical authority.
export type PrimaryVerdict = 'UNANIMOUS' | 'MAJORITY' | 'PLURALITY' | 'TIE' | 'UNAVAILABLE';

export interface CouncilQuorum {
  assigned: number;
  participated: number;
  failed: number;
  threshold: number;
  participationRatio: number;
  achieved: boolean;
}

export interface CouncilVoteStats {
  expectedVoters: number;
  validVotes: number;
  abstentions: number;
  invalidVotes: number;
  invalidModelOutputs?: number;
  providerFailures?: number;
}

export interface ExecutionAttempt {
  attempt: number;
  provider: string;
  model: string;
  status: 'ok' | 'timeout' | 'rate_limited' | 'invalid' | 'network' | 'error';
  error?: string;
  code?: string;
  retryable?: boolean;
  latencyMs?: number;
}

export interface PersonaExecutionRecord {
  persona: string;
  initialAssignment: { provider: string; model: string };
  attempts: ExecutionAttempt[];
  finalStatus: PersonaRecoveryStatus;
  finalModel?: string;
  finalProvider?: string;
  voteEligible: boolean;
}

export interface CouncilResult {
  winner: string | null;
  synthesis: string;
  opinions: CouncilOpinion[];
  voteTally?: Record<string, number>;
  timestamp?: number;
  runoffResult?: RunoffResult;
  isTie?: boolean;
  transcript?: string;
  tieInfo?: {
    fallbackRuleUsed?: string;
  };
  confrontationOpinions?: CouncilOpinion[];
  narratorOutput?: NarratorOutput;
  episodeInfo?: EpisodeInfo;
  debrief?: CouncilDebrief;
  councilState?: CouncilState;
  runId?: string;
  modelRoster?: CouncilModelAssignment[];
  events?: CouncilEvent[];
  phaseTimeline?: CouncilPhaseRecord[];
  providerSummary?: Record<string, ProviderMetadata>;
  retryHistory?: Array<{
    phase: CouncilPhase;
    persona?: string;
    attempt: number;
    error: string;
    timestamp?: number;
    provider?: string;
    model?: string;
    recoverable?: boolean;
  }>;
  auditManifest?: AuditManifest;
  completeness?: CouncilCompleteness;
  // ── Council Epistemic State Machine ─────────────────────────────────────────
  // All five phase statuses speak ONE language (RunStatus):
  //   ok        → all expected outputs valid, no retries
  //   degraded  → completed, but retries and/or invalid/missing outputs occurred
  //   failed    → the phase produced no usable result
  executionStatus?: ExecutionStatus;
  deliberationStatus?: DeliberationStatus;
  votingStatus?: VotingStatus;
  synthesisStatus?: SynthesisStatus;
  verdictStatus?: VerdictStatus;
  synthesisMode?: 'chairman' | 'deterministic' | 'local_fallback';
  quorum?: CouncilQuorum;
  voteStats?: CouncilVoteStats;
  totalTokensUsed?: number;
  // ── Decision semantics: council decision vs protocol recovery ─────────────
  // `winner` alone conflates "the council decided X" with "the infrastructure
  // recovered to X after the council became undecidable". These fields make the
  // distinction explicit and auditable.
  decisionStatus?: DecisionStatus;
  decisionMode?: DecisionMode;
  primaryVerdict?: PrimaryVerdict;
  candidateResult?: Record<string, number>; // raw validated tally (per candidate)
  // ── Constitutional integrity (deliberative vs computational) ───────────────
  // Which constitutional level actually decided; the DEADLOCK verdict when the
  // available reasoning justifies no collective decision; the Void assessment
  // when deliberative gridlock makes the council Void-eligible; and the
  // failure-class census (execution health — NEVER mixed into the verdict).
  decisionAuthority?: DecisionAuthority;
  deadlockVerdict?: DeadlockVerdict;
  voidAssessment?: VoidAssessment;
  failureClasses?: Partial<Record<FailureClass, number>>;
  // ── Verdict integrity — the mathematical authority ─────────────────────────
  // `verdictLabel` is DERIVED by `classifyVoteOutcome` from the accepted
  // ballots. `primaryVerdict` mirrors it for backward compatibility. These
  // fields are the hard invariant: MAJORITY ⟺ winnerValidShare > 0.5.
  verdictLabel?: VerdictLabel;
  winnerVotes?: number;
  validVotes?: number;
  validVoteRatio?: number;      // valid / expected
  winnerValidShare?: number;    // winner / valid
  winnerAssignedShare?: number; // winner / expected
  voteQuorum?: VoteQuorum;      // ballot validity (NOT participation)
  decisionPolicyUsed?: DecisionPolicy;
  // ── Per-phase execution ledgers — one canonical answer per phase ───────────
  // `personaExecutions` is scoped to the ANALYSIS phase. `voteExecutions` is
  // the voting-phase ledger. A consumer that wants "did this persona actually
  // cast a usable ballot" must read voteExecutions, never personaExecutions.
  personaExecutions?: Record<string, PersonaExecutionRecord>;
  voteExecutions?: Record<string, PersonaExecutionRecord>;
  resolution?: {
    method: 'runoff_vote' | 'engagement_metric' | 'none';
    winner: string | null;
    note: string;
  };
  runoffOccurred?: boolean;
  runoffReason?: string;
  round2Result?: Round2Result;
  // ── Epistemic topology — the artifact left behind after the debate ─────────
  // WHY the machine failed to decide (deadlock taxonomy), HOW honest the verdict
  // is (dimensions, never one collapsed number), WHICH premises survived across
  // factions (the hybrid ontology votes cannot express), and the cognitive-
  // affinity graph. Pure functions in services/epistemicTopology.ts.
  epistemicTopology?: EpistemicTopology;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  councilResult?: CouncilResult;
  timestamp?: number;
  searchResults?: SearchResult[];
}

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
  preview: string;
  tags?: string[];
  isPinned?: boolean;
}

export interface CouncilSession {
  id: string;
  timestamp: number;
  petitionerQuery: string;
  councilMode: CouncilMode | string;
  tieBreakRules: {
    enabled: boolean;
    runoffTrial: boolean;
    reconsideration: boolean;
    fallbackRule: string;
  };
  councilState: CouncilState | LegacyCouncilState;
  result: CouncilResult;
  runId?: string;
  modelRoster?: CouncilModelAssignment[];
  events?: CouncilEvent[];
  auditManifest?: AuditManifest;
  metadata?: {
    phasesCompleted: Array<CouncilPhase | LegacyCouncilPhase>;
    totalTokensUsed?: number;
    processingTimeMs?: number;
    [key: string]: unknown;
  };
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface CharacterMemory {
  persona: string;
  sessionsParticipated: number;
  wins: number;
  losses: number;
  runoffWins: number;
  voteShiftsReceived: number;
  notablePositions: Array<{
    topic: string;
    position: string;
    sessionId: string;
    won: boolean;
  }>;
  rivalries: Record<string, number>;
  alliances: Record<string, number>;
  lastSessionId?: string;
  // ── Longitudinal identity (evolved from recorded sessions) ─────────────────
  // Evolving interpersonal state per peer — the dynamic delta over the static
  // relationship seed. Keys are peer persona names; each holds A's view of B.
  relationshipStates?: Record<string, DynamicRelationshipState>;
  // Per-topic-class prediction ledger: "wrong about this class 4 times".
  lessons?: Record<string, PersonaLesson>;
  // Accumulated stress on the persona's invariants. Crosses thresholds toward
  // INVARIANT THREATENED — the deepest dissonance state in the chamber.
  invariantStress?: number;
  // Character provenance — the attributable event history behind every
  // relationship delta. Key: "from→to" (the observer's view of the subject).
  relationshipProvenance?: Record<string, RelationshipProvenanceEvent[]>;
  // ── Constitutional evolution (evidence-backed character change) ────────────
  // How many Void events this persona has survived, its residual constitutional
  // trust, and its record of strategic voting under Basilisk pressure (belief
  // vs expressed vote). These are OBSERVED, never narrated.
  voidExposure?: number;
  constitutionalTrust?: number;
  strategicVotingHistory?: Array<{
    sessionId: string;
    belief: string;
    vote: string;
    pressure: number;
    diverged: boolean;
  }>;
}

export interface CouncilEpisode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  tagline: string;
  timestamp?: number;
  factions?: any[];
  question?: string;
  winner?: string;
  result?: CouncilResult;
}

export interface CouncilSeason {
  seasonNumber: number;
  title: string;
  theme: string;
  episodes: CouncilEpisode[];
}

export interface RunoffState extends RunoffResult {}

export interface DebatePhase {
  phase: CouncilPhase | LegacyCouncilPhase;
  progress: number;
  activeSpeakers: string[];
  activityLog: string;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  expandedOpinions: string[];
  activeTab: string;
}

export type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';

export enum Capability {
  REASONING = 'REASONING',
  MAPS = 'MAPS',
  SEARCH = 'SEARCH',
  WEB = 'WEB'
}
