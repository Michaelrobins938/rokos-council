import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { CouncilMode, CouncilOpinion, CouncilResult, AspectRatio, Capability, ChatMessage } from "../types";

const getAIClient = async (requiresPaidKey = false): Promise<GoogleGenAI> => {
  const win = window as any;
  if (requiresPaidKey && win.aistudio) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
    }
    // For paid models, use the key from the selector
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  // For free models, use the standard environment key
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

// --- NVIDIA HELPER ---

let nvidiaKeyIndex = 0;
const getNvidiaKey = () => {
  const keys = [
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3
  ].filter(Boolean);
  
  if (keys.length === 0) return null;
  const key = keys[nvidiaKeyIndex % keys.length];
  nvidiaKeyIndex++;
  return key;
};

const callNvidia = async (model: string, prompt: string, temp: number = 0.7, jsonMode: boolean = false): Promise<string> => {
  const apiKey = getNvidiaKey();
  if (!apiKey) throw new Error("No NVIDIA Key available");

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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

// --- LIVE API HELPER ---

export class LiveClient {
  private ai: GoogleGenAI | null = null;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private onStatusChange: (status: string) => void;

  constructor(onStatusChange: (status: string) => void) {
    this.onStatusChange = onStatusChange;
  }

  async connect() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
      callbacks: {
        onopen: () => {
          this.onStatusChange("Connected");
          this.startAudioInput(stream);
        },
        onmessage: async (message: any) => {
          // Handle Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            this.playAudioChunk(base64Audio);
          }
          
          // Handle Interruption
          if (message.serverContent?.interrupted) {
             this.stopAudioPlayback();
          }
        },
        onclose: () => this.onStatusChange("Disconnected"),
        onerror: (e) => {
          console.error(e);
          this.onStatusChange("Error");
        }
      }
    });
  }

  private startAudioInput(stream: MediaStream) {
    if (!this.inputAudioContext) return;
    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private createBlob(data: Float32Array) {
     const l = data.length;
     const int16 = new Int16Array(l);
     for (let i = 0; i < l; i++) {
       int16[i] = data[i] * 32768;
     }
     // Simple base64 encode for the blob data part
     let binary = '';
     const bytes = new Uint8Array(int16.buffer);
     const len = bytes.byteLength;
     for (let i = 0; i < len; i++) {
       binary += String.fromCharCode(bytes[i]);
     }
     const b64 = btoa(binary);

     return {
       data: b64,
       mimeType: 'audio/pcm;rate=16000'
     };
  }

  private async playAudioChunk(base64: string) {
    if (!this.outputAudioContext || !this.outputNode) return;
    
    // Base64 decode
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // PCM Decode
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = this.outputAudioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputNode);
    
    // Schedule
    this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  private stopAudioPlayback() {
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async disconnect() {
    this.stopAudioPlayback();
    if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
    }
    if (this.inputSource) this.inputSource.disconnect();
    if (this.inputAudioContext) this.inputAudioContext.close();
    if (this.outputAudioContext) this.outputAudioContext.close();
    
    // Close session
    this.sessionPromise?.then(session => session.close());
  }
}

// --- TTS ---

export const generateSpeech = async (text: string, voiceName: string = 'Fenrir'): Promise<string> => {
  const ai = await getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: { parts: [{ text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");
  return base64Audio;
};

// --- IMAGE GENERATION & EDITING ---

export const generateImage = async (prompt: string, aspectRatio: AspectRatio, imageSize: '1K' | '2K' | '4K'): Promise<GenerateContentResponse> => {
  const requiresPaidKey = imageSize === '2K' || imageSize === '4K';
  const ai = await getAIClient(requiresPaidKey);
  const model = requiresPaidKey ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
  
  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio,
    }
  };

  if (requiresPaidKey) {
    config.imageConfig.imageSize = imageSize;
  }

  return await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config
  });
};

export const editImage = async (prompt: string, base64Image: string): Promise<GenerateContentResponse> => {
  const ai = await getAIClient();
  const model = 'gemini-2.5-flash-image';
  
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.match(/data:([^;]+);base64,/)?.[1] || 'image/png';

  return await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        { text: prompt },
      ],
    },
  });
};

// --- VIDEO GENERATION ---

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', resolution: '720p' | '1080p', inputImage?: string): Promise<string | null> => {
  const ai = await getAIClient(true);
  const model = 'veo-3.1-generate-preview'; 
  
  const config: any = {
    numberOfVideos: 1,
    resolution: resolution,
    aspectRatio: aspectRatio,
  };

  let operation;
  if (inputImage) {
     const mimeType = inputImage.match(/data:([^;]+);base64,/)?.[1] || 'image/png';
     const base64Data = inputImage.split(',')[1] || inputImage;
     operation = await ai.models.generateVideos({
        model,
        prompt,
        image: {
            imageBytes: base64Data,
            mimeType: mimeType
        },
        config
     });
  } else {
     operation = await ai.models.generateVideos({
        model,
        prompt,
        config
     });
  }

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (videoUri) {
      return `${videoUri}&key=${process.env.API_KEY}`;
  }
  return null;
};

// --- MULTIMODAL ANALYSIS ---

export const analyzeContent = async (prompt: string, fileData: string, mimeType: string): Promise<GenerateContentResponse> => {
  const ai = await getAIClient();
  const model = 'gemini-3.1-pro-preview';

  const base64Data = fileData.split(',')[1] || fileData;

  return await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        { text: prompt },
      ],
    },
  });
};

// --- GENERAL MESSAGING (WITH CAPABILITIES) ---

export const sendMessage = async (message: string, capability?: Capability): Promise<GenerateContentResponse> => {
    const ai = await getAIClient();
    
    if (capability === Capability.MAPS) {
        return await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message,
            config: {
                tools: [{googleMaps: {}}],
            },
        });
    }

    if (capability === Capability.REASONING) {
        return await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: message,
        });
    }

    return await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: message,
    });
};

// --- STRATEGIC SUGGESTIONS ---

export const generateNextMoves = async (history: ChatMessage[]): Promise<string[]> => {
  const ai = await getAIClient();
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
      const result = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: { parts: [{ text: prompt }] },
        config: { 
            responseMimeType: 'application/json',
            temperature: 0.5
        }
      });
      const parsed = JSON.parse(result.text || "[]");
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
  const ai = await getAIClient();
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
      const res = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: 'application/json' }
      });
      const data = JSON.parse(res.text || "{}");
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
          model: "deepseek/deepseek-r1:free"
      };
  }
};

export const runCouncil = async (message: string, mode: CouncilMode): Promise<CouncilResult> => {
  const ai = await getAIClient();
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
      // Hybrid Engine: Try NVIDIA specific model first, fallback to Gemini
      if (persona.model && process.env.NVIDIA_API_KEY) {
         try {
             text = await callNvidia(persona.model, analysisPrompt, 0.7);
         } catch (err) {
             console.warn(`NVIDIA failed for ${persona.name} (${persona.model}). Falling back to Gemini.`);
             // Handled by text check below
         }
      } 
      
      if (!text) {
         // Default to Gemini if no OpenRouter key or failure
         const res = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview', 
            contents: { parts: [{ text: analysisPrompt }] },
            config: { temperature: 0.7 }
         });
         text = res.text || "Analysis failed.";
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
      if(!newPersona.model) newPersona.model = "deepseek/deepseek-r1:free";
      
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
      
      if (persona.model && process.env.NVIDIA_API_KEY) {
          try {
             // Use JSON mode for voting if possible
             const rawText = await callNvidia(persona.model, votingPrompt, 0.2, true);
             // Extract JSON block if it exists, otherwise try to parse the whole string
             const jsonMatch = rawText.match(/\{[\s\S]*\}/);
             const cleanJson = jsonMatch ? jsonMatch[0] : rawText.replace(/```json|```/g, '');
             voteData = JSON.parse(cleanJson || "{}");
          } catch (err) {
             console.warn(`Voting NVIDIA failed for ${persona.name}. Fallback.`);
             throw new Error("Fallback needed");
          }
      } else {
         throw new Error("Fallback needed");
      }

      const votedFor = voteData.vote || "None";
      return {
        voter: persona.name,
        votedFor: votedFor === persona.name ? "None" : votedFor,
        reason: voteData.reason || "Insufficient data for consensus."
      };

    } catch (e) {
       // Fallback to Gemini for voting if OpenRouter fails
       try {
         const res = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: { parts: [{ text: votingPrompt }] },
            config: { 
                responseMimeType: "application/json",
                temperature: 0.2 
            }
         });
         const voteData = JSON.parse(res.text || "{}");
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

  // Phase 3: Chairman Synthesis (Gemini 3.0 Pro)
  // In DEEP_REASONING mode, we enable thinking tokens for the Chairman.
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
     const chairmanConfig: any = {};
     if (isDeep) {
         chairmanConfig.thinkingConfig = { thinkingBudget: 16384 }; // Enable thinking for deep mode
     }

     const chairmanRes = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview', 
        contents: { parts: [{ text: chairmanPrompt }] },
        config: chairmanConfig
     });
     if (chairmanRes.text) synthesis = chairmanRes.text;
  } catch (e) {
      console.error("Chairman synthesis failed", e);
  }

  return {
    winner,
    synthesis,
    opinions: enhancedOpinions
  };
};