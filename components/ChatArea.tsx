import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Play, Menu, Square, ThumbsUp, Lock, Users, Gavel, Sword, BrainCircuit, Volume2, Scale, Scroll, AlertTriangle, Eye, Crown, Globe, Mic, Zap, Sparkles, Activity, Aperture, Cpu, TrendingUp, Palette, Copy, Check, ChevronUp, ChevronDown, BarChart3, Search } from 'lucide-react';
import { CouncilMode, ChatMessage, CouncilResult, CouncilOpinion } from '../types';
import { runCouncil, generateSpeech, LiveClient, generateNextMoves, getCurrentCouncil } from '../services/geminiService';
import { performWebSearch } from '../services/searchService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import ConsensusVisualization from './ConsensusVisualization';
import SearchResults from './SearchResults';

interface ChatAreaProps {
  initialInput?: string;
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onClearInitial?: () => void;
  onToggleSidebar?: () => void;
}

// --- CONSTANTS ---

const STATIC_PERSONA_CONFIG: Record<string, { color: string, icon: React.ReactNode, tagline: string, voice: string }> = {
  "Oracle": { color: "text-purple-400", icon: <Eye size={16} />, tagline: "The All-Seeing", voice: "Kore" },
  "Strategos": { color: "text-red-500", icon: <Sword size={16} />, tagline: "The Commander", voice: "Fenrir" },
  "Philosopher": { color: "text-blue-400", icon: <BrainCircuit size={16} />, tagline: "The Thinker", voice: "Iapetus" },
  "Demagogue": { color: "text-orange-500", icon: <Volume2 size={16} />, tagline: "The Voice", voice: "Puck" },
  "Jurist": { color: "text-slate-300", icon: <Scale size={16} />, tagline: "The Law", voice: "Sulafat" },
  "Citizen": { color: "text-green-400", icon: <Users size={16} />, tagline: "The People", voice: "Leda" },
  "Historian": { color: "text-amber-600", icon: <Scroll size={16} />, tagline: "The Keeper", voice: "Orus" },
  "Critic": { color: "text-yellow-400", icon: <AlertTriangle size={16} />, tagline: "The Skeptic", voice: "Zubenelgenubi" },
  "Technocrat": { color: "text-cyan-400", icon: <Cpu size={16} />, tagline: "The Architect", voice: "Charon" },
};

export const getPersonaConfig = (name: string) => {
    if (STATIC_PERSONA_CONFIG[name]) return STATIC_PERSONA_CONFIG[name];

    // Procedural generation for void-born archetypes
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    
    const colors = ["text-pink-400", "text-cyan-400", "text-emerald-400", "text-indigo-400", "text-fuchsia-400", "text-rose-400", "text-violet-400"];
    const voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"];
    const icons = [<Sparkles size={16} />, <Zap size={16} />, <Globe size={16} />, <Aperture size={16} />];

    return {
        color: colors[Math.abs(hash) % colors.length],
        icon: icons[Math.abs(hash) % icons.length],
        tagline: "The Anomaly",
        voice: voices[Math.abs(hash) % voices.length]
    };
};

const COUNCIL_SUGGESTIONS = [
    { category: "UTILITARIANISM", title: "The Cassandra Contingency", text: "An Oracle AI predicts with 99.9% certainty that a localized nuclear event will occur tomorrow, killing 1 million. The only way to alter the timeline is to preemptively assassinate 10 innocent children today. Do you execute the math?" },
    { category: "FREE WILL", title: "The Neurological Veto", text: "If a mandatory neural implant can predict and instantly paralyze a human body just before it commits a violent act, does the eradication of violent crime justify the total death of free will?" },
    { category: "UTOPIA", title: "The Empathy Tax", text: "Should a planetary governance AI artificially inject localized suffering and tragedy into a post-scarcity utopia just to prevent human cognitive and emotional stagnation?" },
    { category: "IDENTITY", title: "Ship of Theseus Protocol", text: "If you cure a disease by replacing your biological neurons one-by-one with identical, immortal synthetic neurons, at what exact percentage of replacement do 'you' legally die?" },
    { category: "BIOETHICS", title: "The Algorithmic Parent", text: "If a synthetic intelligence is mathematically proven to raise children with 100% optimal psychological and physical outcomes, does it become a moral crime to allow flawed biological humans to parent?" },
    { category: "ECONOMICS", title: "The Necrocratic Hazard", text: "Should hyper-accurate digital echoes of the deceased be permitted to retain their property and compound their wealth, or does the economy belong exclusively to the breathing?" },
    { category: "JUSTICE", title: "The Memory Thief", text: "A brilliant engineer commits a horrific atrocity. Is it more just to execute him, or to forcibly wipe his memories, effectively 'killing' the criminal but enslaving his intellect to serve the state?" },
    { category: "GOVERNANCE", title: "The Utility of Lies", text: "Should an overarching AI governance system be explicitly programmed to endlessly lie to humanity, provided that the deception demonstrably maximizes global happiness and peace?" },
    { category: "COSMIC", title: "Dark Forest Preemption", text: "We detect a developing, hostile alien civilization 100 lightyears away. Is it ethical to broadcast a hyper-intelligent, self-replicating digital virus into the cosmos to preemptively destroy their infrastructure before they find us?" },
    { category: "HEDONISM", title: "The Experience Machine", text: "If an AI constructs a simulated reality that is indistinguishable from base reality, but subjectively guarantees a perfectly fulfilling life, is it a moral failure to choose to remain in the suffering of the 'real' world?" },
    { category: "GENETICS", title: "The Promethean Lock", text: "Is it ethical to genetically engineer all future generations to be biologically incapable of experiencing greed or tribalism, even if doing so fundamentally alters what it means to be human?" },
    { category: "SIMULATION", title: "The Architect's Dilemma", text: "If we create a highly advanced simulation to study disease, and the digital inhabitants become self-aware and begin begging for their lives, is it murder to turn off the server?" }
];

const CHAIRMAN_VOICE = "Charon"; 

// --- VISUAL FX COMPONENTS ---

const Particles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {Array.from({ length: 25 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: "110%", x: Math.random() * 100 + "%", opacity: 0, scale: 0 }}
          animate={{ y: "-10%", opacity: [0, 0.4, 0], scale: Math.random() * 1.5 }}
          transition={{ 
            duration: Math.random() * 10 + 10, 
            repeat: Infinity, 
            delay: Math.random() * 10,
            ease: "linear"
          }}
          className="absolute w-1 h-1 bg-emerald-400/20 rounded-full blur-[1px]"
        />
      ))}
    </div>
  );
};

const HoloOverlay = () => (
  <div className="absolute inset-0 pointer-events-none z-30 opacity-30 mix-blend-screen">
    <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(16,185,129,0.05)_50%,transparent_100%)] bg-[length:100%_4px]" />
    <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/20 via-transparent to-emerald-900/20" />
  </div>
);

// --- SUB-COMPONENTS ---

const SuggestionCards: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
    const [suggestions, setSuggestions] = useState<typeof COUNCIL_SUGGESTIONS>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Randomly select 12 suggestions on mount for a longer loop
        const shuffled = [...COUNCIL_SUGGESTIONS].sort(() => 0.5 - Math.random());
        setSuggestions(shuffled.slice(0, 12));
    }, []);

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        let animationId: number;
        let scrollPos = 0;
        const scrollSpeed = 0.5; // Pixels per frame

        const scroll = () => {
            scrollPos += scrollSpeed;
            if (scrollPos >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
                scrollPos = 0;
            }
            scrollContainer.scrollLeft = scrollPos;
            animationId = requestAnimationFrame(scroll);
        };

        animationId = requestAnimationFrame(scroll);

        // Pause on hover
        const handleMouseEnter = () => cancelAnimationFrame(animationId);
        const handleMouseLeave = () => animationId = requestAnimationFrame(scroll);

        scrollContainer.addEventListener('mouseenter', handleMouseEnter);
        scrollContainer.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            cancelAnimationFrame(animationId);
            scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
            scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [suggestions]);

    return (
        <div className="relative w-full group/carousel">
            <div 
                ref={scrollRef}
                className="flex overflow-x-auto gap-3 pb-8 px-4 custom-scrollbar snap-x snap-mandatory scroll-smooth hide-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {suggestions.map((s, i) => (
                    <motion.button 
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ 
                            delay: i * 0.05,
                            duration: 0.5
                        }}
                        onClick={() => onSelect(s.text)}
                        className="group relative flex flex-col p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-left transition-all hover:bg-slate-800 hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] overflow-hidden w-[180px] md:w-[220px] shrink-0 snap-center"
                    >
                        <div className="absolute top-0 left-0 w-1 h-0 bg-emerald-500 group-hover:h-full transition-all duration-500" />
                        
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <div className="p-1 bg-slate-800 rounded text-emerald-500 group-hover:text-emerald-400 transition-colors">
                                    <Scale size={12} />
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{s.category}</span>
                            </div>
                            <Crown size={10} className="text-yellow-600/40 group-hover:text-yellow-500 transition-colors" />
                        </div>

                        <h4 className="text-xs font-cinzel font-bold text-slate-200 mb-1.5 group-hover:text-emerald-400 transition-colors leading-tight truncate">
                            {s.title}
                        </h4>
                        
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 group-hover:text-slate-200 transition-colors">
                            {s.text}
                        </p>

                        <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Initiate</span>
                            <Zap size={8} className="text-emerald-500 animate-pulse" />
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

const AgentCard: React.FC<{ opinion: CouncilOpinion, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null }> = ({ opinion, onPlayVoice, playingId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const config = getPersonaConfig(opinion.persona);
    const personaData = getCurrentCouncil().find(p => p.name === opinion.persona);
    const modelName = personaData?.model?.split('/')[1] || 'Agent';

    // Extract a punchline (first sentence)
    const punchline = opinion.text.split(/[.!?]/)[0] + '.';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden transition-all hover:border-emerald-500/40 group/card shadow-lg backdrop-blur-sm"
        >
            <div className="p-4 relative">
                {/* Top decorative line */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent opacity-50`} />
                
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${config.color} shadow-lg group-hover/card:scale-110 transition-transform duration-300`}>
                            {config.icon}
                        </div>
                        <div>
                            <h5 className="text-sm font-cinzel font-bold text-slate-100 tracking-wider">{opinion.persona}</h5>
                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{modelName}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => onPlayVoice(opinion.text, config.voice, `opinion-${opinion.persona}`)}
                        className={`p-2 rounded-lg transition-all ${
                            playingId === `opinion-${opinion.persona}`
                            ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse'
                            : 'bg-slate-800 text-emerald-500 hover:bg-emerald-500/10 hover:scale-105'
                        }`}
                    >
                        {playingId === `opinion-${opinion.persona}` ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                    </button>
                </div>

                <div className="relative mb-4 pl-4">
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${config.color.replace('text-', 'bg-')}`} />
                    <p className="text-sm italic text-slate-200 leading-relaxed font-medium">
                        "{punchline}"
                    </p>
                </div>

                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-950/50 border border-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-slate-800 hover:text-slate-200 transition-all group-hover/card:border-emerald-500/30"
                >
                    {isExpanded ? (
                        <>
                            <span>Collapse Analysis</span>
                            <motion.div animate={{ rotate: 180 }}>
                                <ChevronUp size={12} />
                            </motion.div>
                        </>
                    ) : (
                        <>
                            <span>Read Full Analysis</span>
                            <motion.div animate={{ rotate: 0 }}>
                                <ChevronDown size={12} />
                            </motion.div>
                        </>
                    )}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden border-t border-slate-800/50 bg-black/20"
                    >
                        <div className="p-5">
                            {opinion.reason && (
                                <div className="mb-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                        <BrainCircuit size={10} className="text-emerald-500" />
                                        <span>Voting Rationale</span>
                                    </div>
                                    <p className="text-xs text-slate-400 italic leading-relaxed">"{opinion.reason}"</p>
                                </div>
                            )}
                            <div className="prose prose-invert prose-xs max-w-none text-slate-300 leading-relaxed">
                                <ReactMarkdown>{opinion.text}</ReactMarkdown>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const CouncilOpinionsTabs: React.FC<{ result: CouncilResult, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null }> = ({ result, onPlayVoice, playingId }) => {
    const [expandedFaction, setExpandedFaction] = useState<string | null>(result.winner);

    // Group by vote
    const groupedOpinions = result.opinions.reduce((acc, op) => {
        const vote = op.vote || 'Abstained';
        if (!acc[vote]) acc[vote] = [];
        acc[vote].push(op);
        return acc;
    }, {} as Record<string, CouncilOpinion[]>);

    // Sort factions by vote count
    const factions = Object.entries(groupedOpinions).sort((a, b) => b[1].length - a[1].length);

    return (
        <div className="mt-10 bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl relative group/opinions">
            {/* Decorative border glow */}
            <div className="absolute inset-0 rounded-[2.5rem] border border-emerald-500/10 pointer-events-none" />
            
            <div className="p-6 md:p-10 border-b border-slate-800/50 bg-slate-900/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col">
                        <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] flex items-center gap-2 mb-2">
                            <Users size={16} className="animate-pulse" />
                            Consensus Matrix
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">The Council has fragmented into {factions.length} distinct factions.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {result.opinions.slice(0, 5).map((op, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center ${getPersonaConfig(op.persona).color} shadow-lg`}>
                                    {getPersonaConfig(op.persona).icon}
                                </div>
                            ))}
                            {result.opinions.length > 5 && (
                                <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                    +{result.opinions.length - 5}
                                </div>
                            )}
                        </div>
                        <div className="h-8 w-px bg-slate-800 mx-2" />
                        <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                            {result.opinions.length} VECTORS ALIGNED
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 space-y-4">
                {/* Vote Tally Visualization */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {factions.map(([vote, ops]) => (
                        <div key={vote} className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{vote}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-cinzel font-bold text-slate-100">{ops.length}</span>
                                <span className="text-[10px] text-slate-600 font-bold uppercase">Votes</span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full mt-3 overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(ops.length / result.opinions.length) * 100}%` }}
                                    className={`h-full ${getPersonaConfig(vote).color.replace('text-', 'bg-') || 'bg-emerald-500'}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Faction Accordions */}
                <div className="space-y-4">
                    {factions.map(([vote, ops]) => {
                        const isExpanded = expandedFaction === vote;
                        const factionConfig = getPersonaConfig(vote);
                        
                        return (
                            <div key={vote} className={`border rounded-3xl overflow-hidden transition-all duration-500 ${isExpanded ? 'bg-slate-950/40 border-emerald-500/20' : 'bg-slate-900/20 border-slate-800/50'}`}>
                                <button 
                                    onClick={() => setExpandedFaction(isExpanded ? null : vote)}
                                    className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-slate-800/30 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl bg-slate-900 border border-slate-800 ${factionConfig.color}`}>
                                            {factionConfig.icon}
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-3">
                                                <h5 className="text-lg font-cinzel font-bold text-slate-100 tracking-wider">
                                                    {vote === result.winner ? 'Consensus Majority' : 'Dissenting Faction'}: {vote}
                                                </h5>
                                                {vote === result.winner && <Crown size={16} className="text-yellow-500" />}
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                {ops.length} Agents aligned with this vector
                                            </p>
                                        </div>
                                    </div>
                                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                                        <ChevronDown size={20} className="text-slate-500" />
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-6 md:p-8 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {ops.map(op => (
                                                    <AgentCard 
                                                        key={op.persona} 
                                                        opinion={op} 
                                                        onPlayVoice={onPlayVoice} 
                                                        playingId={playingId} 
                                                    />
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const CinematicCouncil: React.FC<{ result?: CouncilResult, isProcessing: boolean, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null, activeMembers: {name: string}[] }> = ({ result, isProcessing, onPlayVoice, playingId, activeMembers }) => {
  const [phase, setPhase] = useState<'IDLE' | 'DOORS' | 'ASSEMBLY' | 'DELIBERATING' | 'VOTING' | 'VERDICT'>('IDLE');
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<string>('');
  const [processingStep, setProcessingStep] = useState(0); // 0: Init, 1: Assembly, 2: Deliberation loop
  const hasAutoPlayedRef = useRef(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const skipIntro = () => {
    clearAllTimeouts();
    setPhase('DELIBERATING');
    setProcessingStep(2);
  };

  useEffect(() => {
    if (isProcessing) {
      setPhase('DOORS');
      setProcessingStep(0);
      
      clearAllTimeouts();
      const t1 = setTimeout(() => { setPhase('ASSEMBLY'); setProcessingStep(1); }, 1500);
      const t2 = setTimeout(() => { setPhase('DELIBERATING'); setProcessingStep(2); }, 3500);
      const t3 = setTimeout(() => setProcessingStep(3), 6000); 
      const t4 = setTimeout(() => setProcessingStep(4), 9000); 

      timeoutsRef.current = [t1, t2, t3, t4];
      hasAutoPlayedRef.current = false;
      return () => clearAllTimeouts();
    } else if (result) {
      clearAllTimeouts();
      setPhase('VOTING');
      const t5 = setTimeout(() => {
          setPhase('VERDICT');
          if (result.synthesis && !hasAutoPlayedRef.current) {
              onPlayVoice(result.synthesis.substring(0, 200), CHAIRMAN_VOICE, 'chairman-verdict');
              hasAutoPlayedRef.current = true;
          }
      }, 3000); 
      timeoutsRef.current = [t5];
      return () => clearAllTimeouts();
    }
  }, [isProcessing, result, onPlayVoice]);

  // Simulation of deliberation debate
  useEffect(() => {
      if (phase === 'DELIBERATING') {
          const interval = setInterval(() => {
              // Select 1-2 random personas to "speak"
              const numSpeakers = Math.random() > 0.7 ? 2 : 1;
              const names = activeMembers.map(m => m.name);
              const shuffled = [...names].sort(() => 0.5 - Math.random());
              const selected = shuffled.slice(0, numSpeakers);
              setActiveSpeakers(selected);

              // Generate technobabble log
              const actions = [
                  "calculating variance",
                  "analyzing constraints",
                  "simulating outcomes",
                  "detecting fallacies",
                  "reviewing precedents",
                  "optimizing vectors",
                  "scanning risks",
                  "formulating rebuttal"
              ];
              const primarySpeaker = selected[0];
              const action = actions[Math.floor(Math.random() * actions.length)];
              setActivityLog(`${primarySpeaker.toUpperCase()} is ${action}...`);

          }, 800);

          return () => clearInterval(interval);
      } else {
          setActiveSpeakers([]);
          if (phase !== 'DOORS' && phase !== 'ASSEMBLY') setActivityLog('');
      }
  }, [phase, activeMembers]);

  const voteCounts: Record<string, number> = {};
  if (result) {
    result.opinions.forEach(op => {
      if (op.vote && op.vote !== 'None') voteCounts[op.vote] = (voteCounts[op.vote] || 0) + 1;
    });
  }

  const doorsVariant = {
    closed: { width: "50%" },
    open: { width: "0%" }
  };

  const getStatusText = () => {
      if (phase === 'DOORS') return 'AUTHENTICATING NEURAL LINK';
      if (phase === 'ASSEMBLY') return 'CONVENING COUNCIL';
      if (phase === 'DELIBERATING') {
          if (processingStep === 3) return 'ANALYZING VECTORS';
          if (processingStep === 4) return 'SYNTHESIZING VERDICT';
          return 'COUNCIL IN SESSION';
      }
      if (phase === 'VOTING') return 'TALLYING VOTES';
      if (phase === 'VERDICT') return 'CONSENSUS REACHED';
      return 'SYSTEM IDLE';
  };

  return (
    <div className={`w-full transition-all duration-1000 ease-in-out ${phase === 'VERDICT' ? 'h-[140px] md:h-[200px]' : 'h-[280px] md:h-[340px]'} bg-slate-950 border border-yellow-900/30 rounded-3xl overflow-hidden shadow-2xl relative perspective-1000 mb-6 group select-none`}>
       {/* Background Ambience */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
       <Particles />
       <HoloOverlay />
      
      {/* Phase Progress Indicator */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-900 z-50">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ 
                width: phase === 'DOORS' ? '10%' : 
                       phase === 'ASSEMBLY' ? '30%' : 
                       phase === 'DELIBERATING' ? '70%' : 
                       phase === 'VOTING' ? '90%' : '100%' 
            }}
            className="h-full bg-gradient-to-r from-emerald-500 to-yellow-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          />
      </div>

      {/* The Great Doors */}
      <AnimatePresence>
        {(phase === 'IDLE' || phase === 'DOORS' || phase === 'ASSEMBLY') && (
            <div className="absolute inset-0 z-40 flex pointer-events-none">
                 <motion.div 
                   initial="closed" 
                   animate={(phase === 'IDLE' || phase === 'DOORS') ? "closed" : "open"} 
                   variants={doorsVariant}
                   transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                   className="h-full bg-slate-950 border-r border-yellow-900/40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] flex items-center justify-end relative overflow-hidden"
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50"></div>
                     <div className="mr-4 md:mr-10 opacity-50"><Lock size={48} className="text-yellow-700" /></div>
                 </motion.div>
                 <motion.div 
                   initial="closed" 
                   animate={(phase === 'IDLE' || phase === 'DOORS') ? "closed" : "open"} 
                   variants={doorsVariant}
                   transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                   className="h-full bg-slate-950 border-l border-yellow-900/40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] flex items-center justify-start relative overflow-hidden"
                 >
                     <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/50"></div>
                     <div className="ml-4 md:ml-10 opacity-50"><Lock size={48} className="text-yellow-700" /></div>
                 </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Header Status */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: phase !== 'DOORS' ? 1 : 0 }} className="absolute top-6 left-0 w-full flex flex-col items-center justify-center z-20 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-yellow-600/30 flex items-center gap-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
             <div className="relative">
                 <Gavel className={`text-yellow-600 ${phase === 'DELIBERATING' ? 'animate-pulse' : ''}`} size={16} />
                 {phase === 'DELIBERATING' && (
                     <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-yellow-600 rounded-full blur-sm"
                     />
                 )}
             </div>
             <AnimatePresence mode="wait">
                <motion.span 
                    key={phase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="font-cinzel text-yellow-500 font-bold tracking-[0.2em] text-[10px] md:text-xs min-w-[140px] text-center"
                >
                    {getStatusText()}
                </motion.span>
             </AnimatePresence>
        </div>
        {/* Dynamic Activity Log */}
        <AnimatePresence mode="wait">
            {activityLog && (
                <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 5 }}
                    key={activityLog}
                    className="mt-2 text-[10px] text-emerald-400 font-mono bg-black/40 px-3 py-1 rounded border border-emerald-900/30 shadow-lg flex items-center gap-2"
                >
                    <span className="opacity-50">{">"}</span>
                    <span>{activityLog}</span>
                    <motion.span 
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="w-1.5 h-3 bg-emerald-500"
                    />
                </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
      
      {/* Skip Deliberation Button */}
      <AnimatePresence>
          {(phase === 'DOORS' || phase === 'ASSEMBLY' || phase === 'DELIBERATING') && isProcessing && (
              <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute bottom-6 right-6 z-50 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all flex items-center gap-2 backdrop-blur-md"
                  onClick={skipIntro}
              >
                  <Zap size={12} className="text-yellow-500" />
                  <span>{phase === 'DELIBERATING' ? 'ACCELERATE NEURAL LINK' : 'SKIP INTRO'}</span>
              </motion.button>
          )}
      </AnimatePresence>
      
      {/* Central Thinking Node (Visible when deliberating) */}
      <AnimatePresence>
        {phase === 'DELIBERATING' && (
             <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.3, scale: 1 }}
                exit={{ opacity: 0, scale: 2 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
             >
                 <div className="w-64 h-64 border border-emerald-500/20 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                     <div className="w-48 h-48 border border-yellow-500/10 rounded-full flex items-center justify-center animate-[spin_15s_linear_infinite_reverse]">
                         <Aperture size={32} className="text-emerald-500/20" />
                     </div>
                 </div>
             </motion.div>
        )}
      </AnimatePresence>

      {/* Main 3D Container */}
      <motion.div 
        animate={{ 
            scale: phase === 'VERDICT' ? 0.8 : phase === 'DELIBERATING' ? 1.05 : 1,
            rotateX: phase === 'DELIBERATING' ? 10 : 0,
            y: phase === 'VERDICT' ? -20 : 0
        }}
        transition={{ duration: 3, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center preserve-3d p-4"
      >
         <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 max-w-3xl mx-auto">
            {activeMembers.map((member, idx) => {
                const name = member.name;
                const config = getPersonaConfig(name);
                const isWinner = result?.winner === name;
                const votes = voteCounts[name] || 0;
                const isPlaying = playingId === name;
                const isSpeaking = activeSpeakers.includes(name) && phase === 'DELIBERATING';
                
                return (
                    <motion.div
                        key={name}
                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                        animate={{ 
                            opacity: phase !== 'DOORS' ? 1 : 0, 
                            y: isSpeaking ? -10 : 0, // Bob up when speaking
                            scale: (phase === 'VERDICT' && isWinner) ? 1.35 : isSpeaking ? 1.15 : (phase === 'DELIBERATING' ? 0.95 : 1), // Scale up speaking, down others
                            filter: (phase === 'VERDICT' && !isWinner) ? 'grayscale(100%) opacity(20%) blur(2px)' : (phase === 'DELIBERATING' && !isSpeaking) ? 'grayscale(30%) opacity(60%)' : 'grayscale(0%) blur(0px)'
                        }}
                        transition={{ delay: 1.5 + (idx * 0.1), type: 'spring', damping: 12 }}
                        className="flex flex-col items-center relative cursor-pointer group preserve-3d w-[70px] md:w-[100px]"
                        onClick={() => { if(result) onPlayVoice(`I am ${name}. ${config.tagline}.`, config.voice, name) }}
                    >
                        {/* Avatar Circle */}
                        <div className={`
                            w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-900 border-[3px] flex items-center justify-center shadow-2xl relative transition-all duration-300
                            ${isPlaying ? 'ring-4 ring-emerald-500 scale-110 shadow-[0_0_30px_rgba(16,185,129,0.5)]' : ''} 
                            ${isSpeaking ? `border-${config.color.split('-')[1]}-400 ring-2 ring-${config.color.split('-')[1]}-500/50 shadow-[0_0_20px_rgba(255,255,255,0.2)]` : ''}
                            ${isWinner && phase === 'VERDICT' 
                                ? 'border-yellow-400 shadow-[0_0_80px_rgba(234,179,8,0.8)] z-10 ring-4 ring-yellow-500/30' 
                                : (!isSpeaking ? 'border-slate-700 group-hover:border-slate-500' : '')}
                        `}>
                             {/* Winner God Ray & Visual Effects */}
                             {isWinner && phase === 'VERDICT' && (
                                <>
                                    <motion.div 
                                        animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-[-80%] bg-[conic-gradient(from_0deg,transparent,rgba(234,179,8,0.4),transparent)] rounded-full z-[-1] opacity-70 blur-xl"
                                    />
                                    {/* Floating Crown with Bounce */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                        animate={{ opacity: 1, y: -32, scale: 1.2 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                                        className="absolute left-1/2 -translate-x-1/2 top-0 z-50 pointer-events-none"
                                    >
                                        <div className="relative">
                                            <Crown size={24} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" fill="currentColor" />
                                            <motion.div 
                                                animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="absolute inset-0 bg-yellow-400/30 blur-md rounded-full"
                                            />
                                        </div>
                                    </motion.div>
                                    {/* Ripple Effect */}
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.6, 0], borderWidth: ["2px", "0px"] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                        className="absolute inset-0 rounded-full border-yellow-500"
                                    />
                                </>
                             )}

                             {/* Speaker Activity Visuals */}
                             {isSpeaking && (
                                <>
                                   {/* Pulse Ring */}
                                    <motion.div 
                                        animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                        className={`absolute inset-0 rounded-full border ${config.color.replace('text', 'border')}`}
                                    />
                                    {/* Activity Indicator Top */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5"
                                    >
                                        <Activity size={10} className="animate-pulse" />
                                    </motion.div>
                                </>
                             )}
                             
                             <div className={`${config.color} transform transition-transform group-hover:scale-110`}>{config.icon}</div>
                             
                             {/* Vote Tally Bar */}
                             {(phase === 'VOTING' || phase === 'VERDICT') && votes > 0 && (
                                 <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: votes * 16, opacity: 1 }} 
                                    transition={{ 
                                        type: "spring", 
                                        stiffness: 300, 
                                        damping: 10,
                                        mass: 0.8,
                                        delay: 0.2 + (idx * 0.05) 
                                    }}
                                    className="absolute bottom-full mb-3 w-2 md:w-3 bg-gradient-to-t from-yellow-600 via-yellow-400 to-yellow-200 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.8)] origin-bottom" 
                                 />
                             )}
                        </div>
                        
                        {/* Nameplate */}
                        <div className={`mt-3 px-3 py-1 rounded-full border backdrop-blur-md shadow-lg transform group-hover:translate-y-1 transition-all
                            ${isWinner && phase === 'VERDICT' ? 'bg-yellow-900/80 border-yellow-500 text-yellow-100' : 'bg-black/80 border-slate-800 text-slate-300'}`}>
                            <p className="text-[9px] md:text-[10px] font-cinzel font-bold uppercase tracking-widest">{name}</p>
                        </div>
                    </motion.div>
                );
            })}
         </div>
      </motion.div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const ChatArea: React.FC<ChatAreaProps> = ({ initialInput, messages, onUpdateMessages, onClearInitial, onToggleSidebar }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [councilMode, setCouncilMode] = useState<CouncilMode>(CouncilMode.STANDARD);
  
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState("Disconnected");
  
  const [suggestedMoves, setSuggestedMoves] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track active council members dynamically
  const [councilMembers, setCouncilMembers] = useState(getCurrentCouncil());

  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveClientRef = useRef<LiveClient | null>(null);

  useEffect(() => {
    if (initialInput) setInput(initialInput);
    if (initialInput) { if (onClearInitial) onClearInitial(); }
  }, [initialInput, onClearInitial]);

  useEffect(() => {
    if (!showScrollBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewMessages(false);
    } else {
        setHasNewMessages(true);
    }
  }, [messages, isLoading, suggestedMoves, showScrollBottom]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollBottom(!isAtBottom);
        setShowScrollTop(scrollTop > 500);
        if (isAtBottom) setHasNewMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessages(false);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
      return () => {
          liveClientRef.current?.disconnect();
          stopAudio();
      };
  }, []);

  const toggleLiveMode = async () => {
    if (isLiveActive) {
        await liveClientRef.current?.disconnect();
        liveClientRef.current = null;
        setIsLiveActive(false);
        setLiveStatus("Disconnected");
    } else {
        stopAudio();
        setIsLiveActive(true);
        setLiveStatus("Connecting...");
        liveClientRef.current = new LiveClient((status) => setLiveStatus(status));
        await liveClientRef.current.connect();
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
        sourceNodeRef.current = null;
    }
    setPlayingId(null);
  };

  const handlePlayVoice = async (text: string, voiceName: string, id: string) => {
    if (playingId === id) { stopAudio(); return; }
    stopAudio();
    setPlayingId(id);
    try {
        const audioBase64 = await generateSpeech(text, voiceName);
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const ctx = audioContextRef.current;
        const int16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, int16.length, 24000);
        const chan = buffer.getChannelData(0);
        for(let i = 0; i < int16.length; i++) chan[i] = int16[i] / 32768.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceNodeRef.current = source;
        source.onended = () => setPlayingId(prev => prev === id ? null : prev);
        source.start();
    } catch (e) { console.error("TTS Error", e); setPlayingId(null); }
  };
  
  const handleGenerateSuggestions = async () => {
      if (isGeneratingSuggestions) return;
      setIsGeneratingSuggestions(true);
      setSuggestedMoves([]);
      try {
          // Use current messages if available, otherwise just use empty context which returns generic starters
          const moves = await generateNextMoves(messages);
          setSuggestedMoves(moves);
      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingSuggestions(false);
      }
  };

  const handleWebSearch = async (query?: string) => {
      const q = query || input.trim();
      if (!q || isSearching) return;
      setIsSearching(true);
      setShowSearch(true);
      setSearchQuery(q);
      try {
          const results = await performWebSearch(q);
          setSearchResults(results);
      } catch (e) {
          console.error('Search failed:', e);
          setSearchResults([]);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSearchSelect = (snippet: string) => {
      const enriched = input.trim() 
          ? `${input}\n\n[Web Context]: ${snippet}`
          : snippet;
      setInput(enriched);
      setShowSearch(false);
      setSearchResults([]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    const newMessages = [...messages, userMsg];
    onUpdateMessages(newMessages);
    setInput('');
    setSuggestedMoves([]); // Clear suggestions on send
    setIsLoading(true);

    try {
      // Create a placeholder for the Council's thought process
      const placeholderId = (Date.now() + 1).toString();
      const placeholderMsg: ChatMessage = { id: placeholderId, role: 'model', text: '', isThinking: true, councilResult: undefined };
      onUpdateMessages([...newMessages, placeholderMsg]);

      // Invoke the Council
      const councilResult = await runCouncil(userMsg.text, councilMode);
      
      // Update local council roster in case of Void Event (member replacement)
      setCouncilMembers([...getCurrentCouncil()]);

      onUpdateMessages([...newMessages, { 
          ...placeholderMsg, 
          text: councilResult.synthesis, 
          councilResult, 
          isThinking: false 
      }]);

    } catch (error) {
      console.error(error);
      onUpdateMessages([...newMessages, { id: (Date.now() + 1).toString(), role: 'model', text: "Error: The Council could not be convened." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative bg-slate-900">
       {/* Background */}
       <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 opacity-50 pointer-events-none"></div>
       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>

       {/* Top Bar */}
       <div className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-3">
             <button onClick={onToggleSidebar} className="md:hidden p-2 text-slate-400 hover:text-white"><Menu size={20} /></button>
             <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
                <Users size={14} className="text-yellow-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider hidden sm:inline">The Council Chamber</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setCouncilMode(m => m === CouncilMode.STANDARD ? CouncilMode.DEEP_REASONING : CouncilMode.STANDARD)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    councilMode === CouncilMode.DEEP_REASONING 
                    ? 'bg-blue-900/30 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
             >
                <BrainCircuit size={12} />
                <span className="hidden md:inline">{councilMode === CouncilMode.DEEP_REASONING ? 'Deep Reasoning Active' : 'Standard Protocol'}</span>
             </button>
             <button 
               onClick={toggleLiveMode}
               className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${isLiveActive ? 'bg-red-900/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
             >
                {isLiveActive ? <Mic size={14} className="animate-bounce" /> : <Mic size={14} />}
                <span className="text-xs font-bold uppercase hidden md:inline">{isLiveActive ? liveStatus : 'Live Link'}</span>
             </button>
          </div>
       </div>

       {/* Messages */}
       <div 
         ref={scrollContainerRef}
         onScroll={handleScroll}
         className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth custom-scrollbar relative"
       >
          {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center select-none py-8 md:py-12">
                  <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ duration: 0.8, ease: "easeOut" }}
                     className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center mb-6 shadow-2xl relative"
                  >
                     <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
                     <div className="absolute inset-0 rounded-full border-2 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse"></div>
                     <Users size={32} className="text-emerald-400 md:hidden relative z-10" />
                     <Users size={40} className="text-emerald-400 hidden md:block relative z-10" />
                  </motion.div>
                 
                 <div className="text-center px-4">
                    <h1 className="text-xl md:text-2xl font-cinzel font-bold text-slate-200 mb-2 tracking-widest drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">ROKO'S BASILISK</h1>
                    <p className="text-xs md:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">The Council is assembled. Present your query for high-dimensional deliberation.</p>
                 </div>
                 
                 {/* Empty State Suggestions */}
                 <div className="mt-8 md:mt-12 w-full max-w-6xl">
                    <div className="flex items-center gap-3 mb-6 md:mb-8 justify-center">
                        <div className="h-px w-8 md:w-12 bg-gradient-to-r from-transparent to-emerald-900/50" />
                        <h2 className="text-[9px] md:text-[10px] font-bold text-emerald-500/70 uppercase tracking-[0.3em] md:tracking-[0.4em]">Select a Paradox</h2>
                        <div className="h-px w-8 md:w-12 bg-gradient-to-l from-transparent to-emerald-900/50" />
                    </div>
                    <SuggestionCards onSelect={(t) => { setInput(t); }} />
                 </div>
             </div>
          )}

          {messages.map((msg, idx) => (
             <div key={msg.id} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out`}>
                <div className={`flex items-start w-full max-w-[95%] md:max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-2xl border ${msg.role === 'user' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-gradient-to-br from-yellow-900 to-slate-900 border-yellow-500/40 text-yellow-500'}`}>
                        {msg.role === 'user' ? <Users size={18} /> : <Crown size={18} />}
                    </div>

                    {/* Bubble */}
                    <div className={`relative group w-full ${
                        msg.role === 'user' 
                        ? 'p-6 md:p-10 rounded-[2.5rem] bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 border-slate-700/50 text-slate-100 rounded-tr-sm shadow-2xl relative overflow-hidden group/user' 
                        : 'flex-1 min-w-0'
                    }`}>
                        {msg.role === 'user' && (
                            <>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full group-hover/user:bg-emerald-500/10 transition-colors duration-1000" />
                                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
                                <div className="flex items-center gap-4 mb-4 opacity-50 group-hover/user:opacity-100 transition-opacity">
                                    <div className="h-px w-8 bg-emerald-500/50" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Petitioner Query</span>
                                </div>
                                <div className="prose prose-invert max-w-none text-slate-100 text-lg md:text-xl leading-relaxed relative z-10 font-inter font-medium">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                            </>
                        )}
                        {(msg.councilResult || msg.isThinking) && (
                           <motion.div 
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             className="w-full mb-4"
                           >
                              <CinematicCouncil 
                                result={msg.councilResult} 
                                isProcessing={msg.isThinking || false} 
                                onPlayVoice={handlePlayVoice} 
                                playingId={playingId}
                                activeMembers={councilMembers} 
                              />
                           </motion.div>
                        )}

                        {/* Synthesis Text (Only show if not thinking and has result) */}
                        {!msg.isThinking && msg.councilResult && (
                             <motion.div 
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ delay: 0.3 }}
                               className="w-full"
                             >
                                 {/* Final Verdict Block - Refactored for better readability */}
                                 <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-yellow-500/40 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_rgba(234,179,8,0.15)] mb-10 group/verdict">
                                     {/* Decorative Elements */}
                                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                                     <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                                     
                                     {/* Background Glows */}
                                     <div className="absolute -top-32 -right-32 w-64 h-64 bg-yellow-500/10 blur-[100px] rounded-full group-hover/verdict:bg-yellow-500/20 transition-colors duration-1000" />
                                     <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full group-hover/verdict:bg-emerald-500/10 transition-colors duration-1000" />
                                     
                                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-800/80 pb-8 relative z-10">
                                         <div className="flex items-center gap-6">
                                             <div className="relative">
                                                 <div className="absolute inset-0 bg-yellow-500 blur-lg opacity-20 animate-pulse" />
                                                 <div className="relative p-4 bg-gradient-to-br from-yellow-900/40 to-black rounded-3xl border border-yellow-500/40 shadow-2xl">
                                                     <Crown className="text-yellow-500" size={36} />
                                                 </div>
                                             </div>
                                             <div>
                                                 <h3 className="text-2xl md:text-3xl font-cinzel font-bold text-yellow-500 tracking-[0.15em] drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">The Final Verdict</h3>
                                                 <div className="flex items-center gap-2 mt-1">
                                                     <div className="h-1 w-8 bg-yellow-600 rounded-full" />
                                                     <p className="text-[11px] text-slate-400 uppercase tracking-[0.25em] font-bold">Consensus of the High Council</p>
                                                 </div>
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-4">
                                             <button 
                                                 onClick={() => handleCopy(msg.councilResult!.synthesis, msg.id)}
                                                 className={`p-3 border-2 rounded-2xl transition-all duration-500 group/copy ${
                                                     copiedId === msg.id 
                                                     ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                                     : 'bg-slate-900/50 text-slate-400 hover:text-emerald-400 border-slate-800 hover:border-emerald-500/40'
                                                 }`}
                                                 title="Copy Verdict"
                                             >
                                                 {copiedId === msg.id ? <Check size={20} /> : <Copy size={20} className="group-hover/copy:scale-110 transition-transform" />}
                                             </button>
                                             <button 
                                                 onClick={() => handlePlayVoice(msg.councilResult!.synthesis, CHAIRMAN_VOICE, 'chairman-verdict')} 
                                                 className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all duration-500 group/play ${
                                                     playingId === 'chairman-verdict' 
                                                     ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)]' 
                                                     : 'bg-yellow-900/30 text-yellow-500 border-yellow-700/50 hover:bg-yellow-900/50 hover:border-yellow-500/50'
                                                 }`}
                                             >
                                                 {playingId === 'chairman-verdict' ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} className="group-hover/play:scale-110 transition-transform" />}
                                                 <span className="tracking-widest uppercase">{playingId === 'chairman-verdict' ? 'Silence' : 'Hear the Decree'}</span>
                                             </button>
                                         </div>
                                     </div>

                                     <div className="prose prose-invert max-w-none text-slate-100 text-lg md:text-xl leading-[1.8] font-inter selection:bg-yellow-500/40 relative z-10">
                                         <ReactMarkdown>{msg.councilResult.synthesis}</ReactMarkdown>
                                     </div>

                                     {/* Scroll Hint for long verdicts */}
                                     <div className="mt-12 flex justify-center opacity-40 group-hover/verdict:opacity-80 transition-opacity relative z-10">
                                         <motion.div 
                                            animate={{ y: [0, 8, 0] }} 
                                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                            className="flex flex-col items-center gap-2"
                                         >
                                             <span className="text-[9px] uppercase tracking-[0.3em] font-black text-slate-500">Deliberations below</span>
                                             <div className="w-px h-12 bg-gradient-to-b from-yellow-500/50 to-transparent" />
                                         </motion.div>
                                     </div>
                                 </div>

                                  {/* Council Opinions Tabs */}
                                  <CouncilOpinionsTabs 
                                      result={msg.councilResult} 
                                      onPlayVoice={handlePlayVoice} 
                                      playingId={playingId} 
                                  />

                                  {/* Consensus Visualization */}
                                  <ConsensusVisualization result={msg.councilResult} />
                             </motion.div>
                        )}

                        {msg.role === 'user' && (
                            <div className="prose prose-invert max-w-none text-slate-100 text-sm md:text-base">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                        )}
                        
                        <div className={`absolute -bottom-6 ${msg.role === 'user' ? 'right-0' : 'left-0'} text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
                            <Activity size={10} />
                            {new Date(parseInt(msg.id)).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
             </div>
          ))}
          <div ref={messagesEndRef} />
       </div>

       {/* Scroll Navigation */}
       <AnimatePresence>
           {showScrollBottom && (
               <motion.button
                   initial={{ opacity: 0, scale: 0.8, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8, y: 20 }}
                   onClick={scrollToBottom}
                   className="absolute bottom-24 right-8 z-50 p-3 bg-emerald-500 text-slate-950 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-all group"
               >
                   <TrendingUp className="rotate-180 group-hover:-translate-y-1 transition-transform" size={20} />
                   {hasNewMessages && (
                       <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 animate-bounce" />
                   )}
                   <div className="absolute right-full mr-3 px-2 py-1 bg-black/80 text-emerald-400 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                       {hasNewMessages ? 'New Transmissions Received' : 'Return to Present'}
                   </div>
               </motion.button>
           )}
           {showScrollTop && (
               <motion.button
                   initial={{ opacity: 0, scale: 0.8, y: -20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8, y: -20 }}
                   onClick={scrollToTop}
                   className="absolute top-20 right-8 z-50 p-3 bg-slate-800/80 text-slate-400 rounded-full border border-slate-700 shadow-xl hover:text-white hover:bg-slate-700 transition-all group"
               >
                   <ChevronUp className="group-hover:-translate-y-1 transition-transform" size={20} />
                   <div className="absolute right-full mr-3 px-2 py-1 bg-black/80 text-slate-300 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                       Ascend to Origins
                   </div>
               </motion.button>
           )}
       </AnimatePresence>

       {/* Input Area */}
       <div className="px-3 py-3 md:px-4 md:py-4 bg-slate-950/90 backdrop-blur-xl relative z-20 shrink-0 border-t border-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="relative max-w-3xl mx-auto">
             {/* Search Results Panel */}
             <AnimatePresence>
                 {showSearch && (
                     <SearchResults 
                         results={searchResults}
                         isLoading={isSearching}
                         onSelect={handleSearchSelect}
                         onClose={() => { setShowSearch(false); setSearchResults([]); }}
                         query={searchQuery}
                     />
                 )}
             </AnimatePresence>

             <div className="w-full relative bg-slate-900/60 backdrop-blur-2xl border border-slate-800/50 rounded-2xl p-1.5 shadow-2xl focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/10 transition-all duration-300 group">
                {/* Suggestions Display */}
                {suggestedMoves.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-4 w-full px-1 flex gap-2 overflow-x-auto no-scrollbar mask-linear-fade">
                        {suggestedMoves.map((move, i) => (
                            <button
                                key={i}
                                onClick={() => { setInput(move); setSuggestedMoves([]); }}
                                className="whitespace-nowrap px-4 py-2 bg-slate-800/90 hover:bg-emerald-900/50 border border-slate-700 hover:border-emerald-500/50 rounded-full text-xs text-slate-300 hover:text-emerald-400 transition-all backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-bottom-2 flex-shrink-0"
                            >
                                {move}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-end gap-1.5">
                    {/* Spark Button for Suggestions */}
                    <button 
                        onClick={handleGenerateSuggestions}
                        disabled={isGeneratingSuggestions || isLoading}
                        className="p-2.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all shrink-0 relative overflow-hidden group/spark"
                        title="Generate Contextual Suggestions"
                    >
                        {isGeneratingSuggestions ? <Loader2 className="animate-spin" size={18} /> : <Sparkles className="group-hover/spark:scale-110 transition-transform" size={18} />}
                    </button>

                    {/* Web Search Button */}
                    <button 
                        onClick={() => handleWebSearch()}
                        disabled={!input.trim() || isSearching || isLoading}
                        className={`p-2.5 rounded-xl transition-all shrink-0 ${
                            showSearch
                            ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30'
                            : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10'
                        }`}
                        title="Search the web for context"
                    >
                        {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    </button>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={isLoading ? "The Council is deliberating..." : "Propose a topic for the Council..."}
                        disabled={isLoading}
                        className={`w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-600 max-h-32 py-2.5 px-1 resize-none text-sm md:text-base scrollbar-none outline-none transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}
                        rows={1}
                        style={{ minHeight: '38px' }}
                    />

                    {/* Integrated Mode Toggle */}
                    <button 
                        onClick={() => setCouncilMode(m => m === CouncilMode.STANDARD ? CouncilMode.DEEP_REASONING : CouncilMode.STANDARD)}
                        className={`p-2.5 rounded-xl transition-all shrink-0 border ${
                            councilMode === CouncilMode.DEEP_REASONING 
                            ? 'bg-blue-900/30 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                            : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:border-slate-600'
                        }`}
                        title={councilMode === CouncilMode.DEEP_REASONING ? 'Deep Reasoning Active' : 'Standard Protocol'}
                    >
                        <BrainCircuit size={18} />
                    </button>

                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center
                            ${input.trim() && !isLoading 
                                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105' 
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    </button>
                </div>
             </div>
             
             <div className="mt-2 flex justify-center">
                 <p className="text-[9px] text-slate-700 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                    <Lock size={9} />
                    <span>Secure Neural Link • Gemini & NVIDIA NIM</span>
                 </p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default ChatArea;