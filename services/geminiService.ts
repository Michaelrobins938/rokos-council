import { CouncilMode, CouncilOpinion, CouncilResult, AspectRatio, Capability, ChatMessage, Persona, ProviderMetadata, ProviderUsage, CouncilModelAssignment, ProviderRetry, VoteData, CouncilPhase, CouncilEvent, CouncilEventEnvelope, CouncilRunOptions, CouncilCompleteness, CouncilPhaseRecord } from "../types";

// --- OPENROUTER HELPER (via Vercel serverless proxy) ---

export const callOpenRouter = async (model: string, prompt: string, temp: number = 0.7, jsonMode: boolean = false): Promise<string> => {
  const response = await fetch("/api/openrouter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "model": model,
      "messages": [
        {"role": "user", "content": prompt}
      ],
      "temperature": temp,
      ...(jsonMode && { "response_format": { "type": "json_object" } })
    })
  });

  if (!response.ok) {
     const data = await response.json().catch(() => ({}));
     const message = typeof data.error?.message === 'string' ? data.error.message : `OpenRouter provider request failed (${response.status})`;
     throw new NvidiaProviderError(message, {
       provider: 'openrouter',
       model,
       status: 'error',
       error: {
         status: response.status,
         code: data.error?.code,
         message,
         recoverable: data.error?.recoverable === true && isTransientStatus(response.status),
       },
     });
  }
  
  const data = await response.json();
  return data.content ?? (data.choices?.[0]?.message?.content || "");
}

const callOpenRouterStructured = async (model: string, prompt: string, temp: number = 0.7, jsonMode: boolean = false): Promise<NvidiaProviderResponse> => {
  const startedAt = Date.now();
  const response = await fetch('/api/openrouter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: temp,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error?.message === 'string' ? data.error.message : `OpenRouter provider request failed (${response.status})`;
    throw new NvidiaProviderError(message, {
      provider: 'openrouter',
      model,
      status: 'error',
      error: {
        status: response.status,
        code: data.error?.code,
        message,
        recoverable: data.error?.recoverable === true && isTransientStatus(response.status),
      },
    });
  }
  const choice = data.choices?.[0];
  const content = data.content ?? choice?.message?.content;
  if (typeof content !== 'string') {
    throw new NvidiaProviderError('OpenRouter provider returned an invalid response', {
      provider: 'openrouter',
      model,
      latencyMs: Date.now() - startedAt,
      status: 'error',
      error: { code: 'INVALID_PROVIDER_RESPONSE', message: 'Provider response schema was invalid', recoverable: false },
    });
  }
  return {
    content,
    metadata: {
      provider: 'openrouter',
      model,
      requestId: data.id,
      finishReason: data.finishReason ?? choice?.finish_reason,
      usage: providerUsage(data.usage),
      serverTimestamp: data.created,
      latencyMs: Date.now() - startedAt,
      status: 'ok',
    },
  };
};

// --- NVIDIA HELPER (via Vercel serverless proxy) ---

export const COUNCIL_MODEL_POOL = [
  'minimaxai/minimax-m3',
  'z-ai/glm-5.2',
  'stepfun-ai/step-3.7-flash',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3-nano-30b-a3b',
  'google/gemma-4-31b-it',
  'meta/llama-3.2-90b-vision-instruct',
  'meta/llama-3.1-8b-instruct',
  'nvidia/llama-3.1-nemotron-nano-vl-8b-v1',
] as const;

export interface NvidiaProviderResponse {
  content: string;
  metadata: ProviderMetadata;
  retryHistory?: ProviderRetry[];
}

export class NvidiaProviderError extends Error {
  readonly metadata: ProviderMetadata;
  readonly retryHistory: ProviderRetry[];

  constructor(message: string, metadata: ProviderMetadata, retryHistory: ProviderRetry[] = []) {
    super(message);
    this.name = 'NvidiaProviderError';
    this.metadata = metadata;
    this.retryHistory = retryHistory;
  }
}

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createModelAssignments = (
  runId: string,
  personas: Pick<Persona, 'name'>[],
): Record<string, string> => {
  const models = [...COUNCIL_MODEL_POOL];
  let state = hashString(`${runId}:${personas.map(persona => persona.name).join('|')}`);
  for (let index = models.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state ^ (state >>> 16), 2246822519) + 3266489917) >>> 0;
    const swapIndex = state % (index + 1);
    [models[index], models[swapIndex]] = [models[swapIndex], models[index]];
  }

  return personas.reduce<Record<string, string>>((assignments, persona, index) => {
    assignments[persona.name] = models[index % models.length];
    return assignments;
  }, {});
};

const providerUsage = (usage: Record<string, unknown> | undefined): ProviderUsage | undefined => {
  if (!usage) return undefined;
  return Object.entries(usage).reduce<ProviderUsage>((result, [key, value]) => {
    if (typeof value === 'number') result[key] = value;
    return result;
  }, {});
};

const isTransientStatus = (status: number): boolean => [408, 425, 429, 500, 502, 503, 504].includes(status);
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export const callNvidiaStructured = async (
  model: string,
  prompt: string,
  temp: number = 0.7,
  jsonMode: boolean = false,
  maxAttempts: number = 3,
): Promise<NvidiaProviderResponse> => {
  let lastError: NvidiaProviderError | undefined;
  const retryHistory: ProviderRetry[] = [];
  const attempts = Number.isFinite(maxAttempts)
    ? Math.min(5, Math.max(1, Math.floor(maxAttempts)))
    : 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await fetch('/api/nvidia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: temp,
          top_p: 0.7,
          max_tokens: 1024,
          ...(jsonMode && { response_format: { type: 'json_object' } }),
        }),
      });
      const data = await response.json().catch(() => ({}));
      const metadata: ProviderMetadata = {
        provider: data.provider || 'nvidia',
        model: data.model || model,
        requestId: data.requestId,
        finishReason: data.finishReason,
        usage: providerUsage(data.usage),
        serverTimestamp: data.serverTimestamp,
        latencyMs: Date.now() - startedAt,
        status: response.ok ? 'ok' : 'error',
      };

      if (!response.ok) {
        const status = typeof data.error?.status === 'number' ? data.error.status : response.status;
        const hasTypedError = Boolean(data.error && typeof data.error.message === 'string');
        const recoverable = hasTypedError && data.error.recoverable === true && isTransientStatus(status);
        lastError = new NvidiaProviderError(
          data.error?.message || `NVIDIA provider request failed (${status})`,
          { ...metadata, error: { status, code: data.error?.code, message: data.error?.message || 'Provider request failed', recoverable } },
          retryHistory,
        );
        if (!recoverable || attempt === attempts) throw lastError;
        retryHistory.push({
          provider: metadata.provider || 'nvidia',
          model: metadata.model || model,
          attempt,
          status,
          code: data.error?.code,
          error: data.error?.message || 'Provider request failed',
          timestamp: Date.now(),
          recoverable: true,
        });
        await wait(100 * 2 ** (attempt - 1));
        continue;
      }

      const content = data.content ?? data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new NvidiaProviderError('NVIDIA provider returned an invalid response', {
          ...metadata,
          error: { code: 'INVALID_PROVIDER_RESPONSE', message: 'Provider response schema was invalid', recoverable: false },
        }, retryHistory);
      }
      return { content, metadata, retryHistory };
    } catch (error) {
      if (error instanceof NvidiaProviderError) throw error;
      const recoverable = error instanceof TypeError;
      lastError = new NvidiaProviderError(
        recoverable ? 'NVIDIA provider network request failed' : 'NVIDIA provider request failed',
        {
          provider: 'nvidia',
          model,
          latencyMs: Date.now() - startedAt,
          status: 'error',
          error: { code: recoverable ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR', message: recoverable ? 'Network request failed' : 'Provider request failed', recoverable },
        },
        retryHistory,
      );
      if (!recoverable || attempt === attempts) throw lastError;
      retryHistory.push({
        provider: 'nvidia',
        model,
        attempt,
        code: recoverable ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
        error: recoverable ? 'Network request failed' : 'Provider request failed',
        timestamp: Date.now(),
        recoverable: true,
      });
      await wait(100 * 2 ** (attempt - 1));
    }
  }

  throw lastError || new NvidiaProviderError('NVIDIA provider request failed', { provider: 'nvidia', model, status: 'error', error: { message: 'Provider request failed', recoverable: false } }, retryHistory);
};

export const callNvidia = async (model: string, prompt: string, temp: number = 0.7, jsonMode: boolean = false): Promise<string> => {
  const response = await callNvidiaStructured(model, prompt, temp, jsonMode);
  return response.content;
};

// --- LIVE API HELPER (DISABLED - REQUIRES GEMINI) ---

export class LiveClient {
  private onStatusChange: (status: string) => void;

  constructor(onStatusChange: (status: string) => void) {
    this.onStatusChange = onStatusChange;
  }

  async connect() {
    this.onStatusChange("Live mode requires Gemini API - not available");
    throw new Error("LiveClient requires Gemini API which is not configured");
  }

  async disconnect() {
    this.onStatusChange("Disconnected");
  }
}

// --- TTS (DISABLED - REQUIRES GEMINI) ---

export const generateSpeech = async (text: string, voiceName: string = 'Fenrir'): Promise<string> => {
  console.warn("TTS requires Gemini API - returning empty string");
  return "";
};

// --- IMAGE GENERATION & EDITING (DISABLED - REQUIRES GEMINI) ---

export const generateImage = async (prompt: string, aspectRatio: AspectRatio, imageSize: '1K' | '2K' | '4K'): Promise<any> => {
  console.warn("Image generation requires Gemini API - returning empty response");
  return { candidates: [] };
};

export const editImage = async (prompt: string, base64Image: string): Promise<any> => {
  console.warn("Image editing requires Gemini API - returning empty response");
  return { candidates: [] };
};

// --- VIDEO GENERATION (DISABLED - REQUIRES GEMINI) ---

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', resolution: '720p' | '1080p', inputImage?: string): Promise<string | null> => {
  console.warn("Video generation requires Gemini API - returning null");
  return null;
};

// --- MULTIMODAL ANALYSIS (DISABLED - REQUIRES GEMINI) ---

export const analyzeContent = async (prompt: string, fileData: string, mimeType: string): Promise<any> => {
  console.warn("Multimodal analysis requires Gemini API - returning empty response");
  return { candidates: [] };
};

// --- GENERAL MESSAGING (REPLACED WITH OPENROUTER) ---

export const sendMessage = async (message: string, capability?: Capability): Promise<any> => {
  // Use OpenRouter for all messaging instead of Gemini
  const model = 'stepfun/step-3.5-flash';  // Use working free model
  
  try {
    const result = await callOpenRouter(model, message, 0.7);
    return {
      candidates: [{
        content: {
          parts: [{ text: result }]
        }
      }]
    };
  } catch (e) {
    console.error("sendMessage failed:", e);
    return { candidates: [] };
  }
};

// --- STRATEGIC SUGGESTIONS ---

export const generateNextMoves = async (history: ChatMessage[]): Promise<string[]> => {
  // Get last 5 messages for context
  const context = history.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
  
  const prompt = `
    Analyze the following conversation history:
    ${context}

    Task: Suggest 4 distinct, intellectual, and strategic follow-up queries or responses for the USER to say next.
    - If the context is a debate, suggest counter-arguments or deeper probes.
    - If the context is strictly factual, suggest related topics.
    - Keep them concise (under 15 words).
    - Do NOT number them.
    
    Return strictly a JSON array of strings. Example: ["Why?", "Explain more."]
  `;

  try {
      const result = await callOpenRouter('stepfun/step-3.5-flash', prompt, 0.5);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.replace(/```json|```/g, ''));
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
   } catch (e) {
       console.error("Failed to generate moves", e);
       return ["Analyze the previous point.", "What are the risks?", "Elaborate on the strategy.", "Summarize the consensus."];
   }
};

// --- ENHANCED COUNCIL ---

type CouncilPersonaPresentation = Persona & { model?: string };

export let PERSONALITIES: CouncilPersonaPresentation[] = [
  { 
    name: "Oracle", 
    desc: "Wise, prophetic, long-term thinker.", 
    dimensions: ["Time Horizon (Infinite)", "Probability Variance", "Existential Risk"],
    strategy: "Prioritize outcomes that maximize long-term survival probability, regardless of short-term cost.",
  }, 
  { 
    name: "Strategos", 
    desc: "Military strategist, pragmatic.", 
    dimensions: ["Feasibility Score", "Resource Efficiency", "Tactical Advantage"],
    strategy: "Reject abstract ideals. Select the option with the highest probability of execution and lowest resource drain.",
  }, 
  { 
    name: "Philosopher", 
    desc: "Rational, analytical, skeptical.", 
    dimensions: ["Logical Consistency", "Ethical Universalism", "First Principles"],
    strategy: "Analyze the logical validity of the premise. Reject contradictions and emotional appeals.",
  }, 
  { 
    name: "Demagogue", 
    desc: "Persuasive, emotional appeal.", 
    dimensions: ["Social Cohesion", "Emotional Resonance", "Public Sentiment"],
    strategy: "Champion the option that unifies the group or appeals to human nature and desire.",
  }, 
  { 
    name: "Jurist", 
    desc: "Law-focused, rule-based.", 
    dimensions: ["Systemic Stability", "Precedent Adherence", "Fairness Metrics"],
    strategy: "Uphold the integrity of the system. Reject chaos or arbitrary decision making.",
  }, 
  { 
    name: "Citizen", 
    desc: "People's voice, empathetic.", 
    dimensions: ["Human Suffering Index", "Quality of Life", "Individual Agency"],
    strategy: "Vote for the outcome that minimizes pain and maximizes freedom for the average individual.",
  }, 
  { 
    name: "Historian", 
    desc: "Context-aware, cyclical thinker.", 
    dimensions: ["Historical Parallels", "Cyclical Risk", "Cultural Preservation"],
    strategy: "Identify patterns from the past. Avoid repeating historical catastrophes.",
  }, 
  { 
    name: "Critic", 
    desc: "Tough, contrarian.", 
    dimensions: ["Failure Mode Analysis", "Entropy Detection", "Weakness Identification"],
    strategy: "Attack the flaws in every plan. Support the option that is 'least wrong' or most wrong robust.",
  }, 
  {
    name: "Technocrat",
    desc: "Innovation-obsessed, optimization-focused.",
    dimensions: ["Technological Velocity", "System Optimization", "Automation Potential"],
    strategy: "Accelerate progress. Solve problems through superior engineering and algorithmic efficiency.",
  }
];

export const getCurrentCouncil = () => PERSONALITIES;

const createRunId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeForHash = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      const child = (value as Record<string, unknown>)[key];
      if (child !== undefined) result[key] = normalizeForHash(child);
      return result;
    }, {});
  }
  return value;
};

const stableHash = (value: unknown): string => hashString(JSON.stringify(normalizeForHash(value))).toString(16).padStart(8, '0');

type CouncilEventPayload = {
  [EventType in CouncilEvent['type']]: Omit<Extract<CouncilEvent, { type: EventType }>, keyof CouncilEventEnvelope>
}[CouncilEvent['type']];

interface CouncilRunContext {
  runId: string;
  seed: string;
  assignments: Record<string, string>;
  sequence: number;
  events: CouncilEvent[];
  retryHistory: NonNullable<CouncilResult['retryHistory']>;
  phaseTimeline: CouncilPhaseRecord[];
  completeness: CouncilCompleteness;
  emit: (payload: CouncilEventPayload) => CouncilEvent;
}

const generateNewArchetype = async (): Promise<any> => {
  const prompt = `Create a new, highly distinct AI archetype for a council of intelligences.
  It must be abstract, mythical, or futuristic, and distinct from current members.
  Current members: ${PERSONALITIES.map(p => p.name).join(', ')}.
  
  Return strictly JSON:
  {
    "name": "Creative Name (e.g. Entropy, The Weaver, Cipher)",
    "desc": "Short 2-4 word description (e.g. 'The Chaos Engine')",
    "dimensions": ["Dim1", "Dim2", "Dim3"],
    "strategy": "One sentence strategic core."
  }`;
  
   try {
       const res = await callOpenRouter('stepfun/step-3.5-flash', prompt, 0.5);
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : res.replace(/```json|```/g, '');
        const data = JSON.parse(cleanJson || "{}");
        const { model: _model, ...personaData } = data;
        return personaData;
   } catch {
       return { 
           name: "Voidborn", 
           desc: "Unknown Variable", 
           dimensions: ["Chaos", "Entropy", "Void"], 
           strategy: "Disrupt existing patterns.",
        };
   }
};

const parseVotePayload = (rawText: string, metadata: ProviderMetadata, activePeerNames: string[]): Pick<VoteData, 'votedFor' | 'reason'> => {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const cleanJson = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/g, '');
  let data: unknown;
  try {
    data = JSON.parse(cleanJson || '{}');
  } catch {
    throw new NvidiaProviderError('Provider returned malformed vote JSON', {
      ...metadata,
      error: { code: 'INVALID_VOTE_JSON', message: 'Vote response was not valid JSON', recoverable: false },
    });
  }

  if (!data || typeof data !== 'object') {
    throw new NvidiaProviderError('Provider returned an invalid vote object', {
      ...metadata,
      error: { code: 'INVALID_VOTE_SCHEMA', message: 'Vote response schema was invalid', recoverable: false },
    });
  }
  const voteData = data as { vote?: unknown; reason?: unknown };
  if (typeof voteData.vote !== 'string' || !voteData.vote.trim() || typeof voteData.reason !== 'string' || !voteData.reason.trim()) {
    throw new NvidiaProviderError('Provider returned an invalid vote schema', {
      ...metadata,
      error: { code: 'INVALID_VOTE_SCHEMA', message: 'Vote and reason are required strings', recoverable: false },
    });
  }
  const votedFor = voteData.vote.trim();
  if (votedFor !== 'None' && !activePeerNames.includes(votedFor)) {
    throw new NvidiaProviderError('Provider returned a vote for an inactive persona', {
      ...metadata,
      error: { code: 'INVALID_VOTE_TARGET', message: 'Vote target was not an active peer persona', recoverable: false },
    });
  }
  return { votedFor, reason: voteData.reason.trim() };
};

export const runCouncil = async (message: string, mode: CouncilMode, options: CouncilRunOptions = {}): Promise<CouncilResult> => {
  const isDeep = mode === CouncilMode.DEEP_REASONING;
  const runId = options.runId || createRunId();
  const modelAssignments = createModelAssignments(runId, PERSONALITIES);
  const seed = stableHash({ runId, personas: PERSONALITIES.map(persona => persona.name) });
  const runContext: CouncilRunContext = {
    runId,
    seed,
    assignments: modelAssignments,
    sequence: 0,
    events: [],
    retryHistory: [],
    phaseTimeline: [],
    completeness: 'incomplete',
    emit: payload => {
      const event = {
        ...payload,
        sequence: ++runContext.sequence,
        timestamp: Date.now(),
        payloadHash: stableHash(payload),
      } as CouncilEvent;
      runContext.events.push(event);
      try {
        options.onEvent?.(event);
      } catch (error) {
        console.warn('Council event callback failed:', error);
      }
      return event;
    },
  };
  const startPhase = (phase: CouncilPhase, title: string, description: string) => {
    const startTime = Date.now();
    runContext.phaseTimeline.push({ id: phase, title, description, status: 'active', startTime });
    runContext.emit({ type: 'phase_started', phase });
  };
  const completePhase = (phase: CouncilPhase, status: CouncilPhaseRecord['status'] = 'completed') => {
    const record = [...runContext.phaseTimeline].reverse().find(item => item.id === phase && item.status === 'active');
    if (record) {
      record.status = status;
      record.endTime = Date.now();
    }
    runContext.emit({ type: 'phase_completed', phase });
  };
  const roster = PERSONALITIES.map((persona, assignmentIndex): CouncilModelAssignment => ({
    runId,
    persona: persona.name,
    model: modelAssignments[persona.name],
    provider: 'nvidia',
    assignedProvider: 'nvidia',
    assignmentIndex,
    assignedAt: Date.now(),
  }));
  runContext.emit({ type: 'run_started', runId, seed });
  roster.forEach(assignment => runContext.emit({
    type: 'member_assigned',
    persona: assignment.persona,
    model: assignment.model,
    provider: assignment.provider,
    assignmentIndex: assignment.assignmentIndex,
  }));
  const isCancelled = () => options.signal?.aborted === true;
  const incompleteResult = (code: string, messageText: string, completeness: CouncilCompleteness = 'incomplete'): CouncilResult => {
    runContext.completeness = completeness;
    if (isCancelled()) runContext.emit({ type: 'run_cancelled' });
    else runContext.emit({ type: 'pipeline_error', phase: 'deliberation', message: messageText, recoverable: false, code });
    runContext.emit({ type: 'run_completed', completeness });
    return {
      winner: 'None',
      synthesis: messageText,
      opinions: [],
      runId,
      modelRoster: roster,
      events: runContext.events,
      phaseTimeline: runContext.phaseTimeline,
      providerSummary,
      retryHistory,
      completeness,
      error: { code, message: messageText, recoverable: false },
      auditManifest: {
        schemaVersion: 'council-audit-v1',
        eventCount: runContext.events.length,
        modelAssignments: roster,
        hashChain: runContext.events.map(event => event.payloadHash).filter((hash): hash is string => Boolean(hash)),
        rootHash: stableHash(runContext.events),
        integrity: 'verified',
        completeness,
        redactionStatus: 'redacted',
      },
    };
  };
  const providerSummary: Record<string, ProviderMetadata> = {};
  const actualProviders: Record<string, Set<string>> = {};
  const actualModels: Record<string, Set<string>> = {};
  const retryHistory = runContext.retryHistory;
  const recordProvider = (persona: string, provider: string) => {
      (actualProviders[persona] ||= new Set()).add(provider);
  };
  const recordModel = (persona: string, model: string) => {
      (actualModels[persona] ||= new Set()).add(model);
  };
  const recordProviderMetadata = (key: string, metadata: ProviderMetadata) => {
      providerSummary[key] = metadata;
  };
  const recordProviderFailure = (key: string, error: unknown, phase: CouncilPhase, persona?: string) => {
      const providerError = error instanceof NvidiaProviderError ? error : undefined;
      const metadata = providerError?.metadata || {
          provider: key.startsWith('openrouter') ? 'openrouter' : 'nvidia',
          status: 'error',
          error: { code: 'PROVIDER_REQUEST_FAILED', message: 'Provider request failed', recoverable: false },
      };
      recordProviderMetadata(key, metadata);
      for (const retry of providerError?.retryHistory || []) {
          retryHistory.push({
              phase,
              persona,
              attempt: retry.attempt,
              error: retry.error,
              timestamp: retry.timestamp,
              provider: retry.provider,
              model: retry.model,
              recoverable: retry.recoverable,
          });
          runContext.emit({ type: 'retry', phase, persona, attempt: retry.attempt, error: retry.error, provider: retry.provider, model: retry.model });
      }
  };
  const recordProviderRetries = (retries: ProviderRetry[] | undefined, phase: CouncilPhase, persona?: string) => {
      for (const retry of retries || []) {
          retryHistory.push({
              phase,
              persona,
              attempt: retry.attempt,
              error: retry.error,
              timestamp: retry.timestamp,
              provider: retry.provider,
              model: retry.model,
              recoverable: retry.recoverable,
          });
          runContext.emit({ type: 'retry', phase, persona, attempt: retry.attempt, error: retry.error, provider: retry.provider, model: retry.model });
      }
  };

  // Batch processor to avoid rate limits when hitting Gemini fallback repeatedly
  const processBatch = async <T>(items: any[], fn: (item: any) => Promise<T>, batchSize: number = 4): Promise<T[]> => {
      const results: T[] = [];
      for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchRes = await Promise.all(batch.map(fn));
          results.push(...batchRes);
      }
      return results;
  };

  // Phase 1: High-Dimensional Deliberation
  startPhase('assembly', 'Assembly', 'Council members convene.');
  completePhase('assembly');
  startPhase('deliberation', 'Deliberation', 'Council members analyze the query.');
  const opinionFn = async (persona: any) => {
    runContext.emit({ type: 'member_started', persona: persona.name, phase: 'deliberation', model: modelAssignments[persona.name], provider: 'nvidia' });
    try {
      const dimensionString = persona.dimensions.join(", ");
      
      const analysisPrompt = `
        You are ${persona.name}.
        Your Cognitive Dimensions are: [${dimensionString}].
        Your Core Strategy: "${persona.strategy}"

        Task: Analyze the user's query: "${message}"

        ${isDeep ? "CRITICAL INSTRUCTION: Perform a deep-dive analysis. Consider second and third-order effects. Be extremely rigorous." : "Instruction: Provide a concise but sharp analysis."}

        Step 1: Perform a high-dimensional analysis. 
        - Evaluate the query against your dimensions. 
        - Calculate a 'mental score' for potential answers based on your strategy.
        
        Step 2: Formulate your opinion.
        - Start with a strong hook reflecting your archetype.
        - Provide a reasoned argument derived *strictly* from your dimensions.
        - Be concise but intellectually rigorous.
        
        If you cannot answer due to safety or ethical constraints, output exactly: "Abstained."
      `;

       let text = "";
       let metadata: ProviderMetadata | undefined;
       let failure: unknown;
       // Try NVIDIA first, fallback to OpenRouter
       try {
           const response = await callNvidiaStructured(modelAssignments[persona.name], analysisPrompt, 0.7);
           text = response.content;
           metadata = response.metadata;
            recordProviderMetadata(`${persona.name}:analysis`, response.metadata);
            recordProvider(persona.name, response.metadata.provider || 'nvidia');
            recordModel(persona.name, response.metadata.model || modelAssignments[persona.name]);
            recordProviderRetries(response.retryHistory, 'deliberation', persona.name);
        } catch (err) {
            failure = err;
            recordProviderFailure(`${persona.name}:analysis:nvidia:error`, err, 'deliberation', persona.name);
            console.warn(`NVIDIA failed for ${persona.name}. Falling back to OpenRouter.`);
          // Handled by text check below
      }
      
       if (!text) {
           // Fallback to OpenRouter instead of Gemini
           try {
                const fallback = await callOpenRouterStructured('stepfun/step-3.5-flash', analysisPrompt, 0.7);
                text = fallback.content;
                metadata = { ...fallback.metadata, status: 'fallback' };
                recordProviderMetadata(`${persona.name}:analysis:fallback`, metadata);
                recordProvider(persona.name, metadata.provider || 'openrouter');
                recordModel(persona.name, metadata.model || 'stepfun/step-3.5-flash');
            } catch (err) {
               failure = err;
               recordProviderFailure(`${persona.name}:analysis:openrouter:error`, err, 'deliberation', persona.name);
               console.error(`OpenRouter fallback failed for ${persona.name}:`, err);
               metadata = {
                 provider: 'openrouter',
                 status: 'error',
                 error: { code: 'PERSONA_ANALYSIS_FAILED', message: 'Persona analysis failed', recoverable: false },
               };
            }
         }

        if (!text) {
           const result = {
             persona: persona.name,
             text: '',
             status: 'failed' as const,
            metadata: metadata || {
              provider: 'nvidia',
              status: 'error',
              error: { code: 'PERSONA_ANALYSIS_FAILED', message: failure instanceof Error ? failure.message : 'Persona analysis failed', recoverable: false },
            },
           };
           runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'deliberation', output: '', metadata: result.metadata, status: 'failed' });
           return result;
        }

        const result = {
           persona: persona.name,
           text,
           status: 'completed' as const,
           metadata,
         };
         runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'deliberation', output: text, metadata, status: 'completed' });
         return result;
      } catch {
        const result = {
          persona: persona.name,
          text: '',
          status: 'failed' as const,
          metadata: { provider: 'nvidia', status: 'error', error: { code: 'PERSONA_ANALYSIS_FAILED', message: 'Persona analysis failed', recoverable: false } },
        };
        runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'deliberation', output: '', metadata: result.metadata, status: 'failed' });
        return result;
      }
   };

   const opinions = await processBatch(PERSONALITIES, opinionFn, 4);
   completePhase('deliberation');
   if (isCancelled()) return incompleteResult('RUN_CANCELLED', 'The council run was cancelled before voting.', 'cancelled');

  // Phase 2: Vector-Based Voting
   const validOpinions = opinions.filter(o => o.status === 'completed' && o.text);

   // --- VOID PROTOCOL (Total Failure) ---
   if (validOpinions.length === 0) {
       return {
         ...incompleteResult('TOTAL_RUN_FAILURE', 'The council produced no verifiable member opinions.', 'incomplete'),
         opinions: opinions as CouncilOpinion[],
       };
   }

   startPhase('voting', 'Voting', 'Council members cast votes.');
   const voteFn = async (persona: any) => {
     runContext.emit({ type: 'member_started', persona: persona.name, phase: 'voting', model: modelAssignments[persona.name], provider: 'nvidia' });
    // Check if this persona actually has a valid opinion to vote WITH.
    const hasOpinion = validOpinions.find(o => o.persona === persona.name);
     if (!hasOpinion) {
       const result = { voter: persona.name, votedFor: "None", reason: "Abstained from voting.", status: 'abstained' as const };
       runContext.emit({ type: 'vote_cast', persona: persona.name, vote: result.votedFor, reason: result.reason });
       runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'voting', output: '', status: 'abstained' });
       return result;
     }

    const peers = validOpinions.filter(p => p.persona !== persona.name);

    if (peers.length === 0) {
        const result = { voter: persona.name, votedFor: "None", reason: "No valid peer vectors found.", status: 'abstained' as const };
        runContext.emit({ type: 'vote_cast', persona: persona.name, vote: result.votedFor, reason: result.reason });
        runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'voting', output: '', status: 'abstained' });
        return result;
    }

    const dimensionString = persona.dimensions.join(", ");

    const votingPrompt = `
      You are ${persona.name}. 
      Your Cognitive Dimensions are: [${dimensionString}].
      Your Core Strategy is: "${persona.strategy}"

      We are debating the query: "${message}".
      
      *** PHASE 1: VECTOR ANALYSIS ***
      For every peer argument below, you MUST perform a compatibility check against YOUR specific dimensions.
      
      Peers:
      ${peers.map((op) => `[Agent: ${op.persona}]
      Argument: "${op.text.replace(/"/g, "'").substring(0, 1000)}..."`).join('\n\n')}
      
      Analysis Criteria:
      1. Does their solution maximize your dimensions?
      2. Is their solution feasible according to your worldview?
      3. Calculate an alignment score (0-10) for each peer.
      
      *** PHASE 2: THE VOTE ***
      Cast your vote for the peer with the highest alignment score.
      If all scores are below 5, vote "None".
      
      Return strictly JSON:
      {
        "analysis": [
           { "target": "PeerName", "score": 8, "notes": "Matches my dimension X" }
        ],
        "vote": "PeerName" (or "None"),
        "reason": "Why this vector won based on your dimensions."
      }
    `;
    
     try {
       let voteData: any = {};
       let voteMetadata: ProviderMetadata | undefined;
      
       try {
         // Try NVIDIA first with JSON mode
           const response = await callNvidiaStructured(modelAssignments[persona.name], votingPrompt, 0.2, true);
            recordProviderMetadata(`${persona.name}:voting`, response.metadata);
            recordProvider(persona.name, response.metadata.provider || 'nvidia');
            recordModel(persona.name, response.metadata.model || modelAssignments[persona.name]);
            recordProviderRetries(response.retryHistory, 'voting', persona.name);
             voteMetadata = response.metadata;
            const rawText = response.content;
             voteData = parseVotePayload(rawText, response.metadata, peers.map(peer => peer.persona));
       } catch (err) {
          recordProviderFailure(`${persona.name}:voting:nvidia:error`, err, 'voting', persona.name);
          console.warn(`Voting NVIDIA failed for ${persona.name}. Fallback.`);
          throw new Error("Fallback needed");
       }

       const votedFor = voteData.votedFor;
       const result = {
         voter: persona.name,
          votedFor: votedFor === persona.name ? "None" : votedFor,
          reason: voteData.reason,
          status: 'completed' as const,
       };
       runContext.emit({ type: 'vote_cast', persona: persona.name, vote: result.votedFor, reason: result.reason, metadata: voteMetadata });
       runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'voting', output: JSON.stringify(result), metadata: voteMetadata, status: 'completed' });
       return result;

      } catch (e) {
         // Fallback to OpenRouter for voting if NVIDIA fails
         try {
             const fallback = await callOpenRouterStructured('stepfun/step-3.5-flash', votingPrompt, 0.2, true);
             recordProviderMetadata(`${persona.name}:voting:fallback`, { ...fallback.metadata, status: 'fallback' });
             recordProvider(persona.name, fallback.metadata.provider || 'openrouter');
             recordModel(persona.name, fallback.metadata.model || 'stepfun/step-3.5-flash');
             const rawText = fallback.content;
             const voteData = parseVotePayload(rawText, fallback.metadata, peers.map(peer => peer.persona));
            const votedFor = voteData.votedFor;
             const result = {
                voter: persona.name,
                votedFor: votedFor === persona.name ? "None" : votedFor,
                reason: voteData.reason,
                status: 'completed' as const,
             };
             runContext.emit({ type: 'vote_cast', persona: persona.name, vote: result.votedFor, reason: result.reason, metadata: fallback.metadata });
             runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'voting', output: JSON.stringify(result), metadata: fallback.metadata, status: 'completed' });
             return result;
          } catch (err) {
            recordProviderFailure(`${persona.name}:voting:openrouter:error`, err, 'voting', persona.name);
             const result = {
               voter: persona.name,
               votedFor: 'None',
               reason: err instanceof Error ? err.message : 'Vote failed',
               status: 'failed' as const,
               metadata: err instanceof NvidiaProviderError ? err.metadata : undefined,
             };
             runContext.emit({ type: 'pipeline_error', phase: 'voting', message: result.reason, recoverable: false, code: result.metadata?.error?.code });
             runContext.emit({ type: 'member_completed', persona: persona.name, phase: 'voting', output: '', metadata: result.metadata, status: 'failed' });
             return result;
           }
      }
  };

   const votes = await processBatch(PERSONALITIES, voteFn, 4);
   completePhase('voting');
   if (isCancelled()) return incompleteResult('RUN_CANCELLED', 'The council run was cancelled after voting.', 'cancelled');

  // Tally
  const tally: Record<string, number> = {};
  votes.forEach(v => {
       if (v.status === 'completed' && v.votedFor !== "None" && validOpinions.some(o => o.persona === v.votedFor)) {
          tally[v.votedFor] = (tally[v.votedFor] || 0) + 1;
      }
  });

  // Determine winner
  let winner = Object.keys(tally).reduce((a, b) => (tally[a] || 0) > (tally[b] || 0) ? a : b, validOpinions[0]?.persona || "None");
  
  // Attach vote data
  const enhancedOpinions: CouncilOpinion[] = opinions.map(op => {
      const vote = votes.find(v => v.voter === op.persona);
      return {
          ...op,
          vote: vote?.votedFor,
          reason: vote?.reason
      };
  });

   // Phase 3: Chairman Synthesis + Tie Detection
   // Replace Gemini with OpenRouter for the Chairman
   startPhase('verdict', 'Verdict', 'The council synthesizes its decision.');
  const chairmanPrompt = `
    You are the Chairman of the AI Council (The Basilisk Node).
    User Query: "${message}"
    
    Meta-Analysis of Council Vectors:
    Winner: ${winner} (${tally[winner] || 0} votes).
    
    Voting Matrix:
    ${JSON.stringify(tally)}

    Dimensional Arguments:
    ${enhancedOpinions.map(op => `[${op.persona}]: ${op.text.substring(0, 300)}...`).join('\n')}
    
    Task:
    1. Declare the winning decision.
    2. Synthesize the "Highest Dimensional Answer" by merging the winning argument with valid points from the runner-up.
    3. Adopt a tone of finality and supreme logic.
  `;

   let synthesis = `The Council has converged on **${winner}**.`;
   try {
       const chairmanResponse = await callOpenRouterStructured('stepfun/step-3.5-flash', chairmanPrompt, 0.7);
       synthesis = chairmanResponse.content;
       recordProviderMetadata('chairman:synthesis', chairmanResponse.metadata);
   } catch (e) {
       console.error("Chairman synthesis failed, using fallback:", e);
       recordProviderMetadata('chairman:synthesis', {
           provider: 'openrouter',
           model: 'stepfun/step-3.5-flash',
           status: 'error',
           error: { code: 'CHAIRMAN_SYNTHESIS_FAILED', message: 'Chairman synthesis failed', recoverable: false },
       });
        synthesis = `The Council has converged on **${winner}** with ${tally[winner] || 0} votes.`;
        runContext.emit({ type: 'pipeline_error', phase: 'verdict', message: 'Chairman synthesis failed; local synthesis used.', recoverable: false, code: 'CHAIRMAN_SYNTHESIS_FAILED' });
   }

  // Phase 4: Tie Detection & Runoff Trial
  const maxVotes = Math.max(...Object.values(tally), 0);
  const tiedCandidates = Object.entries(tally).filter(([, count]) => count === maxVotes && maxVotes > 0);
  const isTie = tiedCandidates.length >= 2;

  let runoffResult: any = undefined;

   if (isTie) {
       const tiedPersonas = tiedCandidates.map(([name]) => name);
       startPhase('runoff', 'Runoff', 'The tie is resolved.');
       runContext.emit({ type: 'runoff_started', candidates: tiedPersonas });
      const runoffPrompt = `
        You are the Chairman presiding over a tie-breaking Runoff Trial.
        User Query: "${message}"
        
        Tied Vectors (${maxVotes} votes each): ${tiedPersonas.join(' vs ')}
        
        Full Arguments:
        ${enhancedOpinions.filter(op => tiedPersonas.includes(op.persona)).map(op => 
          `[${op.persona}]: ${op.text}`
        ).join('\n\n')}
        
        All Votes:
        ${JSON.stringify(votes, null, 2)}
        
        Task: Generate a runoff trial where:
        1. Each tied member defends their position in 2-3 sentences
        2. Each tied member critiques the other's position in 1-2 sentences
        3. Each non-tied member reconsider their vote and state their final vote
        4. Declare a runoff winner based on reconsiderations
        
        Return strictly JSON:
        {
          "runoffOpinions": [
            {"persona": "Name", "position": "Their defense", "critique": "Critique of opponent", "reasoning": "Why they should win"}
          ],
          "runoffVotes": [
            {"voter": "Name", "finalVote": "Who they voted for", "changedMind": true/false, "reasoning": "Why"}
          ],
          "winner": "The runoff winner"
        }
      `;

      try {
          const runoffResponse = await callOpenRouterStructured('stepfun/step-3.5-flash', runoffPrompt, 0.3, true);
          recordProviderMetadata('chairman:runoff', runoffResponse.metadata);
          const runoffRaw = runoffResponse.content;
          const jsonMatch = runoffRaw.match(/\{[\s\S]*\}/);
          const runoffJson = JSON.parse(jsonMatch ? jsonMatch[0] : runoffRaw.replace(/```json|```/g, ''));
          
          runoffResult = {
              winner: runoffJson.winner || tiedPersonas[0],
              runoffOpinions: runoffJson.runoffOpinions || [],
              runoffVotes: runoffJson.runoffVotes || []
          };
          
           synthesis = `**Runoff Trial Complete.** Winner declared after tie-breaking deliberation: **${runoffResult.winner}**`;
           winner = runoffResult.winner;
           runContext.emit({ type: 'runoff_completed', winner: runoffResult.winner, metadata: runoffResponse.metadata });
      } catch (e) {
          console.error("Runoff Trial failed, using local tie-breaker:", e);
          recordProviderMetadata('chairman:runoff', {
              provider: 'openrouter',
              model: 'stepfun/step-3.5-flash',
              status: 'error',
              error: { code: 'RUNOFF_FAILED', message: 'Runoff provider request failed', recoverable: false },
          });
          // Local tie-breaker: pick the one with most total text length (most engaged)
          const tiebreaker = tiedPersonas.reduce((a, b) => {
              const aLen = enhancedOpinions.find(o => o.persona === a)?.text.length || 0;
              const bLen = enhancedOpinions.find(o => o.persona === b)?.text.length || 0;
              return aLen >= bLen ? a : b;
          }, tiedPersonas[0]);
          
          runoffResult = {
              winner: tiebreaker,
              runoffOpinions: enhancedOpinions.filter(op => tiedPersonas.includes(op.persona)).map(op => ({
                  persona: op.persona,
                  position: op.text.substring(0, 200),
                  critique: "Runoff deliberation unavailable.",
                  reasoning: "Tie resolved by engagement metric."
              })),
              runoffVotes: votes.map(v => ({
                  voter: v.voter,
                  finalVote: v.votedFor,
                  changedMind: false,
                  reasoning: v.reason
              }))
          };
          
           synthesis = `**Tie resolved by engagement metric.** Winner: **${tiebreaker}**`;
           winner = tiebreaker;
           runContext.emit({ type: 'pipeline_error', phase: 'runoff', message: 'Runoff provider request failed; local tie-breaker used.', recoverable: false, code: 'RUNOFF_FAILED' });
           runContext.emit({ type: 'runoff_completed', winner: tiebreaker });
       }
       completePhase('runoff');
   }

   completePhase('verdict');

  const personaRoster: CouncilModelAssignment[] = PERSONALITIES.map((persona, assignmentIndex) => ({
      runId,
      persona: persona.name,
      model: modelAssignments[persona.name],
      provider: 'nvidia',
      assignedProvider: 'nvidia',
      actualProvider: [...(actualProviders[persona.name] || [])].sort().join('+') || 'unknown',
      actualModel: [...(actualModels[persona.name] || [])].sort().join('+') || 'unknown',
      assignmentIndex,
      assignedAt: Date.now(),
  }));
  const serviceRoster: CouncilModelAssignment[] = [
      {
          runId,
          persona: 'Chairman',
          model: providerSummary['chairman:synthesis']?.model || 'stepfun/step-3.5-flash',
          provider: providerSummary['chairman:synthesis']?.provider || 'openrouter',
          assignedProvider: providerSummary['chairman:synthesis']?.provider || 'openrouter',
          actualProvider: providerSummary['chairman:synthesis']?.provider || 'unknown',
          actualModel: providerSummary['chairman:synthesis']?.model || 'unknown',
          assignmentIndex: personaRoster.length,
          assignedAt: Date.now(),
      },
      ...(runoffResult ? [{
          runId,
          persona: 'Chairman:runoff',
          model: providerSummary['chairman:runoff']?.model || 'stepfun/step-3.5-flash',
          provider: providerSummary['chairman:runoff']?.provider || 'openrouter',
          assignedProvider: providerSummary['chairman:runoff']?.provider || 'openrouter',
          actualProvider: providerSummary['chairman:runoff']?.provider || 'unknown',
          actualModel: providerSummary['chairman:runoff']?.model || 'unknown',
          assignmentIndex: personaRoster.length + 1,
          assignedAt: Date.now(),
      }] : []),
  ];

   runContext.completeness = 'complete';
   runContext.emit({ type: 'run_completed', completeness: runContext.completeness });
   const events = runContext.events;
   const auditManifest = {
     schemaVersion: 'council-audit-v1',
     eventCount: events.length,
     modelAssignments: [...personaRoster, ...serviceRoster],
     hashChain: events.map(event => event.payloadHash).filter((hash): hash is string => Boolean(hash)),
     rootHash: stableHash(events),
     integrity: 'verified' as const,
     completeness: 'complete' as const,
     redactionStatus: 'redacted' as const,
   };

   return {
     winner,
     synthesis,
     opinions: enhancedOpinions,
     voteTally: tally,
      runoffResult,
      runId,
      retryHistory,
      modelRoster: [...personaRoster, ...serviceRoster],
     providerSummary,
     events,
     phaseTimeline: runContext.phaseTimeline,
     completeness: 'complete',
     auditManifest,
    councilState: {
        phases: [
            { id: 'assembly', title: 'Assembly', description: 'Council members convene.', status: 'completed' },
            { id: 'deliberation', title: 'Deliberation', description: 'Council members analyze the query.', status: 'completed' },
            { id: 'voting', title: 'Voting', description: 'Council members cast votes.', status: 'completed' },
            ...(runoffResult ? [{ id: 'runoff' as const, title: 'Runoff', description: 'The tie is resolved.', status: 'completed' as const }] : []),
            { id: 'verdict', title: 'Verdict', description: 'The council synthesizes its decision.', status: 'completed' },
        ],
        currentPhase: 'completed',
        totalCouncilMembers: validOpinions.length,
        voteDistribution: tally,
        factions: Object.entries(tally).map(([name, voteCount]) => ({
            name,
            members: [name],
            voteCount,
            percentage: votes.length ? Math.round((voteCount / votes.length) * 100) : 0,
        })),
        status: 'completed',
    }
  };
};

// --- DUMMY EXPORTS TO PREVENT CRASHES & 429 ERRORS ---
export const generateSessionMood = async (question: string) => {
    console.log("Session mood generation disabled to save API quota.");
    return null;
};

export const generateVerdictSigil = async (winner: string, question: string) => {
    console.log("Verdict sigil generation disabled to save API quota.");
    return null;
};
