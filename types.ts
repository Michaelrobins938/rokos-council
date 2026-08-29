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
  | { type: 'vote_cast'; persona: string; vote: string; reason?: string; scores?: Array<{ target: string; score: number; notes: string }>; metadata?: ProviderMetadata }
  | { type: 'runoff_started'; candidates: string[] }
  | { type: 'runoff_completed'; winner: string; metadata?: ProviderMetadata }
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

export interface CouncilResult {
  winner: string;
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
