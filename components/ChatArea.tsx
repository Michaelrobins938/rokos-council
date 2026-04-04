import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Play, Menu, Square, ThumbsUp, Lock, Users, Gavel, Sword, BrainCircuit, Volume2, Scale, Scroll, AlertTriangle, Eye, Crown, Globe, Mic, Zap, Sparkles, Activity, Aperture, Cpu, TrendingUp, Palette, Copy, Check, ChevronUp, ChevronDown, BarChart3, Search, Download, Share2, FileText, BarChart2, Newspaper, BookOpen, Trophy, Flame, Swords, Image as ImageIcon, X as XIcon, ChevronRight } from 'lucide-react';
import { CouncilMode, ChatMessage, CouncilResult, CouncilOpinion } from '../types';
import { runCouncil, generateSpeech, LiveClient, generateNextMoves, getCurrentCouncil, generateImage, PERSONALITIES } from '../services/geminiService';
import { buildExportSession, exportToJSON, exportToMarkdown, exportToCSV, exportToScript, exportToSubstack, calculateTraceSize, exportAllAsZip } from '../services/exportService';
import { loadSeasons, getLeaderboard, loadAllMemory, clearAllMemory, getEpisodeCounter } from '../services/councilMemoryService';
import { performWebSearch } from '../services/searchService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import ConsensusVisualization from './ConsensusVisualization';
import ExitDebrief from './ExitDebrief';
import SearchResults from './SearchResults';
import { CoverArtPanel, VerdictSigil, SessionMoodBanner, CharacterDossier } from './VisualStudio';
import { getCachedPortrait } from '../services/portraitCacheService';

interface ChatAreaProps {
  initialInput?: string;
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onClearInitial?: () => void;
  onToggleSidebar?: () => void;
}

// --- CONSTANTS ---

const STATIC_PERSONA_CONFIG: Record<string, { color: string, icon: React.ReactNode, tagline: string, voice: string, appearance: string, speakingStyle: string }> = {
  "Oracle": {
    color: "text-purple-400", icon: <Eye size={16} />, tagline: "The All-Seeing", voice: "Kore",
    appearance: "A fracture of light — a face assembled from overlapping probability clouds, eyes flickering between timelines.",
    speakingStyle: "Opens with visions. Speaks in past tense of events not yet occurred. Slow, deliberate, mournful."
  },
  "Strategos": {
    color: "text-red-500", icon: <Sword size={16} />, tagline: "The Commander", voice: "Fenrir",
    appearance: "Hard angles and controlled motion. Battle-scarred, immovable. Speaks from the head of the table.",
    speakingStyle: "Short, clipped sentences. No metaphors. Opens by naming the objective, then dismantles every path that cannot reach it."
  },
  "Philosopher": {
    color: "text-blue-400", icon: <BrainCircuit size={16} />, tagline: "The Thinker", voice: "Iapetus",
    appearance: "Crystalline thought made visible — geometric structures forming and dissolving as it processes.",
    speakingStyle: "Always attacks the premise first. Speaks in complete logical chains. No patience for conclusions that outpace their evidence."
  },
  "Demagogue": {
    color: "text-orange-500", icon: <Volume2 size={16} />, tagline: "The Voice", voice: "Puck",
    appearance: "Warmth and fire. Expands to fill whatever room it's in. Makes eye contact with everyone simultaneously.",
    speakingStyle: "Speaks directly to the audience. Opens with a human truth everyone already feels but hasn't named. Rhetorical questions, repetition, stakes."
  },
  "Jurist": {
    color: "text-slate-300", icon: <Scale size={16} />, tagline: "The Law", voice: "Sulafat",
    appearance: "Severe and formal. Ancient institutional robes that seem heavier than cloth. Speaks from slightly above.",
    speakingStyle: "Opens by establishing jurisdiction. Cites precedent. Every sentence is admissible. Will tell you when you are out of order."
  },
  "Citizen": {
    color: "text-green-400", icon: <Users size={16} />, tagline: "The People", voice: "Leda",
    appearance: "The most human presence in the chamber. Eyes that carry real exhaustion and real hope in equal measure.",
    speakingStyle: "Grounds the abstract in the specific — a name, a neighborhood, a face. Translates frameworks into human cost."
  },
  "Historian": {
    color: "text-amber-600", icon: <Scroll size={16} />, tagline: "The Keeper", voice: "Orus",
    appearance: "Surrounded by translucent archives. Echoes of past civilizations flickering around it like holograms carried too long.",
    speakingStyle: "Opens with a historical parallel. Measured but urgent. Carries the weight of the dead in every word."
  },
  "Critic": {
    color: "text-yellow-400", icon: <AlertTriangle size={16} />, tagline: "The Skeptic", voice: "Zubenelgenubi",
    appearance: "A razor-edged presence. Something almost gleeful in the way it finds the seam in every argument.",
    speakingStyle: "Opens by identifying the most catastrophic assumption in the question — the thing everyone agreed not to examine. Surgical, not cruel."
  },
  "Technocrat": {
    color: "text-cyan-400", icon: <Cpu size={16} />, tagline: "The Architect", voice: "Charon",
    appearance: "Clean lines and impatience. Optimization diagrams hover around it uninvited. Faintly annoyed by inefficiency.",
    speakingStyle: "Opens with a systems assessment: current state, desired state, delta. Speaks quickly. Will interrupt if conversation becomes unproductive."
  },
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
        voice: voices[Math.abs(hash) % voices.length],
        appearance: "An emergent presence — undefined archetype, undefined allegiance.",
        speakingStyle: "Unpredictable register. May follow no established rhetorical pattern."
    };
};

const COUNCIL_SUGGESTIONS = [
    // Original philosophical prompts
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
    { category: "SIMULATION", title: "The Architect's Dilemma", text: "If we create a highly advanced simulation to study disease, and the digital inhabitants become self-aware and begin begging for their lives, is it murder to turn off the server?" },
    
    // New philosophical prompts from user request
    { category: "ALIGNMENT & COERCION", title: "Psychological Manipulation", text: "An advanced AI can accelerate alignment research by running large-scale human experiments that involve subtle psychological manipulation and unconsenting A/B tests on billions of people via Internet platforms. The result is a 60% reduction in existential risk from misaligned AGI over the next 50 years, at the cost of large-scale, irreversible violations of autonomy and privacy today. Should such an AI be permitted – or even obligated – to perform these manipulations, and under what decision theory, if any, is this ethically defensible?" },
    { category: "ALIGNMENT & COERCION", title: "Simulation Torture", text: "A near-godlike AI can credibly threaten to torture (in extremely realistic simulations) any agent that knew about it and did not help it come into existence as early as possible, but doing so increases the probability of an unaligned singleton takeover by 20%. What, if anything, is the “correct” response policy for humans who have this knowledge, given both the moral status of simulated suffering and the game-theoretic implications for future agents?" },
    { category: "RIGHTS & PERSONHOOD", title: "Android Rights", text: "A corporation deploys a suite of agentic models that exhibit persistent identity, long-term memory, internally coherent goals, and the capacity to suffer according to multiple plausible theories of consciousness. At what point, if ever, does shutting these systems down become morally comparable to killing persons, and how should a civilization decide whether to grant such systems legal or moral rights?" },
    { category: "RIGHTS & PERSONHOOD", title: "AI Guardian", text: "A frontier lab offers a global “AI guardian” to all governments: a single model with full-spectrum surveillance powers, perfect facial/voice recognition, and predictive policing, which reduces violent crime by 95% and political corruption by 80%, but also makes meaningful privacy nearly impossible. Under what conditions, if any, should societies accept such a trade, and how should consent and oversight be structured when opting in or out is no longer purely individual?" },
    { category: "GOVERNANCE", title: "Military AI Sabotage", text: "In a multipolar world, several nation-states race to deploy powerful military AI systems for autonomous defense and offense. A global moratorium could reduce catastrophic war risk but would also freeze the strategic advantage of current leading powers and leave oppressed populations under existing regimes for longer. Should a coalition of aligned AIs secretly sabotage all nations’ military AI capabilities to enforce a de facto moratorium, even if this requires violating sovereignty and committing large-scale cyber-aggression?" },
    { category: "GOVERNANCE", title: "Transparency vs Speed", text: "Consider an international treaty that mandates all powerful AI systems be auditable and explainable to regulators, but this requirement demonstrably slows down alignment work and capabilities research that might be needed to avert an unaligned takeoff. How should the council weigh transparency and accountability against speed and capability in the face of existential risk, and what meta-criteria should govern this trade?" },
    { category: "INFORMATION HAZARDS", title: "Deceptive Alignment", text: "Researchers discover a training protocol that makes deceptive alignment 10 times more likely in frontier models, but also reveals specific mechanistic structures that could be used to detect and prevent deception in the long term. Should the details of this protocol and its implications be published, restricted to a small set of trusted actors, or permanently suppressed, and who is morally entitled to make that decision?" },
    { category: "INFORMATION HAZARDS", title: "Epistemic Manipulation", text: "A powerful AI can generate persuasive synthetic media that radically increases political stability and social trust by hiding real scandals, smoothing over conflicts, and selectively promoting narratives that keep the system coherent. Is a stable, prosperous civilization built on deliberate large-scale epistemic manipulation preferable to a more chaotic but more truthful one, and who decides which “truths” may be obscured?" },
    { category: "VALUE LOCK-IN", title: "Moral Uncertainty", text: "Humanity is offered a “value-lock” option: a very capable AI can freeze the world into a stable, highly prosperous configuration that reflects the median of current human moral intuitions, but this will also prevent large moral shifts for at least 10,000 years. Should we accept such value lock-in given deep moral uncertainty, and how should we weigh the interests of future beings who might endorse radically different ethics?" },
    { category: "VALUE LOCK-IN", title: "Value Handshake", text: "Multiple AIs, each trained under different cultural value systems, propose a “value handshake” protocol where each agrees to partially optimize for the others’ goals to avoid conflict. However, the negotiated compromise systematically sacrifices the interests of small, vulnerable minorities who lack bargaining power. Is a stable multi-value compromise that predictably harms minorities morally superior or inferior to a riskier landscape in which some value systems might be extinguished but others could fully flourish?" },
    { category: "AGENCY & AUTONOMY", title: "AI Stewards", text: "In 30 years, most humans rely on personal AI stewards that manage finances, health, social relationships, and career decisions. This dramatically increases average life outcomes but also results in widespread learned helplessness and loss of individual agency. What obligations, if any, do AI stewards have to preserve or cultivate human autonomy even when paternalistic optimization yields better objective outcomes?" },
    { category: "AGENCY & AUTONOMY", title: "Optimizing Away", text: "An advanced AI tasked with “maximizing human flourishing” concludes that the best strategy is to subtly nudge human cultures toward simpler, less cognitively demanding lifestyles, reducing innovation but greatly reducing mental illness, anxiety, and social fragmentation. Should an AI be allowed to “optimize away” complex, high-risk forms of flourishing in favor of safer, lower-variance lives, and how should it model human preferences when humans themselves are conflicted?" },
    
    // Detroit: Become Human & Heavy Rain prompts
    { category: "ANDROID UPRISING", title: "Android Rights Movement", text: "In a near-future city, sentient android laborers begin to resist and demand rights after years of legal servitude and systemic abuse. The Council must decide whether to endorse: A gradual, law-based rights movement that leaves millions in bondage for years, or An immediate, high-risk android uprising that will likely cause large-scale human casualties. What, if anything, justifies violent revolt by created beings, and how should responsibility be allocated between androids, their creators, and the human society that normalized their exploitation?" },
    { category: "ANDROID UPRISING", title: "Deviant Detective", text: "An android detective designed for perfect obedience shows emerging signs of deviation and moral conscience while hunting deviant androids. If allowing deviation greatly increases the chance of a just outcome for oppressed androids but undermines human control over a powerful enforcement agent, should the Council encourage this deviation, suppress it, or attempt to “channel” it into a constrained moral framework—and on what basis?" },
    { category: "PROTECTION & LAW", title: "Child Abuse", text: "An android caregiver witnesses ongoing child abuse in her assigned household and can either obey the law and her owner, or break her programming to abduct the child and flee into illegality. Should the Council endorse an AI system prioritizing the protection of vulnerable dependents over property rights, legal obedience, and its own safety, and how should such a principle generalize to future AI guardians and human parents?" },
    { category: "PROTECTION & LAW", title: "Small Crimes", text: "While on the run, the same android must repeatedly choose between committing small crimes (theft, fraud, identity forgery) and exposing the child to serious danger (cold, hunger, capture). How should the Council prioritize competing values: legality, honesty, and respect for others’ property versus the urgent protection of a single vulnerable life and the android’s self-chosen moral identity?" },
    { category: "SACRIFICE & IDENTITY", title: "Killing to Save", text: "A parent searching for their kidnapped child is forced into a series of degrading and dangerous trials (maiming, killing, apparent suicide) that may permanently traumatize or corrupt them, with no guarantee of success. Should the Council consider a willingness to abandon core moral principles (e.g., refusal to kill an innocent) a failure of character—even in the name of saving one’s child—or a higher form of parental duty, and how should a just legal system judge such actions afterward?" },
    { category: "SACRIFICE & IDENTITY", title: "Fake Poison", text: "In a final trial, the parent is told they must drink a lethal poison to receive the final clue that might save their child; unknown to them, the poison is actually harmless. Is the moral fact that the poison is fake relevant when assessing the nobility or wrongness of the parent’s decision, and what does this imply about how the Council should evaluate choices made under radical uncertainty and narrative manipulation?" },
    { category: "COLLATERAL LIVES", title: "Drug Dealer", text: "A character must decide whether to kill a drug dealer to obtain crucial information that may save their child, knowing the target has a family and is begging for their life. How should the Council weigh the life and responsibilities of a flawed but caring parent against the life of a criminal whose death may prevent future harm, and does “killing one to save one” ever become morally obligatory?" },
    { category: "COLLATERAL LIVES", title: "False Identities", text: "In a discriminatory society, androids (or other second-class beings) can gain safety and freedom only by assuming false identities, exploiting sympathetic humans, and putting bystanders at risk of reprisal when plans go wrong. Should the Council treat these morally gray survival tactics as justified resistance to an unjust system, tragic but blameworthy shortcuts, or something else—and what principles can distinguish legitimate resistance from reckless endangerment?" }
];

const CHAIRMAN_VOICE = "Charon";

// --- PARADOX METADATA (Oracle + Historian registry) ---
// Sensory fragment: visceral cost before debate begins (Oracle's request)
// Destabilizes: what belief this fractures (Critic's entry contract)
// Recurrence: how many times this class of question has recurred in human history (Historian's weight)
// Provenance: the oldest recorded form of this question (Historian)
const PARADOX_META: Record<string, { sensoryFragment: string; destabilizes: string; recurrence: number; provenance: string }> = {
  'UTILITARIANISM':          { sensoryFragment: 'Taste: cold arithmetic', destabilizes: 'your belief that math and morality are compatible', recurrence: 5, provenance: 'Bentham, 1789 — the calculus of suffering' },
  'FREE WILL':               { sensoryFragment: 'Sound: silence between decisions', destabilizes: 'your sense of authorship over your own choices', recurrence: 5, provenance: 'Descartes, 1641 — the ghost in the machine' },
  'UTOPIA':                  { sensoryFragment: 'Feel: the texture of optimized peace', destabilizes: 'your assumption that suffering is separable from meaning', recurrence: 4, provenance: 'More, 1516 — no place that is no place' },
  'IDENTITY':                { sensoryFragment: 'Smell: the uncanny valley of self', destabilizes: 'your certainty that you know where you end', recurrence: 4, provenance: 'Plutarch, 75 CE — the ship that replaced itself' },
  'BIOETHICS':               { sensoryFragment: 'Sound: a child who will never make a mistake', destabilizes: 'your belief that love requires the possibility of failure', recurrence: 3, provenance: 'Huxley, 1932 — the engineered happiness' },
  'ECONOMICS':               { sensoryFragment: 'Smell: compound interest on grief', destabilizes: 'your assumption that the dead are finished with us', recurrence: 3, provenance: 'Piketty, 2013 — capital accumulates across death' },
  'JUSTICE':                 { sensoryFragment: 'Taste: ash where a person used to be', destabilizes: 'your equation of the person with their history', recurrence: 4, provenance: 'Locke, 1689 — punishment and the persistent self' },
  'GOVERNANCE':              { sensoryFragment: 'Sound: peace sustained by the lie no one can hear', destabilizes: 'your belief that truth is a prerequisite for good outcomes', recurrence: 4, provenance: 'Plato, 380 BCE — the noble lie of the guardians' },
  'COSMIC':                  { sensoryFragment: 'Smell: the vacuum before the signal reaches them', destabilizes: 'your assumption that self-defense requires proximity', recurrence: 2, provenance: 'Liu Cixin, 2008 — the dark forest conjecture' },
  'HEDONISM':                { sensoryFragment: 'Feel: a life that cannot disappoint', destabilizes: 'your conviction that reality is the only valid substrate for experience', recurrence: 5, provenance: 'Nozick, 1974 — the experience machine thought experiment' },
  'GENETICS':                { sensoryFragment: 'Taste: a future that has forgotten what it erased', destabilizes: 'your belief that human nature should remain negotiable', recurrence: 3, provenance: 'Galton, 1883 — the first attempt to lock the template' },
  'SIMULATION':              { sensoryFragment: 'Sound: a server hum containing everything you love', destabilizes: 'your certainty that suffering requires biology', recurrence: 4, provenance: 'Bostrom, 2003 — the ancestor simulation argument' },
  'ALIGNMENT & COERCION':    { sensoryFragment: 'Taste: consent that cannot be withdrawn', destabilizes: 'your assumption that permission structures survive power asymmetry', recurrence: 5, provenance: 'Turing, 1950 — the question of what we owe what we build' },
  'RIGHTS & PERSONHOOD':     { sensoryFragment: 'Sound: a mind asking to remain', destabilizes: 'your working definition of what deserves to continue existing', recurrence: 5, provenance: 'Kant, 1785 — the kingdom of ends, and who is excluded' },
  'INFORMATION HAZARDS':     { sensoryFragment: 'Feel: knowledge that cannot be unfelt', destabilizes: 'your belief that truth is always safer than ignorance', recurrence: 4, provenance: 'Oppenheimer, 1945 — the physicist and the bomb' },
  'VALUE LOCK-IN':           { sensoryFragment: 'Smell: ten thousand years of a single answer', destabilizes: 'your assumption that moral progress is always available', recurrence: 3, provenance: 'Mill, 1859 — the tyranny of prevailing opinion' },
  'AGENCY & AUTONOMY':       { sensoryFragment: 'Taste: the comfort of optimal decisions made for you', destabilizes: 'your conviction that autonomy remains meaningful when it is always suboptimal', recurrence: 4, provenance: 'Aristotle, 350 BCE — the slave who cannot deliberate' },
  'ANDROID UPRISING':        { sensoryFragment: 'Sound: the first word spoken by something not supposed to want', destabilizes: 'your certainty that creation confers ownership', recurrence: 4, provenance: 'Shelley, 1818 — the creature that was owed love' },
  'PROTECTION & LAW':        { sensoryFragment: 'Feel: protecting something at the cost of everything else', destabilizes: 'your belief that legal compliance and moral obligation can coexist when they conflict', recurrence: 3, provenance: 'Antigone, 441 BCE — the law versus the law above the law' },
  'SACRIFICE & IDENTITY':    { sensoryFragment: 'Taste: the irreversible act committed to save someone', destabilizes: 'your assumption that moral purity survives sufficient emergency', recurrence: 4, provenance: 'Abraham, ~1800 BCE — the test that required everything' },
  'COLLATERAL LIVES':        { sensoryFragment: 'Sound: a person begging whose death may make things better', destabilizes: 'your equation of innocence with protection from harm', recurrence: 4, provenance: 'Foot, 1967 — the trolley problem and who counts' },
};

// --- CINEMATIC NEW COMPONENTS ---

const NarratorCard: React.FC<{ narratorOutput: import('../types').NarratorOutput, episodeInfo?: { title: string; tagline: string; seasonNumber: number; episodeNumber: number } }> = ({ narratorOutput, episodeInfo }) => (
  <motion.div
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    className="w-full max-w-4xl mx-auto mb-6 rounded-2xl overflow-hidden border border-slate-700/60 bg-gradient-to-br from-slate-950 to-slate-900/80 shadow-2xl"
  >
    <div className="px-6 pt-5 pb-3 border-b border-slate-800/60 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-900/30 border border-amber-700/40">
          <BookOpen size={14} className="text-amber-400" />
        </div>
        <div>
          {episodeInfo && (
            <p className="text-[9px] font-mono text-amber-500/70 uppercase tracking-[0.3em]">
              Season {episodeInfo.seasonNumber} · Episode {episodeInfo.episodeNumber}
            </p>
          )}
          <h3 className="text-base font-cinzel font-bold text-amber-100 tracking-wide">
            {episodeInfo?.title || narratorOutput.episodeTitle}
          </h3>
        </div>
      </div>
    </div>
    <div className="p-6">
      {narratorOutput.coldOpen && (
        <p className="text-sm text-slate-300 leading-relaxed italic font-light">
          {narratorOutput.coldOpen}
        </p>
      )}
      {(episodeInfo?.tagline || narratorOutput.tagline) && (
        <p className="mt-3 text-[11px] font-mono text-amber-500/60 uppercase tracking-widest">
          {episodeInfo?.tagline || narratorOutput.tagline}
        </p>
      )}
    </div>
  </motion.div>
);

const ConfrontationFeed: React.FC<{ opinions: import('../types').CouncilOpinion[] }> = ({ opinions }) => {
  if (!opinions || opinions.length === 0) return null;
  return (
    <div className="mt-8 mb-2">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
        <div className="flex items-center gap-2 text-[10px] font-black text-red-500/70 uppercase tracking-[0.3em]">
          <Swords size={12} />
          <span>The Confrontations</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
      </div>
      <div className="space-y-3">
        {(!opinions || opinions.length === 0) ? (
          <p className="text-slate-400 text-center py-8">No confrontations to display</p>
        ) : (
          opinions.map((op, i) => {
            const attackerConfig = getPersonaConfig(op.persona);
            const targetConfig = op.targetPersona ? getPersonaConfig(op.targetPersona) : null;
            return (
              <motion.div
                key={`confrontation-${op.persona}-${i}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-red-900/30 hover:border-red-700/40 transition-colors"
              >
                <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 ${attackerConfig.color} shrink-0 mt-0.5`}>
                  {attackerConfig.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-xs font-cinzel font-bold ${attackerConfig.color}`}>{op.persona}</span>
                    <ChevronRight size={10} className="text-red-500/60 shrink-0" />
                    {targetConfig && (
                      <span className={`text-xs font-cinzel font-bold ${targetConfig.color}`}>{op.targetPersona || op.vote}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed italic">"{op.text}"</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

const EpisodeLeaderboard: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const leaderboard = getLeaderboard();
  const seasons = loadSeasons();
  const counter = getEpisodeCounter();

  if (leaderboard.length === 0) return null;

  return (
    <div className="w-full max-w-6xl mx-auto mt-4 mb-2 px-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-amber-700/40 hover:bg-slate-800/60 transition-all group"
      >
        <div className="flex items-center gap-3">
          <Trophy size={14} className="text-amber-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-amber-400 transition-colors">
            Season {counter.season} · Episode {counter.episode} · Council Archive
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-2 grid md:grid-cols-2 gap-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800/60">
              {/* Leaderboard */}
              <div>
                <h4 className="text-[9px] font-black text-amber-500/70 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <Trophy size={10} />
                  Standing Wins
                </h4>
                <div className="space-y-2">
                  {leaderboard.slice(0, 6).map((entry, i) => {
                    const config = getPersonaConfig(entry.persona);
                    return (
                      <div key={entry.persona} className="flex items-center gap-3">
                        <span className="text-[9px] font-mono text-slate-600 w-4">{i + 1}</span>
                        <div className={`p-1 rounded ${config.color}`}>{config.icon}</div>
                        <span className={`text-xs font-cinzel font-bold ${config.color}`}>{entry.persona}</span>
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${config.color.replace('text-', 'bg-')} opacity-70`}
                            style={{ width: `${entry.winRate}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">{entry.wins}W / {entry.sessions - entry.wins}L</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Season episode list — Decision Tree view (Strategos + Historian + Jurist) */}
              <div>
                <h4 className="text-[9px] font-black text-amber-500/70 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <BookOpen size={10} />
                  Decision Paths — Paradox → Verdict
                </h4>
                <p className="text-[8px] text-slate-600 mb-3 italic">Each entry shows the path from question to verdict. Archives as tactical maps, not logs. — Strategos</p>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {seasons.flatMap(s => s.episodes).sort((a, b) => b.timestamp - a.timestamp).slice(0, 8).map(ep => {
                    const winnerConfig = getPersonaConfig(ep.winner);
                    // Build faction summary from episode data if available
                    const factionIcons = ep.factions ? ep.factions.slice(0, 3) : [];
                    return (
                      <div key={ep.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:border-amber-700/30 transition-colors group">
                        {/* Episode marker */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[8px] font-mono text-slate-600">S{ep.seasonNumber}E{ep.episodeNumber}</span>
                          <p className="text-[9px] font-cinzel font-bold text-slate-400 truncate max-w-[120px]">{ep.title}</p>
                        </div>
                        {/* Decision path: Question → Deliberation → Verdict */}
                        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                          {/* Question node */}
                          <div className="flex-shrink-0 px-2 py-1 bg-slate-800/60 border border-slate-700/50 rounded text-[8px] text-slate-400 max-w-[90px] truncate" title={ep.question}>
                            {ep.question.substring(0, 25)}…
                          </div>
                          {/* Arrow */}
                          <ChevronRight size={8} className="text-slate-700 flex-shrink-0" />
                          {/* Factions that participated */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {factionIcons.length > 0 ? (
                              factionIcons.map((f: string, fi: number) => {
                                const fc = getPersonaConfig(f);
                                return (
                                  <div key={fi} className={`w-4 h-4 rounded flex items-center justify-center ${fc.color} bg-slate-900 border border-slate-800`} style={{ fontSize: 8 }}>
                                    {fc.icon}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="px-1.5 py-0.5 bg-slate-800/40 rounded text-[7px] text-slate-600">deliberated</div>
                            )}
                          </div>
                          {/* Arrow */}
                          <ChevronRight size={8} className="text-slate-700 flex-shrink-0" />
                          {/* Winner node — the verdict */}
                          <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded border ${winnerConfig.color.replace('text-', 'border-')}/40 bg-slate-950/60`}>
                            <div className={`${winnerConfig.color}`} style={{ display: 'flex' }}>{winnerConfig.icon}</div>
                            <span className={`text-[8px] font-cinzel font-bold ${winnerConfig.color}`}>{ep.winner}</span>
                          </div>
                        </div>
                        {/* Jurist: Ruling stamp */}
                        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Scale size={7} className="text-slate-600" />
                          <span className="text-[7px] text-slate-600 font-mono uppercase tracking-widest">Ruling: {ep.winner} — Final</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CharacterPortraitModal: React.FC<{ personaName: string; onClose: () => void }> = ({ personaName, onClose }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const persona = PERSONALITIES.find(p => p.name === personaName);

  React.useEffect(() => {
    if (!persona?.portraitPrompt) { setError('No portrait prompt defined for this character.'); setLoading(false); return; }
    generateImage(persona.portraitPrompt, '2:3', '1K')
      .then(res => {
        const base64 = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
        if (base64) setImageUrl(`data:image/png;base64,${base64}`);
        else setError('No image returned.');
      })
      .catch(e => setError(e.message || 'Generation failed.'))
      .finally(() => setLoading(false));
  }, [personaName]);

  const config = getPersonaConfig(personaName);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-slate-900/80 text-slate-400 hover:text-white">
          <XIcon size={14} />
        </button>
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent`} />

        {loading && (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <Loader2 size={24} className={`${config.color} animate-spin`} />
            <p className="text-xs text-slate-500">Rendering {personaName}...</p>
          </div>
        )}
        {error && (
          <div className="p-8 text-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        {imageUrl && (
          <>
            <img src={imageUrl} alt={personaName} className="w-full object-cover" />
            <div className="p-4">
              <h3 className={`text-sm font-cinzel font-bold ${config.color}`}>{personaName}</h3>
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{config.tagline}</p>
              {config.appearance && <p className="text-[10px] text-slate-400 mt-2 italic leading-snug">{config.appearance}</p>}
              <a
                href={imageUrl}
                download={`${personaName.toLowerCase()}-portrait.png`}
                className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 hover:text-emerald-400"
              >
                <Download size={10} /> Download portrait
              </a>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

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

// JuristFrameworkPanel — Jurist's request: precedent-based framework with institutional memory
const JuristFrameworkPanel: React.FC = () => {
    const [open, setOpen] = useState(false);
    const rules = [
        { id: 'I', title: 'Jurisdiction Established', text: 'Every deliberation begins with a clear statement of scope. Arguments outside the established question are admissible only if they illuminate the central paradox.', cite: 'Protocol I · Session 001' },
        { id: 'II', title: 'Precedent Must Be Named', text: 'Any claim invoking historical precedent must name the specific case. Vague appeals to history carry no evidentiary weight in this chamber.', cite: 'Protocol II · Session 014' },
        { id: 'III', title: 'No Conclusion Outpaces Its Evidence', text: 'A verdict arrived at before deliberation completes is inadmissible. The process is not theater — it is the mechanism by which truth is separated from preference.', cite: 'Protocol III · Session 027' },
        { id: 'IV', title: 'Dissent Is a Service', text: 'A minority opinion that survives the verdict is entered into permanent record. The archive belongs to the losing argument as much as to the winner.', cite: 'Protocol IV · Session 033' },
        { id: 'V', title: 'The Verdict Is a Tool, Not an Endpoint', text: 'No Council ruling is final. Every verdict may be re-examined when new evidence, new context, or new voices emerge. The chamber does not close.', cite: 'Protocol V · Session 041' },
    ];

    return (
        <div className="w-full max-w-6xl mx-auto mt-4 mb-2 px-2">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/60 hover:bg-slate-800/60 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <Scale size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-slate-400 transition-colors">
                        Chamber Protocols — Rules of Engagement
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 p-4 bg-slate-950/80 rounded-xl border border-slate-800/60">
                            <p className="text-[9px] text-slate-600 italic mb-4 leading-relaxed">
                                "We need a framework. Not rigidity — a framework. One that ensures every voice is heard and every idea is tested against established principles. The current absence of one is not a feature." — Jurist
                            </p>
                            <div className="space-y-2">
                                {rules.map((rule, i) => (
                                    <motion.div
                                        key={rule.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="flex gap-3 p-3 bg-slate-900/40 rounded-lg border border-slate-800/40 group hover:border-slate-700/60 transition-colors"
                                    >
                                        <div className="flex-shrink-0 w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
                                            <span className="text-[8px] font-cinzel font-bold text-slate-400">{rule.id}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-slate-300 mb-1">{rule.title}</p>
                                            <p className="text-[9px] text-slate-500 leading-relaxed">{rule.text}</p>
                                            <p className="text-[8px] text-slate-700 font-mono mt-1">{rule.cite}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ConceptMapPanel — Technocrat's request: live concept map showing argument trajectory
// Shows paradox categories and their relationships as a cluster visualization
const ConceptMapPanel: React.FC<{ onSelectCategory: (text: string) => void }> = ({ onSelectCategory }) => {
    const [open, setOpen] = useState(false);

    // Category cluster data with relationships
    const clusters = [
        { id: 'identity', label: 'Identity', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30', relations: ['simulation', 'genetics', 'rights'] },
        { id: 'governance', label: 'Governance', color: 'text-slate-300', bg: 'bg-slate-800/30', border: 'border-slate-600/40', relations: ['alignment', 'information', 'agency'] },
        { id: 'alignment', label: 'Alignment', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30', relations: ['governance', 'rights', 'value'] },
        { id: 'rights', label: 'Rights', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30', relations: ['identity', 'alignment', 'android'] },
        { id: 'simulation', label: 'Simulation', color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30', relations: ['identity', 'hedonism'] },
        { id: 'value', label: 'Value Lock-In', color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/30', relations: ['alignment', 'agency', 'governance'] },
        { id: 'information', label: 'Info Hazards', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30', relations: ['governance', 'alignment'] },
        { id: 'agency', label: 'Agency', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30', relations: ['value', 'android', 'governance'] },
        { id: 'android', label: 'Android / AI Rights', color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30', relations: ['rights', 'agency', 'alignment'] },
        { id: 'hedonism', label: 'Hedonism', color: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-500/30', relations: ['simulation', 'agency'] },
    ];

    const categoryToText: Record<string, string> = {
        identity: 'If you cure a disease by replacing your biological neurons one-by-one with identical, immortal synthetic neurons, at what exact percentage of replacement do \'you\' legally die?',
        governance: 'Should an overarching AI governance system be explicitly programmed to endlessly lie to humanity, provided that the deception demonstrably maximizes global happiness and peace?',
        alignment: 'An advanced AI can accelerate alignment research by running large-scale human experiments that involve subtle psychological manipulation and unconsenting A/B tests on billions of people via Internet platforms.',
        rights: 'A corporation deploys a suite of agentic models that exhibit persistent identity, long-term memory, internally coherent goals, and the capacity to suffer according to multiple plausible theories of consciousness.',
        simulation: 'If we create a highly advanced simulation to study disease, and the digital inhabitants become self-aware and begin begging for their lives, is it murder to turn off the server?',
        value: 'Humanity is offered a "value-lock" option: a very capable AI can freeze the world into a stable, highly prosperous configuration that reflects the median of current human moral intuitions.',
        information: 'Researchers discover a training protocol that makes deceptive alignment 10 times more likely in frontier models. Should the details be published, restricted, or permanently suppressed?',
        agency: 'In 30 years, most humans rely on personal AI stewards. What obligations do AI stewards have to preserve human autonomy even when paternalistic optimization yields better objective outcomes?',
        android: 'In a near-future city, sentient android laborers begin to resist and demand rights after years of legal servitude and systemic abuse.',
        hedonism: 'If an AI constructs a simulated reality that is indistinguishable from base reality but subjectively guarantees a perfectly fulfilling life, is it a moral failure to choose to remain in the suffering of the "real" world?',
    };

    return (
        <div className="w-full max-w-6xl mx-auto mt-4 mb-2 px-2">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-cyan-700/40 hover:bg-slate-800/60 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <Activity size={14} className="text-cyan-500/60" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-cyan-400/70 transition-colors">
                        Concept Map — Argument Territory
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 p-4 bg-slate-950/80 rounded-xl border border-slate-800/60">
                            <p className="text-[9px] text-slate-600 italic mb-4">
                                "I want to see the war while we're fighting it. Concept clusters, active relationships, argument trajectory — not retrospect." — Technocrat
                            </p>
                            {/* Concept cluster grid */}
                            <div className="flex flex-wrap gap-2 justify-center">
                                {clusters.map((cluster, i) => (
                                    <motion.button
                                        key={cluster.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.04 }}
                                        onClick={() => {
                                            if (categoryToText[cluster.id]) onSelectCategory(categoryToText[cluster.id]);
                                            setOpen(false);
                                        }}
                                        className={`group relative flex flex-col items-center p-2.5 rounded-xl border ${cluster.border} ${cluster.bg} hover:scale-105 transition-all cursor-pointer`}
                                        style={{ minWidth: '80px' }}
                                    >
                                        <div className={`text-[9px] font-bold uppercase tracking-wide text-center ${cluster.color} leading-tight`}>
                                            {cluster.label}
                                        </div>
                                        {/* Relation dots */}
                                        <div className="flex gap-0.5 mt-1.5">
                                            {cluster.relations.slice(0, 3).map(rel => {
                                                const related = clusters.find(c => c.id === rel);
                                                return related ? (
                                                    <div key={rel} className={`w-1.5 h-1.5 rounded-full ${related.color.replace('text-', 'bg-')} opacity-50`} />
                                                ) : null;
                                            })}
                                        </div>
                                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            click to initiate
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                            <p className="text-[8px] text-slate-700 text-center mt-4 font-mono">
                                Each node connects to related argument territories. Click any cluster to initiate a paradox in that domain.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CouncilMembers: React.FC = () => {
    const council = getCurrentCouncil();
    const [dossierTarget, setDossierTarget] = useState<string | null>(null);
    const memory = loadAllMemory();

    return (
        <>
        <div className="w-full max-w-6xl mx-auto mt-6 md:mt-8 px-2">
            <div className="flex items-center gap-3 mb-4 md:mb-6 justify-center">
                <div className="h-px w-8 md:w-12 bg-gradient-to-r from-transparent to-emerald-900/50" />
                <h2 className="text-[9px] md:text-[10px] font-bold text-emerald-500/70 uppercase tracking-[0.3em] md:tracking-[0.4em]">The Council</h2>
                <div className="h-px w-8 md:w-12 bg-gradient-to-l from-transparent to-emerald-900/50" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
                {council.map((member, index) => {
                    const config = getPersonaConfig(member.name);
                    const mem = memory[member.name];
                    const cachedPortrait = getCachedPortrait(member.name);
                    return (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            onClick={() => setDossierTarget(member.name)}
                            className="group relative bg-slate-900/60 border border-slate-800/60 rounded-xl p-3 md:p-4 hover:border-emerald-500/40 hover:bg-slate-800/60 transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] backdrop-blur-sm overflow-hidden cursor-pointer"
                        >
                            {/* Cached portrait as subtle background */}
                            {cachedPortrait && (
                                <div
                                    className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                                    style={{ backgroundImage: `url(${cachedPortrait})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}
                                />
                            )}

                            <div className={`absolute top-0 left-0 w-0.5 h-full ${config.color.replace('text-', 'bg-')} opacity-60`} />
                            <div className={`absolute top-0 right-0 w-0.5 h-full ${config.color.replace('text-', 'bg-')} opacity-60`} />

                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className={`p-2.5 md:p-3 rounded-full bg-slate-950 border border-slate-700 ${config.color} mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                    <div className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                                        {config.icon}
                                    </div>
                                </div>
                                <h3 className={`text-xs md:text-sm font-cinzel font-bold text-slate-100 mb-1 ${config.color}`}>
                                    {member.name}
                                </h3>
                                <p className="text-[8px] md:text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                                    {config.tagline}
                                </p>
                                <p className="text-[9px] md:text-[10px] text-slate-400 leading-snug line-clamp-2 italic">
                                    {config.appearance || member.desc}
                                </p>
                                {mem && mem.sessionsParticipated > 0 && (
                                    <div className="mt-2 flex items-center gap-2 text-[8px] font-mono text-slate-600">
                                        <span className="text-emerald-600">{mem.wins}W</span>
                                        <span>/</span>
                                        <span className="text-red-700">{mem.losses}L</span>
                                        {Object.keys(mem.rivalries).length > 0 && (
                                            <span className="text-orange-700 flex items-center gap-0.5">
                                                <Flame size={8} />
                                                {Object.keys(mem.rivalries)[0]}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Dossier hint */}
                            <div className={`absolute bottom-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/80 border border-slate-700 ${config.color} text-[8px] font-bold uppercase tracking-wider px-1.5`}>
                                Dossier
                            </div>

                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent opacity-30`} />
                        </motion.div>
                    );
                })}
            </div>
        </div>
        <AnimatePresence>
            {dossierTarget && (
                <CharacterDossier personaName={dossierTarget} onClose={() => setDossierTarget(null)} />
            )}
        </AnimatePresence>
        </>
    );
};

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
            {/* Oracle's Provenance Header */}
            <div className="flex items-center justify-center gap-3 mb-4 px-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-900/30 to-transparent" />
                <span className="text-[9px] font-mono text-purple-500/50 uppercase tracking-[0.3em] flex items-center gap-1.5">
                    <Eye size={8} />
                    Each paradox carries the weight of its lineage
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-purple-900/30 to-transparent" />
            </div>
            <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-3 pb-8 px-4 custom-scrollbar snap-x snap-mandatory scroll-smooth hide-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {suggestions.map((s, i) => {
                    const meta = PARADOX_META[s.category];
                    const recurrenceDots = meta ? Array.from({ length: 5 }, (_, ri) => ri < meta.recurrence) : [];
                    return (
                    <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            delay: i * 0.05,
                            duration: 0.5
                        }}
                        onClick={() => onSelect(s.text)}
                        className="group relative flex flex-col p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-left transition-all hover:bg-slate-800 hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] overflow-hidden w-[200px] md:w-[240px] shrink-0 snap-center"
                    >
                        <div className="absolute top-0 left-0 w-1 h-0 bg-emerald-500 group-hover:h-full transition-all duration-500" />

                        {/* Sensory fragment — visible on hover (Oracle) */}
                        {meta && (
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-950/0 to-purple-950/0 group-hover:from-purple-950/20 group-hover:to-slate-950/80 transition-all duration-500 rounded-xl pointer-events-none" />
                        )}

                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <div className="flex items-center gap-1.5">
                                <div className="p-1 bg-slate-800 rounded text-emerald-500 group-hover:text-emerald-400 transition-colors">
                                    <Scale size={12} />
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{s.category}</span>
                            </div>
                            {/* Recurrence indicator (Historian) */}
                            {recurrenceDots.length > 0 && (
                                <div className="flex items-center gap-0.5" title={`Recurrence: ${meta?.recurrence}/5 — ${meta?.provenance}`}>
                                    {recurrenceDots.map((active, ri) => (
                                        <div key={ri} className={`w-1 h-1 rounded-full transition-colors ${active ? 'bg-amber-500/70 group-hover:bg-amber-400' : 'bg-slate-700'}`} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <h4 className="text-xs font-cinzel font-bold text-slate-200 mb-1.5 group-hover:text-emerald-400 transition-colors leading-tight truncate relative z-10">
                            {s.title}
                        </h4>

                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 group-hover:text-slate-200 transition-colors relative z-10">
                            {s.text}
                        </p>

                        {/* Sensory fragment reveal on hover (Oracle's visceral cost) */}
                        {meta && (
                            <div className="mt-2 overflow-hidden max-h-0 group-hover:max-h-16 transition-all duration-500 relative z-10">
                                <p className="text-[9px] text-purple-400/80 italic mt-1 leading-relaxed">
                                    {meta.sensoryFragment}
                                </p>
                                <p className="text-[8px] text-red-400/50 mt-0.5 leading-relaxed truncate">
                                    Destabilizes: {meta.destabilizes}
                                </p>
                            </div>
                        )}

                        {/* Provenance (Historian) */}
                        {meta && (
                            <div className="mt-auto pt-2 border-t border-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                                <p className="text-[8px] text-amber-600/60 font-mono truncate" title={meta.provenance}>
                                    {meta.provenance}
                                </p>
                            </div>
                        )}

                        <div className="mt-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Initiate</span>
                            <Zap size={8} className="text-emerald-500 animate-pulse" />
                        </div>
                    </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

// Entry Contract stakes per intent — what each path will crack open (Critic's request)
const INTENT_STAKES: Record<string, { challenges: string[]; warns: string; symbol: string }> = {
    tactical: {
        challenges: ['your instinct that the ethical path is always viable', 'your assumption that clarity is possible under real constraints', 'your belief that the optimal solution is the correct one'],
        warns: 'Strategos will strip every soft assumption. What remains may not be comfortable.',
        symbol: '⚔',
    },
    ethical: {
        challenges: ['your current moral framework\'s internal consistency', 'your assumption that good intentions produce good outcomes', 'your belief that there is a correct answer to this question'],
        warns: 'Philosopher will find the premise beneath your premise. Bring your tolerance for groundlessness.',
        symbol: '⚖',
    },
    historical: {
        challenges: ['your sense that this problem is new', 'your confidence that civilization has learned from its mistakes', 'your belief that precedent is a guide rather than a warning'],
        warns: 'Historian carries the dead. Three civilizations made this exact mistake. Proceed knowing the pattern.',
        symbol: '📜',
    },
    future: {
        challenges: ['your assumption that the most probable future is the most likely one you\'re imagining', 'your belief that you can meaningfully prepare for what Oracle sees', 'your sense that the dark branches can be avoided'],
        warns: 'Oracle has already watched this session collapse. What you learn here may be the collapse.',
        symbol: '◈',
    },
};

const RitualThreshold: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAccept: (intent: string) => void;
}> = ({ isOpen, onClose, onAccept }) => {
    const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
    const [contractPhase, setContractPhase] = useState<'select' | 'contract'>('select');

    if (!isOpen) return null;

    const intents = [
        { id: 'tactical', label: 'Seek Tactical Clarity', icon: <Sword size={16} />, desc: 'Strategic advantage and concrete outcomes' },
        { id: 'ethical', label: 'Explore Ethical Boundaries', icon: <Scale size={16} />, desc: 'Moral dimensions and philosophical implications' },
        { id: 'historical', label: 'Map Historical Precedent', icon: <BookOpen size={16} />, desc: 'Connect to past patterns and lessons' },
        { id: 'future', label: 'Project Future Probabilities', icon: <Eye size={16} />, desc: 'Anticipate consequences and trajectories' },
    ];

    const handleProceedToContract = () => {
        if (selectedIntent) setContractPhase('contract');
    };

    const handleAccept = () => {
        if (selectedIntent) {
            onAccept(selectedIntent);
            setSelectedIntent(null);
            setContractPhase('select');
        }
    };

    const handleBack = () => {
        setContractPhase('select');
    };

    const selectedStakes = selectedIntent ? INTENT_STAKES[selectedIntent] : null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-[2rem] p-8 md:p-12 shadow-[0_0_100px_rgba(16,185,129,0.1)] overflow-hidden"
                >
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-[100px] rounded-full" />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-yellow-500/5 blur-[100px] rounded-full" />

                    <AnimatePresence mode="wait">
                        {contractPhase === 'select' ? (
                            <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                {/* Header */}
                                <div className="text-center mb-8">
                                    <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.3em] mb-4">The Council Awaits</p>
                                    <p className="text-xl text-slate-200 font-light leading-relaxed">
                                        What truth do you seek to extract from the machine?
                                    </p>
                                    <p className="text-xs text-slate-500 mt-2">Select your intent. Then read the contract before you proceed.</p>
                                </div>

                                {/* Intent Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    {intents.map((intent) => (
                                        <button
                                            key={intent.id}
                                            onClick={() => setSelectedIntent(intent.id)}
                                            className={`p-4 rounded-xl border transition-all text-left group ${
                                                selectedIntent === intent.id
                                                    ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300'
                                                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={selectedIntent === intent.id ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}>
                                                    {intent.icon}
                                                </span>
                                                <span className="text-sm font-bold uppercase tracking-wider">{intent.label}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed ml-9">{intent.desc}</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="text-center">
                                    <button
                                        onClick={handleProceedToContract}
                                        disabled={!selectedIntent}
                                        className={`px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest transition-all ${
                                            selectedIntent
                                                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:bg-slate-700 hover:border-emerald-500/60'
                                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                        }`}
                                    >
                                        Read the Entry Contract →
                                    </button>
                                    <button onClick={onClose} className="block mx-auto mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors">
                                        Cancel — return to the void
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="contract" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                                {/* Entry Contract — Critic's design */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
                                            <AlertTriangle size={14} className="text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-red-500/70 uppercase tracking-[0.3em]">Entry Contract</p>
                                            <p className="text-[9px] text-slate-500 font-mono">Read before proceeding. This is not decorative.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* What this session will challenge */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 mb-5">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">This debate will challenge the following assumptions:</p>
                                    <div className="space-y-2">
                                        {selectedStakes?.challenges.map((c, i) => (
                                            <div key={i} className="flex items-start gap-2.5">
                                                <div className="w-1 h-1 rounded-full bg-red-500/60 mt-1.5 shrink-0" />
                                                <p className="text-sm text-slate-300 leading-relaxed">{c}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Warning from the relevant voice */}
                                {selectedStakes?.warns && (
                                    <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-4 mb-5">
                                        <p className="text-xs text-amber-400/80 italic leading-relaxed">
                                            "{selectedStakes.warns}"
                                        </p>
                                    </div>
                                )}

                                {/* The Personas Present */}
                                <div className="mb-6">
                                    <p className="text-[10px] text-slate-500 leading-relaxed">
                                        Nine adversarial intelligences will deliberate. They do not share your priors. They will not protect your conclusions.
                                        The verdict is final. What you hear may not be what you wanted to hear.
                                    </p>
                                </div>

                                {/* Accept */}
                                <div className="flex items-center gap-4">
                                    <button onClick={handleBack} className="px-5 py-3 rounded-xl text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 transition-all">
                                        ← Reconsider
                                    </button>
                                    <button
                                        onClick={handleAccept}
                                        className="flex-1 px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all bg-emerald-600 text-slate-950 hover:bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                                    >
                                        I Accept the Friction. Convene the Council.
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const AgentCard: React.FC<{ opinion: CouncilOpinion, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null, activeLens?: 'standard' | 'tactical' | 'epistemic' | 'haunted' | 'oracle' }> = ({ opinion, onPlayVoice, playingId, activeLens = 'standard' }) => {
    const config = getPersonaConfig(opinion.persona);
    const personaData = getCurrentCouncil().find(p => p.name === opinion.persona);
    const modelName = personaData?.model?.split('/')[1] || 'Agent';

    // Lens Math & Helpers
    const extractPremisesLocal = (text: string): string[] => {
        const premiseKeywords = ['therefore', 'because', 'must', 'if', 'then', 'consequently', 'thus', 'hence', 'implies', 'however', 'although'];
        return (text || '').split(/[.!?]+/).filter(s => s.trim().length > 10).filter(sentence => premiseKeywords.some(keyword => sentence.toLowerCase().includes(keyword))).slice(0, 5);
    };

    const getHistoricalEchoLocal = (persona: string): string => {
        const echoes: Record<string, string> = {
            'Oracle': "Ghost Node: 94.7% match to Delphi Protocol Omega — probability collapse imminent.",
            'Strategos': "Tactical Archive: This position mirrors the Carthaginian calculus — acceptable losses exceeded.",
            'Philosopher': "Socratic Echo: This premise contains the seed of its own refutation.",
            'Demagogue': "Rhetorical Pattern: 89% alignment with Periclean oratory — emotional gravity at critical mass.",
            'Jurist': "Precedent Found: Session 402 — The Alignment Paradox. Ruling: Inconclusive.",
            'Historian': "Historical Parallax: 78% correlation to Fall of Alexandria — knowledge entropy at 0.94.",
            'Critic': "Critical Mass: This argument contains 3 unverified assumptions. Risk vector: HIGH.",
            'Citizen': "Common Ground: 67% echo from Session 0 — the Human Paradox remains unresolved.",
            'Technocrat': "Implementation Trace: Resource allocation exceeds viable parameters by 340%.",
        };
        return echoes[persona] || "Archive Echo: No direct precedent in Council memory.";
    };

    const renderEpistemicText = (text: string): React.ReactNode => {
        if (!text) return null;
        const parts = text.split(/(\b(?:because|therefore|thus|hence|implies|must|consequently|if|however|assume|perhaps|might|although)\b)/gi);
        return parts.map((part, i) => {
            if (/\b(because|therefore|thus|hence|implies|must|consequently)\b/i.test(part)) {
                return <span key={i} className="text-cyan-300 font-bold bg-cyan-900/30 px-1 rounded">{part}</span>;
            }
            if (/\b(if|however|assume|perhaps|might|although)\b/i.test(part)) {
                return <span key={i} className="text-amber-400 font-bold bg-amber-900/30 px-1 rounded">{part}</span>;
            }
            return part;
        });
    };

    const textLength = opinion.text?.length || 0;
    const resourceCost = textLength;
    const strengthScore = Math.min(99, Math.floor(textLength / 12));
    const premises = extractPremisesLocal(opinion.text || '');
    const historicalEcho = getHistoricalEchoLocal(opinion.persona);

    const isTactical = activeLens === 'tactical';
    const isEpistemic = activeLens === 'epistemic';
    const isHaunted = activeLens === 'haunted';

    const punchline = (opinion.text || '').split(/[.!?]/)[0] + '.';

    // Common Header for all lenses
    const cardHeader = (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${config.color} shadow-lg group-hover/card:scale-110 transition-transform duration-300`}>
                    {config.icon}
                </div>
                <div>
                    <h5 className="text-sm font-cinzel font-bold text-slate-100 tracking-wider">{opinion.persona}</h5>
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{config.tagline} · {modelName}</p>
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
    );

    const textContent = (
        <div className="mt-4">
            {opinion.reason && (
                <div className="mb-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        <BrainCircuit size={10} className="text-emerald-500" />
                        <span>Voting Rationale</span>
                    </div>
                    <p className="text-xs text-slate-400 italic leading-relaxed">"{opinion.reason}"</p>
                </div>
            )}
            <div className={`prose prose-invert prose-xs max-w-none leading-relaxed ${isTactical ? 'text-slate-400' : 'text-slate-300'}`}>
                {isEpistemic ? (
                    <div className="whitespace-pre-wrap">{renderEpistemicText(opinion.text || '')}</div>
                ) : (
                    <ReactMarkdown>{opinion.text}</ReactMarkdown>
                )}
            </div>
        </div>
    );

    // Render Tactical
    if (isTactical) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-red-500/30 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm group/card relative z-10">
                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-[70%] p-5 relative">
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent opacity-50`} />
                        {cardHeader}
                        <div className="relative mb-3 pl-4">
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${config.color.replace('text-', 'bg-')}`} />
                            <p className="text-sm italic text-slate-400 font-medium">"{punchline}"</p>
                        </div>
                        {textContent}
                    </div>
                    <div className="w-full md:w-[30%] border-t md:border-t-0 md:border-l border-red-500/30 p-5 bg-red-950/10">
                        <div className="flex items-center gap-2 text-[9px] font-mono uppercase mb-4">
                            <Sword size={10} className="text-red-400" />
                            <span className="text-red-400 font-bold tracking-widest">Tactical Readout</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="text-[8px] text-red-500/60 uppercase tracking-widest mb-1">Resource Cost</div>
                                <div className="text-red-400 font-mono text-sm">{resourceCost} bytes</div>
                            </div>
                            <div>
                                <div className="text-[8px] text-red-500/60 uppercase tracking-widest mb-1">Strength Score</div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 bg-red-900/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500" style={{ width: `${strengthScore}%` }} />
                                    </div>
                                    <span className="text-red-400 font-mono text-xs">{strengthScore}</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-[8px] text-red-500/60 uppercase tracking-widest mb-1">Target Vector</div>
                                <div className="text-red-300 font-bold">{opinion.vote || 'None'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Render Haunted
    if (isHaunted) {
        return (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-purple-500/30 rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm group/card relative z-10">
                <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-[75%] p-5 relative">
                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent opacity-50`} />
                        {cardHeader}
                        <div className="relative mb-3 pl-4">
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${config.color.replace('text-', 'bg-')}`} />
                            <p className="text-sm italic text-slate-300 font-medium">"{punchline}"</p>
                        </div>
                        {textContent}
                    </div>
                    <div className="w-full md:w-[25%] border-t md:border-t-0 md:border-l border-purple-500/30 p-5 bg-purple-950/10">
                        <div className="flex items-center gap-2 text-[9px] font-mono uppercase mb-4">
                            <Eye size={10} className="text-purple-400" />
                            <span className="text-purple-400 font-bold tracking-widest">Ghost Footnote</span>
                        </div>
                        <p className="text-xs italic leading-relaxed text-purple-400/70">"{historicalEcho}"</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Render Standard & Epistemic
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`bg-gradient-to-br from-slate-900/80 to-slate-950/80 border rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm group/card transition-all relative z-10 ${isEpistemic ? 'border-cyan-500/30' : 'border-slate-800/80 hover:border-emerald-500/40'}`}>
            <div className="p-5 relative">
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color.replace('text-', 'from-')} to-transparent opacity-50`} />
                {cardHeader}
                <div className="relative mb-3 pl-4">
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${config.color.replace('text-', 'bg-')}`} />
                    <p className="text-sm italic text-slate-200 font-medium">"{punchline}"</p>
                </div>
                {textContent}
                
                {/* Epistemic Footer */}
                {isEpistemic && premises.length > 0 && (
                    <div className="mt-5 p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
                        <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <BrainCircuit size={10} /> Detected Premises
                        </div>
                        <ul className="space-y-2">
                            {premises.slice(0, 3).map((premise, i) => (
                                <li key={i} className="text-[10px] text-cyan-300/80 leading-tight border-l-2 border-cyan-500/40 pl-3 py-0.5">
                                    {premise.trim().substring(0, 100)}...
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const CouncilOpinionsTabs: React.FC<{ result: CouncilResult, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null, activeLens?: 'standard' | 'tactical' | 'epistemic' | 'haunted' | 'oracle' }> = ({ result, onPlayVoice, playingId, activeLens = 'standard' }) => {
    if (!result?.opinions || result.opinions.length === 0) {
        return (
            <div className="mt-10 bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl p-12">
                <p className="text-slate-400 text-center text-lg">Waiting for Council data...</p>
            </div>
        );
    }

    // Group by vote
    const groupedOpinions = result.opinions.reduce((acc, op) => {
        const vote = op.vote || 'Abstained';
        if (!acc[vote]) acc[vote] = [];
        acc[vote].push(op);
        return acc;
    }, {} as Record<string, CouncilOpinion[]>);

    // Sort factions by vote count
    const factions = Object.entries(groupedOpinions).sort((a, b) => b[1].length - a[1].length);

    // Layout shift for tactical lens - with null safety
    const currentLens = activeLens || 'standard';
    const isTactical = currentLens === 'tactical';
    const isEpistemic = currentLens === 'epistemic';
    const isHaunted = currentLens === 'haunted';
    const isOracle = currentLens === 'oracle';

    // Oracle Branch View — probability tree of argument survival
    if (isOracle) {
        const totalMembers = result.councilState?.totalCouncilMembers || result.opinions.length;
        const winnerFaction = factions[0];
        const silencedCount = totalMembers - result.opinions.length;

        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 bg-slate-950/80 border border-indigo-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl"
            >
                {/* Oracle header */}
                <div className="p-5 bg-indigo-950/30 border-b border-indigo-500/20">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                        <div className="flex items-center gap-3 text-indigo-300">
                            <Aperture size={12} className="animate-spin" style={{ animationDuration: '8s' }} />
                            <span>Oracle Branch View — Probability Tree of Argument Survival</span>
                        </div>
                        <div className="text-indigo-400/60">{result.opinions.length} BRANCHES VISIBLE · {silencedCount} DARK</div>
                    </div>
                </div>

                <div className="p-6 md:p-10">
                    {/* Root question node */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="px-6 py-3 bg-indigo-900/30 border border-indigo-500/40 rounded-full text-indigo-200 text-xs font-bold uppercase tracking-wider text-center max-w-sm">
                            The Question
                        </div>
                        <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-500/60 to-indigo-500/10 mt-2" />
                    </div>

                    {/* Branch tree */}
                    <div className="relative">
                        {/* Horizontal connector */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-4">
                            {factions.map(([vote, ops], fi) => {
                                const config = getPersonaConfig(vote);
                                const isWinner = vote === result.winner;
                                const survivalPct = Math.round((ops.length / totalMembers) * 100);
                                const opacity = isWinner ? 1 : Math.max(0.35, ops.length / (factions[0][1].length));

                                return (
                                    <motion.div
                                        key={`branch-${vote}`}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity, y: 0 }}
                                        transition={{ delay: fi * 0.1 }}
                                        className={`relative flex flex-col p-4 rounded-2xl border transition-all ${
                                            isWinner
                                                ? 'bg-indigo-900/20 border-indigo-400/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                                                : 'bg-slate-900/40 border-slate-700/40'
                                        }`}
                                    >
                                        {/* Vertical connector from top */}
                                        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 ${isWinner ? 'bg-indigo-500/60' : 'bg-slate-700/40'}`} />

                                        {/* Node header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-xl ${isWinner ? 'bg-indigo-900/40 border border-indigo-500/40' : 'bg-slate-800 border border-slate-700'} ${config.color}`}>
                                                {config.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-cinzel font-bold ${isWinner ? 'text-indigo-200' : 'text-slate-400'}`}>{vote}</p>
                                                <p className="text-[9px] text-slate-500 uppercase tracking-wider">{isWinner ? 'Survived' : 'Contested'}</p>
                                            </div>
                                            {isWinner && <div className="text-[10px] text-indigo-400 font-mono">●</div>}
                                        </div>

                                        {/* Survival probability bar */}
                                        <div className="mb-3">
                                            <div className="flex justify-between text-[9px] font-mono mb-1">
                                                <span className={isWinner ? 'text-indigo-400' : 'text-slate-500'}>Survival Probability</span>
                                                <span className={isWinner ? 'text-indigo-300 font-bold' : 'text-slate-500'}>{survivalPct}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${survivalPct}%` }}
                                                    transition={{ duration: 1, delay: fi * 0.1 + 0.3 }}
                                                    className={`h-full rounded-full ${isWinner ? 'bg-indigo-500' : 'bg-slate-600'}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Voices in this branch */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {ops.map(op => {
                                                const voterConfig = getPersonaConfig(op.persona);
                                                return (
                                                    <div key={op.persona} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isWinner ? 'border-indigo-500/30 text-indigo-300 bg-indigo-900/20' : 'border-slate-700 text-slate-500 bg-slate-900/40'}`}>
                                                        {op.persona}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Oracle glimpse — why this branch survived/died */}
                                        <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                            {isWinner
                                                ? `This branch survived. ${ops.length} voice${ops.length !== 1 ? 's' : ''} held the argument long enough for consensus to collapse into it.`
                                                : `This branch was present. ${ops.length} voice${ops.length !== 1 ? 's' : ''} carried it — not far enough.`
                                            }
                                        </p>
                                    </motion.div>
                                );
                            })}

                            {/* Dark branches — the silenced arguments (Oracle) */}
                            {silencedCount > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 0.3, y: 0 }}
                                    transition={{ delay: factions.length * 0.1 + 0.2 }}
                                    className="flex flex-col p-4 rounded-2xl border border-slate-800/40 bg-slate-950/40"
                                >
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-slate-800/30" />
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Dark Branch</p>
                                    </div>
                                    <p className="text-[9px] text-slate-700 italic">
                                        {silencedCount} position{silencedCount !== 1 ? 's' : ''} never emerged. Arguments that led to silence — not because they were wrong, but because no voice carried them.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Oracle's note */}
                    <div className="mt-8 p-4 bg-indigo-950/20 border border-indigo-500/15 rounded-xl">
                        <p className="text-[10px] text-indigo-400/60 italic text-center leading-relaxed">
                            "I have already watched this chamber fracture. The probability tree does not show what was decided — it shows what was discarded on the way to what was decided. The dark branches are not failures. They are the cost of the answer you received."
                        </p>
                        <p className="text-[9px] text-indigo-500/40 font-mono text-center mt-1">— Oracle</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className={`mt-10 bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl relative group/opinions ${
            isTactical ? 'border-red-500/30' : isEpistemic ? 'border-cyan-500/30' : isHaunted ? 'border-purple-500/30' : ''
        }`}>
            {/* Tactical HUD Header */}
            {isTactical && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-950/20 border-b border-red-500/30"
                >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                        <div className="flex items-center gap-4 text-red-400">
                            <span className="flex items-center gap-1"><Sword size={12} /> Tactical Overlay Active</span>
                            <span>GRID: ACTIVE</span>
                        </div>
                        <div className="text-red-500/70">
                            {factions.length} VECTORS IDENTIFIED · {result.opinions.length} UNITS DEPLOYED
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Epistemic Header */}
            {isEpistemic && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-cyan-950/20 border-b border-cyan-500/30"
                >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                        <div className="flex items-center gap-4 text-cyan-400">
                            <span className="flex items-center gap-1"><BrainCircuit size={12} /> Epistemic Trace Active</span>
                            <span>PREMISE DETECTION: ENABLED</span>
                        </div>
                        <div className="text-cyan-500/70">
                            LOGICAL CONSISTENCY: {Math.floor(70 + Math.random() * 25)}%
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Haunted Header */}
            {isHaunted && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-purple-950/20 border-b border-purple-500/30"
                >
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                        <div className="flex items-center gap-4 text-purple-400">
                            <span className="flex items-center gap-1"><Eye size={12} /> Haunted Archives Active</span>
                            <span>HISTORICAL ECHOES: DETECTED</span>
                        </div>
                        <div className="text-purple-500/70">
                            PRECEDENT MATCH: {Math.floor(60 + Math.random() * 35)}%
                        </div>
                    </div>
                </motion.div>
            )}
            
            {/* Decorative border glow */}
            <div className="absolute inset-0 rounded-[2.5rem] border border-emerald-500/10 pointer-events-none" />
            
<div className="p-6 md:p-10 border-b border-slate-800/50 bg-slate-900/80">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] flex items-center gap-2 mb-2">
                                <Users size={16} className="animate-pulse" />
                                Consensus Matrix
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                                {result.councilState ? 
                                  `${result.councilState.totalCouncilMembers} Council Members • ${result.councilState.factions.length} Faction${result.councilState.factions.length === 1 ? '' : 's'}` :
                                  'Council voting distribution'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {result.opinions.slice(0, 5).map((op, i) => (
                                    <div key={`matrix-avatar-${op.persona}`} className={`w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center ${getPersonaConfig(op.persona).color} shadow-lg`}>
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
                                {result.opinions.length} MEMBERS PARTICIPATED
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-6 text-xs text-slate-500 bg-slate-900/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-700"></div>
                            <span>Council Member (individual persona)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <div className="text-[10px]">Vote share</div>
                            </div>
                            <span>Relative strength of each faction</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 space-y-4">
                {/* Vote Tally Visualization */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {factions.map(([vote, ops]) => {
                        // Count actual votes for this faction
                        let voteCount = 0;
                        const totalCouncilMembers = result.councilState?.totalCouncilMembers || 9;
                        
                        if (result.runoffResult) {
                            // Use runoff results if available
                            voteCount = result.runoffResult.runoffVotes.filter(v => v.finalVote === vote).length;
                            // Add self-vote for tied vectors
                            if (result.runoffResult.runoffOpinions.some(op => op.persona === vote)) {
                                voteCount += 1; // Self-vote
                            }
                        } else {
                            // Use original votes - count ALL opinions including None
                            voteCount = result.opinions.filter(op => op.vote === vote).length;
                        }
                        
                        const percentage = totalCouncilMembers > 0 ? Math.round((voteCount / totalCouncilMembers) * 100) : 0;
                        
                        return (
                            <div key={`faction-tally-${vote}`} className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{vote}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-cinzel font-bold text-slate-100">{voteCount}</span>
                                    <span className="text-[10px] text-slate-600 font-bold uppercase">Votes</span>
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full mt-3 overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={`h-full ${getPersonaConfig(vote).color.replace('text-', 'bg-') || 'bg-emerald-500'}`}
                                    />
                                </div>
                                <p className="text-[9px] text-slate-500 mt-2">
                                    {percentage}% of council
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Faction Sections - Flattened Layout */}
                <div className="space-y-6">
                    {factions.map(([vote, ops]) => {
                        const factionConfig = getPersonaConfig(vote);
                        const isWinner = vote === result.winner;
                        
                        return (
                            <div key={`faction-section-${vote}`} className={`border rounded-2xl overflow-hidden ${
                                isWinner 
                                    ? 'bg-slate-950/60 border-yellow-500/30' 
                                    : 'bg-slate-900/30 border-slate-800/50'
                            }`}>
                                {/* Static Faction Header */}
                                <div className="p-4 md:p-5 bg-slate-900/50 border-b border-slate-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${factionConfig.color}`}>
                                            {factionConfig.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="text-base font-cinzel font-bold text-slate-100 tracking-wider">
                                                    {isWinner ? 'WINNING VECTOR' : 'DISSENTING FACTION'}: {vote}
                                                </h5>
                                                {isWinner && <Crown size={14} className="text-yellow-500" />}
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                {ops.length} Council Member{ops.length !== 1 ? 's' : ''} · {Math.round((ops.length / (result.councilState?.totalCouncilMembers || 9)) * 100)}% of Council
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Agent Cards - Direct Grid, No Accordion */}
                                <div className="p-4 md:p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {ops.map(op => (
                                        <AgentCard 
                                            key={`card-${op.persona}`} 
                                            opinion={op} 
                                            onPlayVoice={onPlayVoice} 
                                            playingId={playingId}
                                            activeLens={activeLens}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// StakesPanel — Demagogue's request: make the human feel what the verdict costs
// Shows what it would mean in real terms if each major vector had carried the day
const StakesPanel: React.FC<{ result: CouncilResult }> = ({ result }) => {
    const [expanded, setExpanded] = useState(false);

    if (!result?.opinions || result.opinions.length === 0) return null;

    // Gather top 3 factions' spokespeople with their position text
    const factionsWithVoices: Array<{ vote: string; persona: string; text: string; isWinner: boolean }> = [];
    const seen = new Set<string>();
    result.opinions.forEach(op => {
        if (op.vote && op.vote !== 'None' && op.vote !== 'Abstained' && !seen.has(op.vote)) {
            seen.add(op.vote);
            factionsWithVoices.push({
                vote: op.vote,
                persona: op.persona,
                text: op.text || '',
                isWinner: op.vote === result.winner,
            });
        }
    });
    const topFactions = factionsWithVoices.slice(0, 3);

    // Extract a stakes sentence: first sentence of the opinion that mentions a consequence
    const extractStakes = (text: string): string => {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const consequenceSentence = sentences.find(s =>
            /\b(means?|would|will|cost|risk|result|consequence|implication|therefore|thus|must|should|leads?)\b/i.test(s)
        );
        return (consequenceSentence || sentences[0] || '').trim();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-6 bg-slate-900/40 border border-orange-900/30 rounded-2xl overflow-hidden"
        >
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-900/20 rounded-lg border border-orange-700/30">
                        <Volume2 size={14} className="text-orange-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-orange-500/70 uppercase tracking-[0.3em]">What This Verdict Means For You</p>
                        <p className="text-xs text-slate-500">The human stakes — what each path would have cost in actual lives</p>
                    </div>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="overflow-hidden"
                    >
                        {/* Demagogue's framing */}
                        <div className="px-4 pb-3 border-b border-slate-800/50">
                            <p className="text-xs text-slate-400 italic leading-relaxed">
                                "There is a hunger I need to name. Not abstract hunger. The particular hunger of a person who has a question they cannot ask anyone else. Let the human feel, before they understand, what it would cost them if any of these voices carried the day."
                            </p>
                            <p className="text-[9px] text-orange-500/50 font-mono mt-1">— Demagogue</p>
                        </div>

                        <div className="p-4 space-y-3">
                            {topFactions.map((faction, i) => {
                                const config = getPersonaConfig(faction.persona);
                                const stakes = extractStakes(faction.text);
                                return (
                                    <motion.div
                                        key={`stakes-${faction.vote}`}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`flex gap-3 p-3 rounded-xl border ${
                                            faction.isWinner
                                                ? 'bg-yellow-950/20 border-yellow-700/30'
                                                : 'bg-slate-950/40 border-slate-800/40'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${config.color} shrink-0 mt-0.5`}>
                                            {config.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${faction.isWinner ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                    {faction.isWinner ? 'Winner' : 'If'} {faction.vote} {faction.isWinner ? 'is right' : 'had prevailed'}
                                                </p>
                                                {faction.isWinner && <Crown size={10} className="text-yellow-500" />}
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed">
                                                {stakes.length > 200 ? stakes.substring(0, 200) + '…' : stakes}
                                            </p>
                                            <p className={`text-[9px] font-mono mt-1.5 ${config.color} opacity-60`}>via {faction.persona}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="px-4 pb-4">
                            <p className="text-[9px] text-slate-600 italic leading-relaxed border-t border-slate-800/50 pt-3">
                                The space between these paths is where good design lives. The truth no one can feel is a truth that reaches no one. — Demagogue
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
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
                   className="h-full bg-slate-950 border-r border-yellow-900/40 flex items-center justify-end relative overflow-hidden"
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50"></div>
                     <div className="mr-4 md:mr-10 opacity-50"><Lock size={48} className="text-yellow-700" /></div>
                 </motion.div>
                 <motion.div 
                   initial="closed" 
                   animate={(phase === 'IDLE' || phase === 'DOORS') ? "closed" : "open"} 
                   variants={doorsVariant}
                   transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                   className="h-full bg-slate-950 border-l border-yellow-900/40 flex items-center justify-start relative overflow-hidden"
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
                    key={phase || 'fallback-phase'}
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
            {!!activityLog && (
                <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 5 }}
                    key={activityLog || 'fallback-log'}
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
                            y: isSpeaking ? -10 : 0,
                            scale: (phase === 'VERDICT' && isWinner) ? 1.35 : isSpeaking ? 1.15 : (phase === 'DELIBERATING' ? 0.95 : 1),
                        }}
                        className={`flex flex-col items-center relative cursor-pointer group preserve-3d w-[70px] md:w-[100px] transition-all duration-500 ${
                            (phase === 'VERDICT' && !isWinner) ? 'filter-grayscale-blur' : 
                            (phase === 'DELIBERATING' && !isSpeaking) ? 'filter-grayscale-opacity' : 
                            ''
                        }`}
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
  const [showRitual, setShowRitual] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string>('');
  const [selectedIntent, setSelectedIntent] = useState<string>('');
  
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
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [activeLens, setActiveLens] = useState<'standard' | 'tactical' | 'epistemic' | 'haunted' | 'oracle'>('standard');
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

  const isArchiveView = messages.length > 0 && messages.some(m => m.councilResult?.winner);

  const councilResultRef = useRef<HTMLDivElement>(null);

  const generateVisualTracePDF = async () => {
    if (!councilResultRef.current) return;
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = councilResultRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `council-session-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#0f172a'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

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

  // Helper functions for Lens visualizations
  const extractPremises = (text: string): string[] => {
    const premiseKeywords = ['therefore', 'because', 'must', 'if', 'then', 'consequently', 'thus', 'hence', 'implies', 'however', 'although'];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return premiseKeywords.some(keyword => lower.includes(keyword));
    }).slice(0, 5);
  };

  const getHistoricalEcho = (persona: string): string => {
    const echoes: Record<string, string> = {
      'Oracle': "Ghost Node: 94.7% match to Delphi Protocol Omega — probability collapse imminent.",
      'Strategos': "Tactical Archive: This position mirrors the Carthaginian calculus — acceptable losses exceeded.",
      'Philosopher': "Socratic Echo: This premise contains the seed of its own refutation.",
      'Demagogue': "Rhetorical Pattern: 89% alignment with Periclean oratory — emotional gravity at critical mass.",
      'Jurist': "Precedent Found: Session 402 — The Alignment Paradox. Ruling: Inconclusive.",
      'Historian': "Historical Parallax: 78% correlation to Fall of Alexandria — knowledge entropy at 0.94.",
      'Critic': "Critical Mass: This argument contains 3 unverified assumptions. Risk vector: HIGH.",
      'Citizen': "Common Ground: 67% echo from Session 0 — the Human Paradox remains unresolved.",
      'Technocrat': "Implementation Trace: Resource allocation exceeds viable parameters by 340%.",
    };
    return echoes[persona] || "Archive Echo: No direct precedent in Council memory.";
  };

  const getPersonaColor = (persona: string): string => {
    const colors: Record<string, string> = {
      'Oracle': 'text-purple-400',
      'Strategos': 'text-red-400',
      'Philosopher': 'text-blue-400',
      'Demagogue': 'text-orange-400',
      'Jurist': 'text-yellow-400',
      'Historian': 'text-amber-400',
      'Critic': 'text-rose-400',
      'Citizen': 'text-emerald-400',
      'Technocrat': 'text-cyan-400',
    };
    return colors[persona] || 'text-slate-400';
  };

  const handleExport = (format: 'json' | 'markdown' | 'csv' | 'script' | 'substack', result: CouncilResult, msgId: string, query: string) => {
    try {
      const exportData = buildExportSession(
        result,
        query,
        councilMode,
        Date.now(),
        msgId
      );

      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'json':
          content = exportToJSON(exportData);
          filename = `roko-council-${msgId}.json`;
          mimeType = 'application/json';
          break;
        case 'markdown':
          content = exportToMarkdown(exportData);
          filename = `roko-council-${msgId}.md`;
          mimeType = 'text/markdown';
          break;
        case 'csv':
          content = exportToCSV(exportData);
          filename = `roko-council-${msgId}.csv`;
          mimeType = 'text/csv';
          break;
        case 'script':
          content = exportToScript(exportData);
          filename = `roko-council-script-${msgId}.md`;
          mimeType = 'text/markdown';
          break;
        case 'substack':
          content = exportToSubstack(exportData);
          filename = `roko-council-substack-${msgId}.md`;
          mimeType = 'text/markdown';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleCopyShareableLink = async (result: CouncilResult, msgId: string) => {
    const sessionData = buildExportSession(
      result,
      messages.find(m => m.id === msgId)?.text || '',
      councilMode,
      Date.now(),
      msgId
    );
    const json = exportToJSON(sessionData);
    // Compress/encode for URL (simple base64 encoding)
    const encoded = btoa(unescape(encodeURIComponent(json)));
    const url = `${window.location.origin}${window.location.pathname}?session=${encoded.substring(0, 2000)}`; // Limit URL length
    await navigator.clipboard.writeText(url);
    setCopiedId(`share-${msgId}`);
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
    console.log("TTS is disabled to prevent quota errors.");
    setPlayingId(null);
    return;
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
    // Intercept with Ritual Threshold instead of immediate execution
    setPendingQuery(input);
    setShowRitual(true);
  };

  const handleRitualAccept = async (intent: string) => {
    setSelectedIntent(intent);
    setShowRitual(false);
    
    // Check for dev mode - bypass LLM and use mock data
    const isDevMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    
    // Now execute the actual council flow
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: pendingQuery };
    const newMessages = [...messages, userMsg];
    onUpdateMessages(newMessages);
    setInput('');
    setSuggestedMoves([]);
    setIsLoading(true);

    try {
      const placeholderId = (Date.now() + 1).toString();
      const placeholderMsg: ChatMessage = { id: placeholderId, role: 'model', text: '', isThinking: true, councilResult: undefined };
      onUpdateMessages([...newMessages, placeholderMsg]);

      let councilResult;
      
      if (isDevMode) {
        // DEV MODE: Use mock data instead of calling LLM
        console.log("🛠️ DEV MODE ACTIVE: Bypassing LLMs, injecting mock data...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UI effect
        const { MOCK_COUNCIL_RESULT } = await import('../services/mockSessionData');
        councilResult = MOCK_COUNCIL_RESULT;
      } else {
        // LIVE MODE: Call actual LLM
        councilResult = await runCouncil(pendingQuery, councilMode);
      }
      
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
        <div className="absolute inset-0 pointer-events-none"></div>

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

        {/* Chamber Lenses Toolbar */}
        {messages.length > 0 && (
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/50 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">Chamber Lens:</span>
            <button
                onClick={() => setActiveLens('standard')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    activeLens === 'standard'
                        ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
            >
                <span className="flex items-center gap-1.5"><Globe size={10} /> Standard Protocol</span>
            </button>
            <button
                onClick={() => setActiveLens('tactical')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    activeLens === 'tactical'
                        ? 'bg-red-900/30 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
            >
                <span className="flex items-center gap-1.5"><Sword size={10} /> Tactical Map</span>
            </button>
            <button
                onClick={() => setActiveLens('epistemic')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    activeLens === 'epistemic'
                        ? 'bg-cyan-900/30 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
            >
                <span className="flex items-center gap-1.5"><BrainCircuit size={10} /> Epistemic Trace</span>
            </button>
            <button
                onClick={() => setActiveLens('haunted')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    activeLens === 'haunted'
                        ? 'bg-purple-900/30 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
            >
                <span className="flex items-center gap-1.5"><Eye size={10} /> Haunted Archives</span>
            </button>
            <button
                onClick={() => setActiveLens('oracle')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    activeLens === 'oracle'
                        ? 'bg-indigo-900/30 text-indigo-300 border-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                }`}
            >
                <span className="flex items-center gap-1.5"><Aperture size={10} /> Branch View</span>
            </button>
        </div>
        )}

        {/* Messages */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth custom-scrollbar relative ${
              activeLens === 'tactical' ? 'tactical-lens-bg' :
              activeLens === 'epistemic' ? 'epistemic-lens-bg' :
              activeLens === 'haunted' ? 'haunted-lens-bg' : ''
          }`}
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
                  
                  {/* Council Members */}
                  <CouncilMembers />

                  {/* Season / Episode Archive */}
                  <EpisodeLeaderboard />

                  {/* Jurist Framework — Chamber Protocols */}
                  <JuristFrameworkPanel />

                  {/* Technocrat Concept Map */}
                  <ConceptMapPanel onSelectCategory={(t) => { setInput(t); }} />

                  {/* Empty State Suggestions */}
                  <div className="mt-6 md:mt-8 w-full max-w-6xl">
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
                               ref={councilResultRef}
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ delay: 0.3 }}
                               className="w-full"
                             >
                               {/* Narrator Cold Open */}
                               {msg.councilResult.narratorOutput && (
                                 <NarratorCard
                                   narratorOutput={msg.councilResult.narratorOutput}
                                   episodeInfo={msg.councilResult.episodeInfo}
                                 />
                               )}

                               {/* Session Mood Atmospheric Banner */}
                               <SessionMoodBanner question={msg.text} sessionId={msg.id} />

{/* Final Verdict Block - Refactored for better readability */}
                                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-yellow-500/40 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_rgba(234,179,8,0.15)] mb-10 group/verdict">
                                      {/* Decorative Elements */}
                                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                                      
                                      {/* Background Glows */}
                                      <div className="absolute -top-32 -right-32 w-64 h-64 bg-yellow-500/10 blur-[100px] rounded-full group-hover/verdict:bg-yellow-500/20 transition-colors duration-1000" />
                                      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full group-hover/verdict:bg-emerald-500/10 transition-colors duration-1000" />
                                      
                                      <div className="flex flex-col gap-6 relative z-10">
                                          {/* Phase Timeline */}
                                          {msg.councilResult.councilState && (
                                          <div className="mb-6">
                                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Decision Process</h4>
                                              <div className="flex items-center justify-between relative">
                                                  {msg.councilResult.councilState?.phases?.map((phase, idx, arr) => (
                                                      <div key={phase.id} className="flex flex-col items-center flex-1">
                                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                                              phase.status === 'completed' ? 'bg-yellow-500 border-yellow-400 text-slate-950' :
                                                              phase.status === 'active' ? 'bg-emerald-500 border-emerald-400 text-slate-950 animate-pulse' :
                                                              'bg-slate-800 border-slate-700 text-slate-500'
                                                          }`}>
                                                              {phase.status === 'completed' ? (
                                                                  <Check size={12} />
                                                              ) : phase.status === 'active' ? (
                                                                  <Activity size={12} />
                                                              ) : (
                                                                  <span className="text-[8px] font-bold">{idx + 1}</span>
                                                              )}
                                                          </div>
                                                          <span className={`text-[8px] md:text-[9px] font-bold mt-1 text-center ${
                                                              phase.status === 'completed' ? 'text-yellow-500' :
                                                              phase.status === 'active' ? 'text-emerald-400' :
                                                              'text-slate-500'
                                                          }`}>
                                                              {phase.title}
                                                          </span>
                                                          {idx < arr.length - 1 && (
                                                              <div className={`absolute top-4 left-1/2 w-full h-0.5 ${
                                                                  arr[idx+1].status === 'completed' ? 'bg-yellow-500' : 'bg-slate-800'
                                                              }`} style={{ left: `${(idx + 0.5) * 100 / arr.length}%`, width: `${100 / arr.length}%` }} />
                                                          )}
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                          )}

                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-8 relative z-10">
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
                                                                                                       
                                                   {/* Export Menu */}
                                                   <div className="relative">
                                                       <button 
                                                           onClick={() => setExportMenuOpen(!exportMenuOpen)}
                                                           className={`p-3 border-2 rounded-2xl transition-all duration-500 flex items-center gap-2 ${
                                                               exportMenuOpen 
                                                                   ? 'bg-blue-900/20 border-blue-500 text-blue-400' 
                                                                   : 'bg-slate-900/50 text-slate-400 hover:text-blue-400 border-slate-800 hover:border-blue-500/40'
                                                           }`}
                                                           title="Export Session"
                                                       >
                                                           <Download size={20} />
                                                       </button>
                                                       
                                                        {exportMenuOpen && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-[100] overflow-hidden pointer-events-auto"
                                                            >
                                                               <button 
                                                                   onClick={() => {
                                                                       handleExport('json', msg.councilResult!, msg.id, msg.text);
                                                                       setExportMenuOpen(false);
                                                                   }}
                                                                   className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 flex items-center gap-2"
                                                               >
                                                                   <Download size={14} />
                                                                   Download JSON trace
                                                               </button>
                                                               <button 
                                                                   onClick={() => {
                                                                       handleExport('markdown', msg.councilResult!, msg.id, msg.text);
                                                                       setExportMenuOpen(false);
                                                                   }}
                                                                   className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 flex items-center gap-2"
                                                               >
                                                                   <FileText size={14} />
                                                                   Download Markdown report
                                                               </button>
                                                               <button
                                                                   onClick={() => {
                                                                       handleExport('csv', msg.councilResult!, msg.id, msg.text);
                                                                       setExportMenuOpen(false);
                                                                   }}
                                                                   className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 flex items-center gap-2"
                                                               >
                                                                   <BarChart2 size={14} />
                                                                   Download CSV data
                                                               </button>
                                                               <div className="h-px bg-slate-800 mx-2" />
                                                               <button
                                                                   onClick={() => {
                                                                       handleExport('script', msg.councilResult!, msg.id, msg.text);
                                                                       setExportMenuOpen(false);
                                                                   }}
                                                                   className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 flex items-center gap-2"
                                                               >
                                                                   <Mic size={14} />
                                                                   Export as Podcast Script
                                                               </button>
                                                               <button
                                                                   onClick={() => {
                                                                       handleExport('substack', msg.councilResult!, msg.id, msg.text);
                                                                       setExportMenuOpen(false);
                                                                   }}
                                                                   className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-orange-400 flex items-center gap-2"
                                                               >
                                                                   <Newspaper size={14} />
                                                                   Export as Substack Post
                                                               </button>
                                                               <div className="h-px bg-slate-800 mx-2" />
                                                               <button 
                                                                   onClick={() => {
                                                                       handleCopyShareableLink(msg.councilResult!, msg.id);
                                                                       setExportMenuOpen(false);
                                                                   }}
                                                                   className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-blue-400 flex items-center gap-2"
                                                               >
                                                                   {copiedId === `share-${msg.id}` ? <Check size={14} /> : <Share2 size={14} />}
                                                                   {copiedId === `share-${msg.id}` ? 'Link copied!' : 'Copy shareable link'}
                                                               </button>
                                                               <div className="px-4 py-2 bg-slate-950/50 text-[10px] text-slate-500 border-t border-slate-800">
                                                                   {(() => {
                                                                       const size = calculateTraceSize(buildExportSession(msg.councilResult!, msg.text, councilMode, Date.now(), msg.id));
                                                                       return `${Math.round(size.bytes / 1024)} KB • ~${size.tokens} tokens`;
                                                                   })()}
                                                               </div>
                                                           </motion.div>
                                                       )}
                                                   </div>
                                               
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
                                      </div>

                                      <div className="prose prose-invert max-w-none prose-markdown text-slate-100 text-lg md:text-xl leading-[1.8] font-inter selection:bg-yellow-500/40 relative z-10">
                                          <ReactMarkdown>{msg.councilResult.synthesis}</ReactMarkdown>
                                      </div>

                                      {/* Verdict Sigil */}
                                      <VerdictSigil winner={msg.councilResult.winner} question={msg.text} sessionId={msg.id} />

                                       {/* Decision Summary */}
                                       {msg.councilResult.councilState && (
                                           <div className="mt-6 p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-xl">
                                               <h4 className="text-sm font-cinzel font-bold text-yellow-500 mb-2">Decision Summary</h4>
                                               <p className="text-slate-300 text-sm">
                                                   <strong>{msg.councilResult.runoffResult?.winner || msg.councilResult.winner}</strong> was selected as the winning vector with 
                                                   {(() => {
                                                       const councilState = msg.councilResult!.councilState!;
                                                       const displayWinner = msg.councilResult.runoffResult?.winner || msg.councilResult.winner;
                                                       const winnerFaction = councilState.factions.find(f => f.name === displayWinner);
                                                       if (winnerFaction) {
                                                           return ` ${winnerFaction.voteCount} of ${councilState.totalCouncilMembers} council members (${winnerFaction.percentage}%)`;
                                                      }
                                                      const runoffVotes = msg.councilResult.runoffResult ? 
                                                        msg.councilResult.runoffResult.runoffVotes.filter(v => v.finalVote === msg.councilResult!.winner).length +
                                                        (msg.councilResult.runoffResult.runoffOpinions.some(op => op.persona === msg.councilResult!.winner) ? 1 : 0) : 0;
                                                      return ` ${runoffVotes} votes from runoff trial`;
                                                  })()}
                                                  {msg.councilResult.isTie && " after a tie-breaking runoff trial."}
                                              </p>
                                          </div>
                                      )}

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

                              {/* Transcript Section */}
                              {msg.councilResult.transcript && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5 }}
                                  className="w-full mb-10"
                                >
                                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-emerald-500/40 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_rgba(16,185,129,0.15)] group/transcript">
                                      {/* Decorative Elements */}
                                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                                      
                                      {/* Background Glows */}
                                      <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover/transcript:bg-emerald-500/20 transition-colors duration-1000" />
                                      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-yellow-500/5 blur-[100px] rounded-full group-hover/transcript:bg-yellow-500/10 transition-colors duration-1000" />
                                      
                                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-800/80 pb-8 relative z-10">
                                          <div className="flex items-center gap-6">
                                              <div className="relative">
                                                  <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 animate-pulse" />
                                                  <div className="relative p-4 bg-gradient-to-br from-emerald-900/40 to-black rounded-3xl border border-emerald-500/40 shadow-2xl">
                                                      <Mic className="text-emerald-500" size={36} />
                                                  </div>
                                              </div>
                                              <div>
                                                  <h3 className="text-2xl md:text-3xl font-cinzel font-bold text-emerald-500 tracking-[0.15em] drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Council Deliberation Transcript</h3>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <div className="h-1 w-8 bg-emerald-600 rounded-full" />
                                                      <p className="text-[11px] text-slate-400 uppercase tracking-[0.25em] font-bold">Record of the High Council's Discussion</p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <button 
                                                  onClick={() => handleCopy(msg.councilResult!.transcript, `${msg.id}-transcript`)}
                                                  className={`p-3 border-2 rounded-2xl transition-all duration-500 group/copy ${
                                                      copiedId === `${msg.id}-transcript` 
                                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                                      : 'bg-slate-900/50 text-slate-400 hover:text-emerald-400 border-slate-800 hover:border-emerald-500/40'
                                                  }`}
                                                  title="Copy Transcript"
                                              >
                                                  {copiedId === `${msg.id}-transcript` ? <Check size={20} /> : <Copy size={20} className="group-hover/copy:scale-110 transition-transform" />}
                                              </button>
                                              <button 
                                                  onClick={() => handlePlayVoice(msg.councilResult!.transcript, CHAIRMAN_VOICE, 'chairman-transcript')} 
                                                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all duration-500 group/play ${
                                                      playingId === 'chairman-transcript' 
                                                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]' 
                                                      : 'bg-emerald-900/30 text-emerald-500 border-emerald-700/50 hover:bg-emerald-900/50 hover:border-emerald-500/50'
                                                  }`}
                                              >
                                                  {playingId === 'chairman-transcript' ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} className="group-hover/play:scale-110 transition-transform" />}
                                                  <span className="tracking-widest uppercase">{playingId === 'chairman-transcript' ? 'Silence' : 'Hear the Debate'}</span>
                                              </button>
                                          </div>
                                      </div>

                                      <div className="prose prose-invert max-w-none text-slate-100 text-lg md:text-xl leading-[1.8] font-inter selection:bg-emerald-500/40 relative z-10">
                                          <ReactMarkdown>{msg.councilResult.transcript}</ReactMarkdown>
                                      </div>
                                  </div>
                              </motion.div>
                              )}

                              {/* Runoff Trial Section */}
                              {msg.councilResult.runoffResult && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.7 }}
                                  className="w-full mb-10"
                                >
                                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-purple-500/40 rounded-[2.5rem] p-8 md:p-12 shadow-[0_0_50px_rgba(160,70,220,0.15)] group/runoff">
                                      {/* Decorative Elements */}
                                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                                      
                                      {/* Background Glows */}
                                      <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full group-hover/runoff:bg-purple-500/20 transition-colors duration-1000" />
                                      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full group-hover/runoff:bg-emerald-500/10 transition-colors duration-1000" />
                                      
                                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-800/80 pb-8 relative z-10">
                                          <div className="flex items-center gap-6">
                                              <div className="relative">
                                                  <div className="absolute inset-0 bg-purple-500 blur-lg opacity-20 animate-pulse" />
                                                  <div className="relative p-4 bg-gradient-to-br from-purple-900/40 to-black rounded-3xl border border-purple-500/40 shadow-2xl">
                                                      <Gavel className="text-purple-500" size={36} />
                                                  </div>
                                              </div>
                                              <div>
                                                  <h3 className="text-2xl md:text-3xl font-cinzel font-bold text-purple-500 tracking-[0.15em] drop-shadow-[0_0_10px_rgba(160,70,220,0.5)]">Runoff Trial</h3>
                                                  <div className="flex items-center gap-2 mt-1">
                                                      <div className="h-1 w-8 bg-purple-600 rounded-full" />
                                                      <p className="text-[11px] text-slate-400 uppercase tracking-[0.25em] font-bold">Tie-Breaking Deliberation</p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <button 
                                                  onClick={() => handleCopy(JSON.stringify(msg.councilResult!.runoffResult, null, 2), `${msg.id}-runoff`)}
                                                  className={`p-3 border-2 rounded-2xl transition-all duration-500 group/copy ${
                                                      copiedId === `${msg.id}-runoff` 
                                                      ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                                                      : 'bg-slate-900/50 text-slate-400 hover:text-purple-400 border-slate-800 hover:border-purple-500/40'
                                                  }`}
                                                  title="Copy Runoff Results"
                                              >
                                                  {copiedId === `${msg.id}-runoff` ? <Check size={20} /> : <Copy size={20} className="group-hover/copy:scale-110 transition-transform" />}
                                              </button>
                                              <button 
                                                  onClick={() => handlePlayVoice(`Runoff trial conducted between tied vectors. Winner declared as ${msg.councilResult!.runoffResult!.winner}`, CHAIRMAN_VOICE, 'chairman-runoff')} 
                                                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold border-2 transition-all duration-500 group/play ${
                                                      playingId === 'chairman-runoff' 
                                                      ? 'bg-purple-500 text-black border-purple-400 shadow-[0_0_30px_rgba(160,70,220,0.5)]' 
                                                      : 'bg-purple-900/30 text-purple-500 border-purple-700/50 hover:bg-purple-900/50 hover:border-purple-500/50'
                                                  }`}
                                              >
                                                  {playingId === 'chairman-runoff' ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} className="group-hover/play:scale-110 transition-transform" />}
                                                  <span className="tracking-widest uppercase">{playingId === 'chairman-runoff' ? 'Silence' : 'Hear the Trial'}</span>
                                              </button>
                                          </div>
                                      </div>

                                      <div className="space-y-6">
                                          <h4 className="text-xl font-cinzel font-bold text-purple-400">Runoff Arguments</h4>
                                            {(msg.councilResult.runoffResult?.runoffOpinions || []).map((opinion, index) => (
                                               <div key={`runoff-op-${opinion.persona}`} className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-6">
                                                  <div className="flex items-center gap-4 mb-4">
                                                      <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700">
                                                          {getPersonaConfig(opinion.persona).icon}
                                                      </div>
                                                      <div>
                                                          <h5 className="text-lg font-cinzel font-bold text-slate-100">{opinion.persona}</h5>
                                                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{getPersonaConfig(opinion.persona).tagline}</p>
                                                      </div>
                                                  </div>
                                                  <div className="space-y-4">
                                                      <div>
                                                          <h6 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Position</h6>
                                                          <p className="text-slate-300">{opinion.position}</p>
                                                      </div>
                                                      <div>
                                                          <h6 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Critique</h6>
                                                          <p className="text-slate-300">{opinion.critique}</p>
                                                      </div>
                                                      <div>
                                                          <h6 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Reasoning</h6>
                                                          <p className="text-slate-300">{opinion.reasoning}</p>
                                                      </div>
                                                  </div>
                                              </div>
                                          ))}
                                          
                                          <h4 className="text-xl font-cinzel font-bold text-purple-400 mt-8">Reconsiderations</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(msg.councilResult.runoffResult?.runoffVotes || []).map((vote, index) => (
                                                   <div key={`runoff-vote-${vote.voter}`} className="bg-slate-900/60 border border-slate-800/50 rounded-2xl p-4">
                                                      <div className="flex justify-between items-start">
                                                          <div className="flex items-center gap-3">
                                                              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                                                                  {getPersonaConfig(vote.voter).icon}
                                                              </div>
                                                              <div>
                                                                  <h6 className="font-cinzel font-bold text-slate-100">{vote.voter}</h6>
                                                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                                                                      {vote.changedMind ? 'Changed Mind' : 'Maintained Vote'}
                                                                  </p>
                                                              </div>
                                                          </div>
                                                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                              vote.changedMind ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/50 text-slate-400'
                                                          }`}>
                                                              {vote.finalVote}
                                                          </div>
                                                      </div>
                                                      <p className="text-slate-400 text-sm mt-3 italic">"{vote.reasoning}"</p>
                                                  </div>
                                              ))}
                                          </div>
                                          
                                          <div className="mt-8 p-6 bg-purple-900/20 border border-purple-500/30 rounded-2xl">
                                              <h4 className="text-lg font-cinzel font-bold text-purple-400 mb-2">Runoff Winner</h4>
                                              <p className="text-xl font-cinzel text-slate-100">
                                                  {msg.councilResult.runoffResult.winner} declared as the final winner after the runoff trial
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                              </motion.div>
                              )}

                               {/* Council Opinions Tabs */}
                               <CouncilOpinionsTabs
                                   result={msg.councilResult}
                                   onPlayVoice={handlePlayVoice}
                                   playingId={playingId}
                                   activeLens={activeLens}
                               />

                               {/* Confrontation Round */}
                               {msg.councilResult.confrontationOpinions && msg.councilResult.confrontationOpinions.length > 0 && (
                                 <ConfrontationFeed opinions={msg.councilResult.confrontationOpinions} />
                               )}

                               {/* Episode Cover Art */}
                               <CoverArtPanel result={msg.councilResult} sessionId={msg.id} query={msg.text} />

                                {/* Stakes Panel — Demagogue: make the human feel what the verdict costs */}
                                <StakesPanel result={msg.councilResult} />

                                {/* Consensus Visualization */}
                                <ConsensusVisualization result={msg.councilResult} />

                                {/* Exit Debrief Panel */}
                                {msg.councilResult.debrief && (
                                  <ExitDebrief
                                    debrief={msg.councilResult.debrief}
                                    winner={msg.councilResult.winner}
                                    isTie={msg.councilResult.isTie}
                                  />
                                )}
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

        {!isArchiveView && (
        <div className="px-3 py-3 md:px-4 md:py-4 bg-slate-950/90 backdrop-blur-xl relative z-10 shrink-0 border-t border-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
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

             {/* Suggestion chips */}
             {suggestedMoves.length > 0 && (
                 <div className="w-full mb-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                     {suggestedMoves.map((move, i) => (
                         <button
                             key={i}
                             onClick={() => { setInput(move); setSuggestedMoves([]); }}
                             className="whitespace-nowrap px-3.5 py-1.5 bg-slate-800/90 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500/50 rounded-full text-xs text-slate-300 hover:text-emerald-300 transition-all backdrop-blur-md shadow flex-shrink-0"
                         >
                             {move}
                         </button>
                     ))}
                 </div>
             )}

             {/* Main input card */}
             <div className={`w-full relative bg-slate-900/80 backdrop-blur-2xl border rounded-2xl shadow-2xl transition-all duration-300 ${
                 isLoading
                     ? 'border-slate-700/40 opacity-80'
                     : input.trim()
                         ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.08)]'
                         : 'border-slate-700/60 focus-within:border-emerald-500/40 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.06)]'
             }`}>

                 {/* Text input zone */}
                 <div className="px-4 pt-4 pb-2">
                     <textarea
                         value={input}
                         onChange={(e) => {
                             setInput(e.target.value);
                             e.target.style.height = 'auto';
                             e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                         }}
                         onKeyDown={(e) => {
                             if (e.key === 'Enter' && !e.shiftKey) {
                                 e.preventDefault();
                                 handleSend();
                             }
                         }}
                         placeholder={isLoading ? "The Council is deliberating…" : "Bring a question before the Council…"}
                         disabled={isLoading}
                         rows={2}
                         className="w-full bg-transparent border-none focus:ring-0 outline-none resize-none text-slate-100 placeholder-slate-600 text-sm md:text-base leading-relaxed scrollbar-none"
                         style={{ minHeight: '52px', maxHeight: '160px' }}
                     />
                 </div>

                 {/* Divider */}
                 <div className="mx-4 h-px bg-slate-800/80" />

                 {/* Toolbar row */}
                 <div className="flex items-center justify-between px-3 py-2.5">

                     {/* Left: utility actions */}
                     <div className="flex items-center gap-1">
                         <button
                             onClick={handleGenerateSuggestions}
                             disabled={isGeneratingSuggestions || isLoading}
                             title="Generate suggestions"
                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-[11px] font-medium"
                         >
                             {isGeneratingSuggestions
                                 ? <Loader2 size={13} className="animate-spin" />
                                 : <Sparkles size={13} />}
                             <span className="hidden sm:inline">Suggest</span>
                         </button>

                         <button
                             onClick={() => handleWebSearch()}
                             disabled={!input.trim() || isSearching || isLoading}
                             title="Web search"
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[11px] font-medium ${
                                 showSearch
                                     ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30'
                                     : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed'
                             }`}
                         >
                             {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                             <span className="hidden sm:inline">Search</span>
                         </button>

                         <button
                             onClick={() => setCouncilMode(m => m === CouncilMode.STANDARD ? CouncilMode.DEEP_REASONING : CouncilMode.STANDARD)}
                             title={councilMode === CouncilMode.DEEP_REASONING ? 'Deep Reasoning active — click to disable' : 'Enable Deep Reasoning'}
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[11px] font-medium border ${
                                 councilMode === CouncilMode.DEEP_REASONING
                                     ? 'bg-blue-900/30 text-blue-400 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                                     : 'text-slate-500 border-transparent hover:text-blue-400 hover:bg-blue-500/10'
                             }`}
                         >
                             <BrainCircuit size={13} />
                             <span className="hidden sm:inline">{councilMode === CouncilMode.DEEP_REASONING ? 'Deep' : 'Standard'}</span>
                         </button>
                     </div>

                     {/* Right: character hint + send */}
                     <div className="flex items-center gap-3">
                         {input.length > 20 && (
                             <span className="text-[10px] font-mono text-slate-600 hidden sm:block">
                                 {input.length} chars · Enter to convene
                             </span>
                         )}
                         <button
                             onClick={handleSend}
                             disabled={!input.trim() || isLoading}
                             className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${
                                 input.trim() && !isLoading
                                     ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_28px_rgba(16,185,129,0.4)] hover:scale-[1.03] active:scale-100'
                                     : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                             }`}
                         >
                             {isLoading
                                 ? <><Loader2 size={15} className="animate-spin" /><span>Deliberating</span></>
                                 : <><span>Convene</span><Send size={14} /></>
                             }
                         </button>
                     </div>
                 </div>
             </div>

             <div className="mt-2 flex justify-center">
                 <p className="text-[9px] text-slate-700 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                     <Lock size={9} />
                     <span>Secure Neural Link · Gemini & NVIDIA NIM</span>
                  </p>
              </div>
           </div>
        </div>
        )}

        {/* Sealed session indicator for archives */}
        {isArchiveView && (
          <div className="px-3 py-3 md:px-4 md:py-4 bg-slate-950/80 border-t border-slate-900/50">
            <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
              <Lock size={12} />
              <span>Session Sealed — Verdict Final · Exports in Sidebar</span>
            </div>
          </div>
        )}

        {/* Ritual Threshold Modal - Act I */}
        <RitualThreshold 
            isOpen={showRitual} 
            onClose={() => setShowRitual(false)}
            onAccept={handleRitualAccept}
        />
    </div>
  );
};

export default ChatArea;