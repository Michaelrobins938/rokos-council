export enum CouncilMode {
  STANDARD = 'STANDARD', // Fast, 2.5 Flash for agents, 3.0 Pro for Chairman
  DEEP_REASONING = 'DEEP_REASONING' // 3.0 Pro + Thinking for Chairman, more rigorous agent prompts
}

export interface Persona {
  name: string;
  desc: string;
  dimensions: string[];
  strategy: string;
  model: string;
  color?: string;
  icon?: string;
  tagline?: string;
  voice?: string;
}

export interface VoteData {
  voter: string;
  votedFor: string;
  reason: string;
  score?: number;
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

export interface CouncilOpinion {
  persona: string;
  text: string;
  vote?: string;
  reason?: string;
  score?: number;
}

export interface CouncilResult {
  winner: string;
  synthesis: string;
  opinions: CouncilOpinion[];
  voteTally?: Record<string, number>;
  timestamp?: number;
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

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface DebatePhase {
  phase: 'IDLE' | 'DOORS' | 'ASSEMBLY' | 'DELIBERATING' | 'VOTING' | 'VERDICT';
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

export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";

export enum Capability {
  REASONING = 'REASONING',
  MAPS = 'MAPS',
  SEARCH = 'SEARCH',
  WEB = 'WEB'
}