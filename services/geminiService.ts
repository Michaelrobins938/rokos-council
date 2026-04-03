import { CouncilMode, CouncilOpinion, CouncilResult, AspectRatio, Capability, ChatMessage } from "../types";

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
     const errText = await response.text().catch(() => '');
     throw new Error(`OpenRouter Error: ${response.status} ${response.statusText} ${errText}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// --- NVIDIA HELPER (via Vercel serverless proxy) ---

export const callNvidia = async (model: string, prompt: string, temp: number = 0.7, jsonMode: boolean = false): Promise<string> => {
  const response = await fetch("/api/nvidia", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": model,
      "messages": [
        {"role": "user", "content": prompt}
      ],
      "temperature": temp,
      "top_p": 0.7,
      "max_tokens": 1024
    })
  });

  if (!response.ok) {
     throw new Error(`NVIDIA Error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

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

export let PERSONALITIES = [
  { 
    name: "Oracle", 
    desc: "Wise, prophetic, long-term thinker. [NVIDIA Seed-OSS-36B]", 
    dimensions: ["Time Horizon (Infinite)", "Probability Variance", "Existential Risk"],
    strategy: "Prioritize outcomes that maximize long-term survival probability, regardless of short-term cost.",
    model: "nvidia/seed-oss-36b" 
  },
  { 
    name: "Strategos", 
    desc: "Military strategist, pragmatic. [NVIDIA GLM-5]", 
    dimensions: ["Feasibility Score", "Resource Efficiency", "Tactical Advantage"],
    strategy: "Reject abstract ideals. Select the option with the highest probability of execution and lowest resource drain.",
    model: "nvidia/glm-5" 
  },
  { 
    name: "Philosopher", 
    desc: "Rational, analytical, skeptical. [NVIDIA DeepSeek-V3.2]", 
    dimensions: ["Logical Consistency", "Ethical Universalism", "First Principles"],
    strategy: "Analyze the logical validity of the premise. Reject contradictions and emotional appeals.",
    model: "nvidia/deepseek-v3.2" 
  },
  { 
    name: "Demagogue", 
    desc: "Persuasive, emotional appeal. [NVIDIA Qwen3.5-397B]", 
    dimensions: ["Social Cohesion", "Emotional Resonance", "Public Sentiment"],
    strategy: "Champion the option that unifies the group or appeals to human nature and desire.",
    model: "nvidia/qwen3.5-397b-a17b" 
  },
  { 
    name: "Jurist", 
    desc: "Law-focused, rule-based. [NVIDIA Devstral-2-123B]", 
    dimensions: ["Systemic Stability", "Precedent Adherence", "Fairness Metrics"],
    strategy: "Uphold the integrity of the system. Reject chaos or arbitrary decision making.",
    model: "nvidia/devstral-2-123b" 
  },
  { 
    name: "Citizen", 
    desc: "People's voice, empathetic. [NVIDIA Step-3.5-Flash]", 
    dimensions: ["Human Suffering Index", "Quality of Life", "Individual Agency"],
    strategy: "Vote for the outcome that minimizes pain and maximizes freedom for the average individual.",
    model: "nvidia/step-3.5-flash" 
  },
  { 
    name: "Historian", 
    desc: "Context-aware, cyclical thinker. [NVIDIA Seed-OSS-36B]", 
    dimensions: ["Historical Parallels", "Cyclical Risk", "Cultural Preservation"],
    strategy: "Identify patterns from the past. Avoid repeating historical catastrophes.",
    model: "nvidia/seed-oss-36b" 
  },
  { 
    name: "Critic", 
    desc: "Tough, contrarian. [NVIDIA DeepSeek-V3.2]", 
    dimensions: ["Failure Mode Analysis", "Entropy Detection", "Weakness Identification"],
    strategy: "Attack the flaws in every plan. Support the option that is 'least wrong' or most wrong robust.",
    model: "nvidia/deepseek-v3.2" 
  },
  {
    name: "Technocrat",
    desc: "Innovation-obsessed, optimization-focused. [NVIDIA Boltz-2]",
    dimensions: ["Technological Velocity", "System Optimization", "Automation Potential"],
    strategy: "Accelerate progress. Solve problems through superior engineering and algorithmic efficiency.",
    model: "nvidia/boltz-2" 
  }
];

export const getCurrentCouncil = () => PERSONALITIES;

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
       // Assign a random NVIDIA model to new archetypes
       const nvidiaModels = [
           "nvidia/qwen3.5-397b-a17b", 
           "nvidia/glm-5", 
           "nvidia/step-3.5-flash",
           "nvidia/deepseek-v3.2",
           "nvidia/devstral-2-123b",
           "nvidia/seed-oss-36b"
       ];
       data.model = nvidiaModels[Math.floor(Math.random() * nvidiaModels.length)];
       return data;
   } catch {
       return { 
           name: "Voidborn", 
           desc: "Unknown Variable", 
           dimensions: ["Chaos", "Entropy", "Void"], 
           strategy: "Disrupt existing patterns.",
           model: "nvidia/step-3.5-flash"  // Use valid fallback
       };
   }
};

export const runCouncil = async (message: string, mode: CouncilMode): Promise<CouncilResult> => {
  const isDeep = mode === CouncilMode.DEEP_REASONING;

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
  const opinionFn = async (persona: any) => {
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
      // Try NVIDIA first, fallback to OpenRouter
      try {
          text = await callNvidia(persona.model, analysisPrompt, 0.7);
      } catch (err) {
          console.warn(`NVIDIA failed for ${persona.name} (${persona.model}). Falling back to OpenRouter.`);
          // Handled by text check below
      }
      
       if (!text) {
           // Fallback to OpenRouter instead of Gemini
           try {
              text = await callOpenRouter('stepfun/step-3.5-flash', analysisPrompt, 0.7);
           } catch (err) {
              console.error(`OpenRouter fallback failed for ${persona.name}:`, err);
              text = "Analysis failed.";
           }
        }

      return {
        persona: persona.name,
        text: text || "Analysis failed due to cognitive dissonance."
      };
    } catch {
      return { persona: persona.name, text: "Abstained." };
    }
  };

  const opinions = await processBatch(PERSONALITIES, opinionFn, 4);

  // Phase 2: Vector-Based Voting
  const validOpinions = opinions.filter(o => o.text && !o.text.includes("Abstained.") && o.text !== "Analysis failed due to cognitive dissonance.");

  // --- VOID PROTOCOL (Total Failure) ---
  if (validOpinions.length === 0) {
      const victimIndex = Math.floor(Math.random() * PERSONALITIES.length);
      const victim = PERSONALITIES[victimIndex];
      
      const newPersona = await generateNewArchetype();
      
      // Fallback defaults
      if(!newPersona.name) newPersona.name = "Voidborn";
      if(!newPersona.desc) newPersona.desc = "Unknown Variable";
      if(!newPersona.dimensions) newPersona.dimensions = ["Chaos", "Entropy", "Void"];
      if(!newPersona.strategy) newPersona.strategy = "Disrupt existing patterns.";
      if(!newPersona.model) newPersona.model = "nvidia/step-3.5-flash";  // Valid fallback
      
      PERSONALITIES[victimIndex] = newPersona;
      
      return {
          winner: "THE VOID",
          synthesis: `## ⚠️ CRITICAL COGNITIVE FAILURE ⚠️\n\nThe Council has failed to reach a consensus. All vectors have stagnated or refused the query.\n\n**THE VOID PROTOCOL INITIATED.**\n\n> **ERASED:** ${victim.name}\n> **INSTANTIATED:** ${newPersona.name} (${newPersona.desc})\n> **DIMENSIONS:** [${newPersona.dimensions.join(', ')}]\n\nThe Council has been recompiled. Please submit a new query to the updated matrix.`,
          opinions: []
      };
  }

  const voteFn = async (persona: any) => {
    // Check if this persona actually has a valid opinion to vote WITH.
    const hasOpinion = validOpinions.find(o => o.persona === persona.name);
    if (!hasOpinion) return { voter: persona.name, votedFor: "None", reason: "Abstained from voting." };

    const peers = validOpinions.filter(p => p.persona !== persona.name);

    if (peers.length === 0) {
        return { voter: persona.name, votedFor: "None", reason: "No valid peer vectors found." };
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
      
      try {
         // Try NVIDIA first with JSON mode
         const rawText = await callNvidia(persona.model, votingPrompt, 0.2, true);
         // Extract JSON block if it exists, otherwise try to parse the whole string
         const jsonMatch = rawText.match(/\{[\s\S]*\}/);
         const cleanJson = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/g, '');
         voteData = JSON.parse(cleanJson || "{}");
      } catch (err) {
         console.warn(`Voting NVIDIA failed for ${persona.name}. Fallback.`);
         throw new Error("Fallback needed");
      }

      const votedFor = voteData.vote || "None";
      return {
        voter: persona.name,
        votedFor: votedFor === persona.name ? "None" : votedFor,
        reason: voteData.reason || "Insufficient data for consensus."
      };

      } catch (e) {
         // Fallback to OpenRouter for voting if NVIDIA fails
         try {
           const rawText = await callOpenRouter('stepfun/step-3.5-flash', votingPrompt, 0.2);
           const jsonMatch = rawText.match(/\{[\s\S]*\}/);
           const cleanJson = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/g, '');
           const voteData = JSON.parse(cleanJson || "{}");
           const votedFor = voteData.vote || "None";
           return {
              voter: persona.name,
              votedFor: votedFor === persona.name ? "None" : votedFor,
              reason: voteData.reason || "Insufficient data for consensus."
           };
         } catch (err) {
           return { voter: persona.name, votedFor: "None", reason: "Vector analysis failed." };
         }
      }
  };

  const votes = await processBatch(PERSONALITIES, voteFn, 4);

  // Tally
  const tally: Record<string, number> = {};
  votes.forEach(v => {
      if (v.votedFor !== "None" && validOpinions.some(o => o.persona === v.votedFor)) {
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
      synthesis = await callOpenRouter('stepfun/step-3.5-flash', chairmanPrompt, 0.7);
   } catch (e) {
       console.error("Chairman synthesis failed, using fallback:", e);
       synthesis = `The Council has converged on **${winner}** with ${tally[winner] || 0} votes.`;
   }

  // Phase 4: Tie Detection & Runoff Trial
  const maxVotes = Math.max(...Object.values(tally), 0);
  const tiedCandidates = Object.entries(tally).filter(([, count]) => count === maxVotes && maxVotes > 0);
  const isTie = tiedCandidates.length >= 2;

  let runoffResult: any = undefined;

  if (isTie) {
      const tiedPersonas = tiedCandidates.map(([name]) => name);
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
          const runoffRaw = await callOpenRouter('stepfun/step-3.5-flash', runoffPrompt, 0.3);
          const jsonMatch = runoffRaw.match(/\{[\s\S]*\}/);
          const runoffJson = JSON.parse(jsonMatch ? jsonMatch[0] : runoffRaw.replace(/```json|```/g, ''));
          
          runoffResult = {
              winner: runoffJson.winner || tiedPersonas[0],
              runoffOpinions: runoffJson.runoffOpinions || [],
              runoffVotes: runoffJson.runoffVotes || []
          };
          
          synthesis = `**Runoff Trial Complete.** Winner declared after tie-breaking deliberation: **${runoffResult.winner}**`;
          winner = runoffResult.winner;
      } catch (e) {
          console.error("Runoff Trial failed, using local tie-breaker:", e);
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
      }
  }

  return {
    winner,
    synthesis,
    opinions: enhancedOpinions,
    voteTally: tally,
    runoffResult,
    councilState: {
        totalCouncilMembers: validOpinions.length,
        factions: Object.keys(tally)
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