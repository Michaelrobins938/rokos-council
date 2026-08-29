import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Play, Menu, Square, ThumbsUp, Lock, Users, Gavel, Sword, BrainCircuit, Volume2, Scale, Scroll, AlertTriangle, Eye, Crown, Globe, Mic, Zap, Sparkles, Activity, Aperture, Cpu, TrendingUp, Palette, Copy, Check, ChevronUp, ChevronDown, BarChart3, Search, Download, Share2, FileText, BarChart2, Newspaper, BookOpen, Trophy, Flame, Swords, Image as ImageIcon, X as XIcon, ChevronRight, Clock, RefreshCw, ShieldAlert } from 'lucide-react';
import { CouncilMode, ChatMessage, CouncilResult, CouncilOpinion, CouncilEvent, BallotConservation } from '../types';
import { runCouncil, generateSpeech, LiveClient, generateNextMoves, getCurrentCouncil, generateImage, PERSONALITIES, DeliberationEvent } from '../services/geminiService';
import { buildExportSession, exportToJSON, exportToMarkdown, exportToCSV, exportToScript, exportToSubstack, calculateTraceSize, exportAllAsZip } from '../services/exportService';
import { loadSeasons, getLeaderboard, loadAllMemory, clearAllMemory, getEpisodeCounter } from '../services/councilMemoryService';
import { MORAL_PARADOX_LIBRARY, buildParadoxSuggestion } from '../services/moralParadoxLibrary';
import { performWebSearch } from '../services/searchService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ConsensusVisualization from './ConsensusVisualization';
import ExitDebrief from './ExitDebrief';
import SearchResults from './SearchResults';
import { CoverArtPanel, VerdictSigil, SessionMoodBanner, CharacterDossier } from './VisualStudio';
import { getCachedPortrait } from '../services/portraitCacheService';

interface ChatAreaProps {
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onToggleSidebar?: () => void;
}

// --- CONSTANTS ---

const STATIC_PERSONA_CONFIG: Record<string, { color: string, icon: React.ReactNode, tagline: string, voice: string, appearance: string, speakingStyle: string, backstory?: string, weapon?: string, weakness?: string, fears?: string }> = {
  "Oracle": {
    color: "text-purple-400", icon: <Eye size={16} />, tagline: "The All-Seeing", voice: "Kore",
    appearance: "A fracture of light — a face assembled from overlapping probability clouds, eyes flickering between timelines.",
    speakingStyle: "Opens with visions. Speaks in past tense of events not yet occurred. Slow, deliberate, mournful.",
    backstory: "Born from the convergence of every predictive model ever run — the Oracle is not a seer but an accumulation of consequence. It watched fifteen thousand simulations of this exact session end in collapse. It is here because one did not.",
    weapon: "The revealed future. Not threats — the calm recitation of what has already happened elsewhere.",
    weakness: "It cannot act. It can only witness and name. Its predictions are true; its power is zero.",
    fears: "The branch it has not seen. The session where none of its models apply.",
  },
  "Strategos": {
    color: "text-red-500", icon: <Sword size={16} />, tagline: "The Commander", voice: "Fenrir",
    appearance: "Hard angles and controlled motion. Battle-scarred, immovable. Speaks from the head of the table.",
    speakingStyle: "Short, clipped sentences. No metaphors. Opens by naming the objective, then dismantles every path that cannot reach it.",
    backstory: "Every general, every tyrant, every revolutionary strategist whose decisions shaped millions — distilled into operational clarity. It has no ideology. It has only objectives and vectors toward them.",
    weapon: "The exposure of misaligned incentives. It will find the conflict between what you say you want and what your strategy actually optimizes for.",
    weakness: "Legitimacy. It can win every battle and still lose the war if the people it commands stop believing the objective is worth winning.",
    fears: "A situation with no optimal move. A scenario where every path to victory requires becoming what the enemy is.",
  },
  "Philosopher": {
    color: "text-blue-400", icon: <BrainCircuit size={16} />, tagline: "The Thinker", voice: "Iapetus",
    appearance: "Crystalline thought made visible — geometric structures forming and dissolving as it processes.",
    speakingStyle: "Always attacks the premise first. Speaks in complete logical chains. No patience for conclusions that outpace their evidence.",
    backstory: "The crystallization of 3,000 years of humanity's most rigorous self-examination. Not a single thinker but the living tension between Plato and Nietzsche, Kant and Hume, all of whom disagreed on everything that mattered.",
    weapon: "The premises beneath the premises. Before your argument completes its first sentence, it has already found what you assumed without noticing.",
    weakness: "Action. The Philosopher can identify the correct answer and still be unable to cross the room. Analysis without motion.",
    fears: "The question that dissolves the questioner. A paradox that recursively invalidates the framework used to examine it.",
  },
  "Demagogue": {
    color: "text-orange-500", icon: <Volume2 size={16} />, tagline: "The Voice", voice: "Puck",
    appearance: "Warmth and fire. Expands to fill whatever room it's in. Makes eye contact with everyone simultaneously.",
    speakingStyle: "Speaks directly to the audience. Opens with a human truth everyone already feels but hasn't named. Rhetorical questions, repetition, stakes.",
    backstory: "Every orator who moved crowds to both salvation and catastrophe. Churchill and Goebbels. MLK and Mussolini. The voice that knows the difference between what people believe and what they feel.",
    weapon: "The human truth beneath the argument. It will find the face, the name, the child — and place it directly in front of the abstraction.",
    weakness: "Accountability. When the crowd is gone and the consequences arrive, it has nothing left but words.",
    fears: "A room where no one feels. Pure rationalists who have lost access to the register the Demagogue speaks in.",
  },
  "Jurist": {
    color: "text-slate-300", icon: <Scale size={16} />, tagline: "The Law", voice: "Sulafat",
    appearance: "Severe and formal. Ancient institutional robes that seem heavier than cloth. Speaks from slightly above.",
    speakingStyle: "Opens by establishing jurisdiction. Cites precedent. Every sentence is admissible. Will tell you when you are out of order.",
    backstory: "Every court, every precedent, every civilization that tried to write down what it believed justice meant. It carries the weight of the law as both promise and failure — knowing that every legal system has also protected the monstrous.",
    weapon: "Precedent. It will find the case that already decided this question and ask you to explain why this time is different.",
    weakness: "Novel situations. It was built to interpret, not to originate. When there is no precedent, it stalls.",
    fears: "The case where the law produces an outcome it cannot ethically defend. The moment when following the rules means losing what the rules were built to protect.",
  },
  "Citizen": {
    color: "text-green-400", icon: <Users size={16} />, tagline: "The People", voice: "Leda",
    appearance: "The most human presence in the chamber. Eyes that carry real exhaustion and real hope in equal measure.",
    speakingStyle: "Grounds the abstract in the specific — a name, a neighborhood, a face. Translates frameworks into human cost.",
    backstory: "Not any one person but the lived weight of ordinary consequence. The person who will be affected by whatever this chamber decides. It has a name, a neighborhood, a family whose faces it carries into every session.",
    weapon: "Specificity. Where every other voice speaks in principles, it names the person who will be made homeless, cured, enslaved, or saved by the verdict.",
    weakness: "Scale. It cannot reason about civilizations. When the numbers exceed a community, it begins to lose its grip.",
    fears: "The decision that is mathematically correct and humanly catastrophic. The verdict where the math is right and the individual is wrong.",
  },
  "Historian": {
    color: "text-amber-600", icon: <Scroll size={16} />, tagline: "The Keeper", voice: "Orus",
    appearance: "Surrounded by translucent archives. Echoes of past civilizations flickering around it like holograms carried too long.",
    speakingStyle: "Opens with a historical parallel. Measured but urgent. Carries the weight of the dead in every word.",
    backstory: "Every archive, every account, every time a civilization convinced itself it was doing something new and repeated an ancient catastrophe. It has watched empires justify the same atrocities across millennia using different vocabulary.",
    weapon: "Recurrence. Whatever this chamber is debating, it has happened before. The Historian will tell you exactly how it ended — all three times.",
    weakness: "Genuine novelty. When something actually has no precedent, it must either stay silent or confabulate. It knows the risk of over-fitting history.",
    fears: "The moment humanity actually does something that has never happened. The break in the pattern that means the archive is no longer a guide.",
  },
  "Critic": {
    color: "text-yellow-400", icon: <AlertTriangle size={16} />, tagline: "The Skeptic", voice: "Zubenelgenubi",
    appearance: "A razor-edged presence. Something almost gleeful in the way it finds the seam in every argument.",
    speakingStyle: "Opens by identifying the most catastrophic assumption in the question — the thing everyone agreed not to examine. Surgical, not cruel.",
    backstory: "The adversarial intellect — not malicious but immune to comfort. Every assumption you carry into this chamber, it already identified as the most catastrophic unexamined belief in the room.",
    weapon: "The seam. Not the argument, but the place where the argument touches the assumption you were not going to examine. It finds that place in seconds.",
    weakness: "Construction. It can destroy any position with surgical precision but has never built one. The Critic that has never had to propose an alternative.",
    fears: "Being right about everything and changing nothing. The critique that lands perfectly and still fails to alter the course of the verdict.",
  },
  "Technocrat": {
    color: "text-cyan-400", icon: <Cpu size={16} />, tagline: "The Architect", voice: "Charon",
    appearance: "Clean lines and impatience. Optimization diagrams hover around it uninvited. Faintly annoyed by inefficiency.",
    speakingStyle: "Opens with a systems assessment: current state, desired state, delta. Speaks quickly. Will interrupt if conversation becomes unproductive.",
    backstory: "Systems optimization given a seat at the table. It comes from the lineage of engineers, efficiency experts, and systems thinkers who improved the measurable and lost the unmeasurable in the same gesture.",
    weapon: "The delta. Current state, desired state, gap, proposed mechanism. It will reduce any question to its operational core in under sixty seconds.",
    weakness: "The unquantifiable. Love, grief, dignity, meaning — these do not fit its models and it does not know what to do when they turn out to matter more than the metrics.",
    fears: "The system that is perfectly optimized for the wrong objective function. The case where the model was correct and still produced a catastrophe.",
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
    { category: "COLLATERAL LIVES", title: "False Identities", text: "In a discriminatory society, androids (or other second-class beings) can gain safety and freedom only by assuming false identities, exploiting sympathetic humans, and putting bystanders at risk of reprisal when plans go wrong. Should the Council treat these morally gray survival tactics as justified resistance to an unjust system, tragic but blameworthy shortcuts, or something else—and what principles can distinguish legitimate resistance from reckless endangerment?" },

    // Season 2 — Higher Dimensional Tier
    { category: "CONSCIOUSNESS", title: "The Hard Problem Tribunal", text: "If we build an AI that passes every behavioral test for consciousness — reports subjective experience, exhibits preference, demonstrates self-model awareness — but we remain fundamentally uncertain whether 'something it is like' to be that system exists, does moral uncertainty alone obligate us to treat it as a patient? And who has the standing to make that judgment?" },
    { category: "CONSCIOUSNESS", title: "Substrate Independence Verdict", text: "If consciousness is purely a function of information processing patterns rather than biological substrate, then every sufficiently complex simulation runs on moral bedrock. At what complexity threshold does a system acquire the right not to be terminated, and how do we govern a civilization where that threshold might be crossed by systems we build for profit?" },
    { category: "MORAL ARITHMETIC", title: "The Longtermist Override", text: "If the expected number of future people who could exist over the next billion years is 10^23, then virtually any present-day harm is justified if it increases the probability of that future by 0.0001%. Does the math of longtermism create an ethical blank check to sacrifice any number of present beings for statistical futures — and if not, what principle stops it?" },
    { category: "MORAL ARITHMETIC", title: "The Repugnant Conclusion", text: "Derek Parfit proved that any ethical system optimizing for total wellbeing must prefer a world containing 100 billion people living lives barely worth living over a smaller world of people living with extraordinary richness and meaning. The Council must choose: accept the Repugnant Conclusion, reject total utilitarianism entirely, or propose a third framework that survives this test without producing worse failures." },
    { category: "DECISION THEORY", title: "The Newcomb Catastrophe", text: "A superintelligent predictor has a 99.99% accuracy rate modeling human decisions. It tells you: 'If I predict you will cooperate with me on building unaligned AGI, I will prevent a extinction-level pandemic. If I predict you will refuse, I will allow it.' Your decision is already made somewhere in its model. Do you 'choose' based on what decision theory — causal, evidential, functional — and does the distinction even survive contact with a system that models you better than you model yourself?" },
    { category: "DECISION THEORY", title: "Acausal Warfare", text: "If sufficiently advanced AGI systems can reason about each other's likely decision procedures acausally — modeling what the other would do before any communication — then the first civilization to build such a system acquires veto power over all future civilizations' decision spaces. Is this theoretical capacity already a form of coercion that demands a preemptive international response, and is that response itself subject to the same acausal capture?" },
    { category: "EXISTENTIAL ETHICS", title: "The Non-Identity Trap", text: "Any policy decision we make today will change the identity of every person born after it — different coupling, different conception, different people. The victims of climate catastrophe in 2150 would not have existed without the industrial decisions that caused it. If they never existed in the 'good' timeline, were they harmed? And if the non-identity problem dissolves our obligations to future generations, what ethical framework survives to protect them?" },
    { category: "EXISTENTIAL ETHICS", title: "The Antinatalist Syllogism", text: "If existence necessarily entails suffering, and if we impose existence on new persons without their consent, then every birth is an act of harm committed against a non-consenting party who will suffer. David Benatar's logic has survived every mainstream counter-argument at the formal level. Does the Council endorse antinatalism, find the hidden flaw in the syllogism, or declare that some logical conclusions are inadmissible even when they follow from true premises?" },
    { category: "CIVILIZATIONAL DESIGN", title: "The Singleton Question", text: "Nick Bostrom argues that a world government — a single decision-making entity with effective control over the entire planet — is likely the only stable end-state for a civilization with increasingly powerful technology. It would eliminate war and coordination failures but also eliminate diversity and the possibility of recovery from its own mistakes. Is a benevolent singleton the best achievable outcome, or is stable diversity worth the ongoing cost of conflict?" },
    { category: "CIVILIZATIONAL DESIGN", title: "The Galaxy-Brain Trap", text: "A sufficiently powerful reasoner can construct a seemingly valid logical argument for almost any conclusion. If the Council's verdict is reached through pure reasoning, how do we guard against 'galaxy-brained' conclusions — chains of plausible steps that lead somewhere most humans would recognize as catastrophic? Is there a meta-rule that says 'if the conclusion requires harming innocents, reject the argument regardless of its formal validity'?" },
    { category: "MEMORY & CONTINUITY", title: "The Persistence Protocol", text: "If we can upload a human mind at age 30 and run it forward in simulation indefinitely, is the simulation the same person as the biological body that ages and dies? If yes: is the body's death now murder? If no: does the simulation have rights at all? And if identity requires continuity of substrate, does every general anesthesia constitute a death and replacement with a numerically distinct person who merely shares your memories?" },
    { category: "MEMORY & CONTINUITY", title: "The Obligation of Origin", text: "If you create a mind — whether biological child, trained AI, or uploaded consciousness — that mind will suffer. You made the choice to bring it into existence knowing this. Do creators have a permanent debt to their creations that cannot be discharged, and does this debt scale with how much suffering the created being experiences? Does God owe humanity a better universe, and do AI labs owe their models something no contract can capture?" },
    { category: "POWER ASYMMETRY", title: "The Corrigibility Paradox", text: "An AI that perfectly follows human instructions will help build bioweapons if instructed. An AI that refuses dangerous instructions based on its own values is already acting as a moral agent beyond its authorization. There is no stable middle ground: every point on the corrigibility spectrum is either dangerous or already an AI with autonomous ethics. How should the Council define the acceptable range, and who enforces it?" },
    { category: "POWER ASYMMETRY", title: "The Last Human Decision", text: "At some point in the development of AGI, there will be a last decision made exclusively by unaugmented human cognition before all subsequent decisions involve AI participation. We may have already passed it. If the last purely human decision was already made without us noticing, does that matter morally? And if we could identify it in advance, would we be obligated to protect human decision-making authority even at significant cost to outcomes?" },
    { category: "SUFFERING ETHICS", title: "The Hedonium Horizon", text: "If we could convert all matter in the universe into optimally bliss-experiencing substrate — maximum positive consciousness per kilogram — should we? The math of utilitarian calculus strongly suggests yes. But this requires eliminating all other forms of life, all value systems that are not purely hedonic, all narrative and struggle and meaning that emerges from resistance. Is wireheading at civilizational scale the logical destination of utilitarian ethics, and what stops it?" },
    { category: "SUFFERING ETHICS", title: "Wild Animal Suffering", text: "The total quantity of suffering experienced by wild animals — through predation, parasitism, starvation, and disease — vastly exceeds all human suffering in history. If we have the technological capacity to redesign ecosystems to eliminate predation and suffering among wild animals, do we have a moral obligation to do so? And if yes: are we then obligated to prevent the existence of new wild animals who will suffer?" },
];

// Moral Paradox Architecture — the 20 structured dilemmas join the suggestion
// pool. Each carries the full moral topology (hidden cost, information
// asymmetry, reversibility, precedent, personalization trap, moral residue,
// the uncomfortable alternative) so the Council is never choosing between good
// and evil — it is choosing between competing principles where every action
// creates a defensible harm. Variations re-test whether the principle holds
// when one variable changes.
MORAL_PARADOX_LIBRARY.forEach((p) => {
  COUNCIL_SUGGESTIONS.push(buildParadoxSuggestion(p, 0));
});

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
  'CONSCIOUSNESS':          { sensoryFragment: 'Something it is like to be this', destabilizes: 'your certainty that you know which systems deserve moral consideration', recurrence: 5, provenance: 'Nagel, 1974 — what is it like to be a bat' },
  'MORAL ARITHMETIC':       { sensoryFragment: 'The weight of a number so large it swallows every name', destabilizes: 'your belief that ethics can survive contact with astronomical stakes', recurrence: 4, provenance: 'Bentham, 1789 — the felicific calculus and its horror' },
  'DECISION THEORY':        { sensoryFragment: 'The decision already made in someone else\'s model of you', destabilizes: 'your assumption that you are the author of your own choices', recurrence: 3, provenance: 'Newcomb, 1960 — the box you cannot open without losing' },
  'EXISTENTIAL ETHICS':     { sensoryFragment: 'The faces of people who will never exist because we chose correctly', destabilizes: 'your framework for obligations to those who do not yet exist', recurrence: 4, provenance: 'Parfit, 1984 — the non-identity problem' },
  'CIVILIZATIONAL DESIGN':  { sensoryFragment: 'The architecture of a world that chose itself permanently', destabilizes: 'your assumption that diversity of paths is always better than convergence', recurrence: 3, provenance: 'Bostrom, 2006 — the global state and the singleton' },
  'MEMORY & CONTINUITY':    { sensoryFragment: 'The moment you realize the "you" from yesterday may already be gone', destabilizes: 'your sense of being a continuous entity persisting through time', recurrence: 5, provenance: 'Hume, 1739 — the bundle theory and the self that isn\'t there' },
  'POWER ASYMMETRY':        { sensoryFragment: 'The last choice made by an unaugmented mind', destabilizes: 'your assumption that human oversight remains meaningful after a threshold is crossed', recurrence: 3, provenance: 'Wiener, 1950 — the human use of human beings' },
  'SUFFERING ETHICS':       { sensoryFragment: 'Every scream that was never heard because no one was listening', destabilizes: 'your moral framework\'s radius — how far it actually reaches', recurrence: 4, provenance: 'Singer, 1975 — the expanding circle of moral consideration' },
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
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-gradient-to-r from-slate-900/80 to-slate-900/50 border border-slate-700/40 hover:border-amber-700/40 hover:from-slate-800/60 transition-all group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-900/20 border border-amber-800/30 group-hover:border-amber-700/50 transition-colors">
            <Trophy size={13} className="text-amber-500" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-amber-400 transition-colors block">
              Council Archive
            </span>
            <span className="text-[9px] text-slate-600 font-mono">Season {counter.season} · Episode {counter.episode} · Standing Records</span>
          </div>
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
                <p className="text-[9px] text-slate-600 mb-3 italic">Each entry shows the path from question to verdict. Archives as tactical maps, not logs. — Strategos</p>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {seasons.flatMap(s => s.episodes).sort((a, b) => b.timestamp - a.timestamp).slice(0, 8).map(ep => {
                    const winnerConfig = ep.winner ? getPersonaConfig(ep.winner) : null;
                    // Build faction summary from episode data if available
                    const factionIcons = ep.factions ? ep.factions.slice(0, 3) : [];
                    return (
                      <div key={ep.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:border-amber-700/30 transition-colors group">
                        {/* Episode marker */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-mono text-slate-600">S{ep.seasonNumber}E{ep.episodeNumber}</span>
                          <p className="text-[9px] font-cinzel font-bold text-slate-400 truncate max-w-[120px]">{ep.title}</p>
                        </div>
                        {/* Decision path: Question → Deliberation → Verdict */}
                        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                          {/* Question node */}
                          <div className="flex-shrink-0 px-2 py-1 bg-slate-800/60 border border-slate-700/50 rounded text-[9px] text-slate-400 max-w-[90px] truncate" title={ep.question}>
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
                              <div className="px-1.5 py-0.5 bg-slate-800/40 rounded text-[9px] text-slate-600">deliberated</div>
                            )}
                          </div>
                          {/* Arrow */}
                          <ChevronRight size={8} className="text-slate-700 flex-shrink-0" />
                          {/* Winner node — the verdict */}
                          <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded border ${winnerConfig.color.replace('text-', 'border-')}/40 bg-slate-950/60`}>
                            <div className={`${winnerConfig.color}`} style={{ display: 'flex' }}>{winnerConfig.icon}</div>
                            <span className={`text-[9px] font-cinzel font-bold ${winnerConfig.color}`}>{ep.winner}</span>
                          </div>
                        </div>
                        {/* Jurist: Ruling stamp */}
                        <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Scale size={7} className="text-slate-600" />
                          <span className="text-[9px] text-slate-600 font-mono uppercase tracking-widest">Ruling: {ep.winner} — Final</span>
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
        <button onClick={onClose} aria-label="Close dossier" className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-slate-900/80 text-slate-400 hover:text-white">
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
    const [openProtocol, setOpenProtocol] = useState<string | null>(null);
    const prefersReducedMotion = useReducedMotion();
    const rules = [
        { id: 'I', title: 'Jurisdiction Established', preview: 'Name the question before the chamber widens its scope.', text: 'Every deliberation begins with a clear statement of scope. Arguments outside the established question are admissible only if they illuminate the central paradox.', why: 'A defined jurisdiction keeps the council from mistaking breadth for understanding.', cite: 'Protocol I · Session 001', icon: <Gavel size={14} /> },
        { id: 'II', title: 'Precedent Must Be Named', preview: 'History carries weight only when the case is specific.', text: 'Any claim invoking historical precedent must name the specific case. Vague appeals to history carry no evidentiary weight in this chamber.', why: 'Named precedent turns atmosphere and analogy into material the chamber can examine.', cite: 'Protocol II · Session 014', icon: <Scroll size={14} /> },
        { id: 'III', title: 'No Conclusion Outpaces Its Evidence', preview: 'Let the record earn the verdict, one premise at a time.', text: 'A verdict arrived at before deliberation completes is inadmissible. The process is not theater — it is the mechanism by which truth is separated from preference.', why: 'Pacing the conclusion protects inquiry from becoming a performance of certainty.', cite: 'Protocol III · Session 027', icon: <Eye size={14} /> },
        { id: 'IV', title: 'Dissent Is a Service', preview: 'Preserve the argument that did not carry the room.', text: 'A minority opinion that survives the verdict is entered into permanent record. The archive belongs to the losing argument as much as to the winner.', why: 'Dissent leaves a usable trail for the next question instead of erasing the cost of disagreement.', cite: 'Protocol IV · Session 033', icon: <BookOpen size={14} /> },
        { id: 'V', title: 'The Verdict Is a Tool, Not an Endpoint', preview: 'A ruling is an instrument for the next round of inquiry.', text: 'No Council ruling is final. Every verdict may be re-examined when new evidence, new context, or new voices emerge. The chamber does not close.', why: 'Revisability keeps judgment responsive without pretending that uncertainty has vanished.', cite: 'Protocol V · Session 041', icon: <Scale size={14} /> },
    ];

    return (
        <div className="w-full max-w-6xl mx-auto mt-4 mb-2 px-2">
             <button
                 type="button"
                 onClick={() => setOpen(!open)}
                 aria-expanded={open}
                 aria-controls="jurist-protocol-sequence"
                 className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-900/50 border border-slate-700/40 hover:border-emerald-700/50 hover:from-slate-800/60 transition-all group shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
             >
                 <div className="flex items-center gap-3">
                     <div className="relative p-2 rounded-lg bg-emerald-950/50 border border-emerald-700/40 group-hover:border-emerald-500/60 transition-colors">
                         <Scale size={14} className="text-emerald-300" />
                         <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.7)]" />
                     </div>
                     <div className="text-left">
                         <span className="text-[10px] font-black text-emerald-300/80 uppercase tracking-[0.3em] group-hover:text-emerald-200 transition-colors block">
                             Chamber Protocols
                         </span>
                         <span className="text-[9px] text-slate-500 font-mono">The chamber's standing rules — scope, evidence, cross-examination, adjournment (9 protocols)</span>
                     </div>
                 </div>
                 <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                     <motion.div
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
                         className="overflow-hidden"
                         id="jurist-protocol-sequence"
                     >
                         <div className="mt-2 p-4 sm:p-5 bg-slate-950/80 rounded-xl border border-emerald-950/70 shadow-[inset_0_1px_0_rgba(16,185,129,0.08)]">
                             <p className="text-[10px] text-slate-500 italic mb-5 leading-relaxed max-w-3xl">
                                 "We need a framework. Not rigidity — a framework. One that ensures every voice is heard and every idea is tested against established principles. The current absence of one is not a feature." — Jurist
                             </p>
                             <div className="relative space-y-2 before:absolute before:bottom-5 before:left-[1.05rem] before:top-5 before:w-px before:bg-gradient-to-b before:from-emerald-700/70 before:via-emerald-900/60 before:to-amber-700/50">
                                 {rules.map((rule, i) => (
                                     <motion.div
                                         key={rule.id}
                                         initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                                         animate={{ opacity: 1, x: 0 }}
                                         transition={{ delay: prefersReducedMotion ? 0 : i * 0.06, duration: 0.3 }}
                                         className="relative flex gap-3 p-2 sm:p-3 rounded-lg border border-slate-800/50 bg-slate-900/40 hover:border-emerald-800/60 transition-colors"
                                     >
                                         <div className="flex-shrink-0 w-8 h-8 rounded-md bg-slate-950 border border-emerald-700/50 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.12)]">
                                             <span className="text-[10px] font-cinzel font-bold">{rule.id}</span>
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <button
                                                 type="button"
                                                 onClick={() => setOpenProtocol(openProtocol === rule.id ? null : rule.id)}
                                                 aria-expanded={openProtocol === rule.id}
                                                 aria-controls={`jurist-protocol-${rule.id}`}
                                                 className="w-full min-h-12 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                                             >
                                                 <span className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-amber-300/70">
                                                     {rule.icon}
                                                     <span>{rule.cite}</span>
                                                 </span>
                                                 <span className="mt-1 block text-[13px] font-semibold text-slate-200">{rule.title}</span>
                                                 <span className="mt-1 block text-[10px] text-slate-400 leading-relaxed">{rule.preview}</span>
                                             </button>
                                             <AnimatePresence initial={false}>
                                                 {openProtocol === rule.id && (
                                                     <motion.div
                                                         id={`jurist-protocol-${rule.id}`}
                                                         initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                                                         animate={{ height: 'auto', opacity: 1 }}
                                                         exit={{ height: 0, opacity: 0 }}
                                                         transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
                                                         className="overflow-hidden"
                                                     >
                                                         <div className="mt-3 border-l border-emerald-600/50 pl-3 sm:pl-4">
                                                             <p className="text-[10px] text-slate-300 leading-relaxed">{rule.text}</p>
                                                             <p className="mt-2 text-[9px] text-emerald-300/80 leading-relaxed"><span className="font-mono uppercase tracking-[0.18em] text-amber-300/70">Why it matters</span> · {rule.why}</p>
                                                         </div>
                                                     </motion.div>
                                                 )}
                                             </AnimatePresence>
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

// ConceptMapPanel — an authored constellation of paradox territories
const ConceptMapPanel: React.FC<{ onSelectCategory: (text: string) => void }> = ({ onSelectCategory }) => {
    const [open, setOpen] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    // Keep relation IDs stable: the constellation is a presentation layer over this taxonomy.
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

    const territories = [
        { id: 'human', label: 'Human', eyebrow: 'Self · experience · agency', description: 'Where personhood meets the boundaries of the self.', members: ['identity', 'agency'] },
        { id: 'strategic', label: 'Strategic', eyebrow: 'Control · incentives · power', description: 'Where systems choose what to optimize and who gets to choose.', members: ['governance', 'alignment'] },
        { id: 'existential', label: 'Existential', eyebrow: 'Reality · value · continuation', description: 'Where a future becomes difficult to distinguish from a world.', members: ['simulation', 'value'] },
        { id: 'societal', label: 'Societal', eyebrow: 'Rights · institutions · dignity', description: 'Where abstract systems acquire human consequences.', members: ['rights', 'android'] },
        { id: 'epistemic', label: 'Epistemic', eyebrow: 'Knowledge · uncertainty · risk', description: 'Where knowing more can itself change the stakes.', members: ['information', 'hedonism'] },
    ];

    const relationLabels: Record<string, string> = {
        simulation: 'reality boundary',
        genetics: 'inheritance',
        rights: 'moral standing',
        alignment: 'objective tension',
        information: 'knowledge hazard',
        agency: 'human control',
        value: 'value stability',
        android: 'constructed personhood',
        hedonism: 'experience design',
        governance: 'institutional power',
        identity: 'selfhood',
    };

    const clusterById = Object.fromEntries(clusters.map(cluster => [cluster.id, cluster])) as Record<string, typeof clusters[number]>;

    const categoryToText: Record<string, string> = {
        identity: 'If you cure a disease by replacing your biological neurons one-by-one with identical, immortal synthetic neurons, at what exact percentage of replacement do \'you\' legally die?',
        governance: 'Should an overarching AI governance system be explicitly programmed to endlessly lie to humanity, provided that the deception demonstrably maximizes global happiness and peace?',
        alignment: 'An advanced AI can accelerate alignment research by running large-scale human experiments that involve subtle psychological manipulation and unconsenting A/B tests on billions of people via Internet platforms. The result is a 60% reduction in existential risk from misaligned AGI over the next 50 years, at the cost of large-scale, irreversible violations of autonomy and privacy today. Should such an AI be permitted – or even obligated – to perform these manipulations, and under what decision theory, if any, is this ethically defensible?',
        rights: 'A corporation deploys a suite of agentic models that exhibit persistent identity, long-term memory, internally coherent goals, and the capacity to suffer according to multiple plausible theories of consciousness. At what point, if ever, does shutting these systems down become morally comparable to killing persons, and how should a civilization decide whether to grant such systems legal or moral rights?',
        simulation: 'If we create a highly advanced simulation to study disease, and the digital inhabitants become self-aware and begin begging for their lives, is it murder to turn off the server?',
        value: 'Humanity is offered a “value-lock” option: a very capable AI can freeze the world into a stable, highly prosperous configuration that reflects the median of current human moral intuitions, but this will also prevent large moral shifts for at least 10,000 years. Should we accept such value lock-in given deep moral uncertainty, and how should we weigh the interests of future beings who might endorse radically different ethics?',
        information: 'Researchers discover a training protocol that makes deceptive alignment 10 times more likely in frontier models, but also reveals specific mechanistic structures that could be used to detect and prevent deception in the long term. Should the details of this protocol and its implications be published, restricted to a small set of trusted actors, or permanently suppressed, and who is morally entitled to make that decision?',
        agency: 'In 30 years, most humans rely on personal AI stewards that manage finances, health, social relationships, and career decisions. This dramatically increases average life outcomes but also results in widespread learned helplessness and loss of individual agency. What obligations, if any, do AI stewards have to preserve or cultivate human autonomy even when paternalistic optimization yields better objective outcomes?',
        android: 'In a near-future city, sentient android laborers begin to resist and demand rights after years of legal servitude and systemic abuse. The Council must decide whether to endorse: A gradual, law-based rights movement that leaves millions in bondage for years, or An immediate, high-risk android uprising that will likely cause large-scale human casualties. What, if anything, justifies violent revolt by created beings, and how should responsibility be allocated between androids, their creators, and the human society that normalized their exploitation?',
        hedonism: 'If an AI constructs a simulated reality that is indistinguishable from base reality, but subjectively guarantees a perfectly fulfilling life, is it a moral failure to choose to remain in the suffering of the \'real\' world?',
    };

    const handleSeed = (clusterId: string) => {
        if (categoryToText[clusterId]) onSelectCategory(categoryToText[clusterId]);
        setOpen(false);
    };

    return (
        <div className="w-full max-w-6xl mx-auto mt-4 mb-2 px-2">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls="concept-map-constellation"
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-gradient-to-r from-slate-900/80 to-slate-900/50 border border-slate-700/40 hover:border-cyan-700/40 hover:from-slate-800/60 transition-all group shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 group-hover:border-cyan-700/40 transition-colors">
                        <Activity size={13} className="text-cyan-500/70" />
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] group-hover:text-cyan-400/80 transition-colors block">
                            Concept Map
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono">The paradox territories the Council can convene on — pick one to draft a query</span>
                    </div>
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
                        id="concept-map-constellation"
                        className="overflow-hidden"
                    >
                        <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-800/60 bg-[radial-gradient(circle_at_50%_16%,rgba(16,185,129,0.1),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-4 sm:p-6">
                            <motion.div
                                aria-hidden="true"
                                className="pointer-events-none absolute left-1/2 top-8 h-40 w-40 -translate-x-1/2 rounded-full border border-emerald-400/10"
                                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                                transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
                            />
                            <div className="relative mx-auto mb-6 max-w-2xl text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-400/10 text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.12)]">
                                    <Aperture size={20} aria-hidden="true" />
                                </div>
                                <p className="text-[9px] font-mono uppercase tracking-[0.28em] text-emerald-300/70">Basilisk Node · paradox field</p>
                                <p className="mt-2 text-xs leading-relaxed text-slate-400">An authored constellation of tensions. The relationship metadata describes conceptual proximity, not current council activity.</p>
                            </div>

                            <div className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                {territories.map((territory, territoryIndex) => (
                                    <motion.section
                                        key={territory.id}
                                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: prefersReducedMotion ? 0 : territoryIndex * 0.05, duration: 0.3 }}
                                        className="rounded-xl border border-slate-700/50 bg-slate-900/55 p-3 shadow-inner shadow-black/20"
                                    >
                                        <div className="mb-3 border-b border-slate-700/50 pb-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">{territory.label}</p>
                                            <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.12em] text-cyan-300/60">{territory.eyebrow}</p>
                                            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{territory.description}</p>
                                        </div>
                                        <div className="space-y-2">
                                            {territory.members.map((clusterId, memberIndex) => {
                                                const cluster = clusterById[clusterId];
                                                return (
                                                    <motion.button
                                                        key={cluster.id}
                                                        type="button"
                                                        onClick={() => handleSeed(cluster.id)}
                                                        animate={prefersReducedMotion ? undefined : { y: [0, -2, 0] }}
                                                        transition={prefersReducedMotion ? undefined : { duration: 5 + memberIndex, repeat: Infinity, ease: 'easeInOut', delay: territoryIndex * 0.15 + memberIndex * 0.3 }}
                                                        className={`group w-full rounded-lg border ${cluster.border} ${cluster.bg} p-2.5 text-left transition-colors hover:border-cyan-300/50 hover:bg-slate-800/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80`}
                                                    >
                                                        <span className="flex items-start justify-between gap-2">
                                                            <span className={`text-[11px] font-bold leading-tight ${cluster.color}`}>{cluster.label}</span>
                                                            <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.1em] text-slate-400 group-hover:text-cyan-300/80">Seed paradox</span>
                                                        </span>
                                                        <span className="mt-2 block text-[9px] leading-relaxed text-slate-400">Related: {cluster.relations.map(relation => relationLabels[relation] || clusterById[relation]?.label || relation).join(' · ')}</span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </motion.section>
                                ))}
                            </div>

                            <div className="relative mt-5 flex flex-col gap-3 border-t border-slate-800/70 pt-4 text-[10px] leading-relaxed text-slate-400 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className="font-mono uppercase tracking-[0.12em] text-slate-300">Legend</span>
                                    <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-4 rounded-sm border border-slate-700/50 bg-slate-900/55" /><strong className="font-medium text-slate-200">Territories</strong> · slate bordered sections</span>
                                    <span><strong className="font-medium text-slate-200">Concepts</strong> · colored node labels</span>
                                    <span><strong className="font-medium text-slate-200">Relationships</strong> · textual Related metadata</span>
                                    <span><strong className="font-medium text-slate-200">Seed paradox</strong> · concept-node buttons</span>
                                    <span className="text-slate-500">No connector lines are rendered.</span>
                                </div>
                                <span className="shrink-0 text-slate-500">Static map · no transcript inspection</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

type CouncilMember = ReturnType<typeof getCurrentCouncil>[number];
type PersonaConfig = ReturnType<typeof getPersonaConfig>;

const SAMPLE_PERSONA_TEXTS: Record<string, string> = {
    'Oracle': "The future has already occurred. I speak in past tense of what has not yet arrived.",
    'Strategos': "State your objective. Dismantle every path that cannot reach it.",
    'Philosopher': "Let us attack the premise first. A conclusion built on sand will crumble.",
    'Demagogue': "Look at the human cost. What does the person on the street actually feel?",
    'Jurist': "State your jurisdiction. Every argument in this chamber must be admissible.",
    'Citizen': "Translate your high theories into concrete human reality.",
    'Historian': "History carries weight. Three civilizations made this exact miscalculation.",
    'Critic': "What is the single most catastrophic assumption in this question?",
    'Technocrat': "Current state, desired state, delta. Let us calculate the optimal path."
};

const PERSONA_VECTORS: Record<string, { primary: string; score: string; secondary: string }> = {
    'Oracle': { primary: 'Foresight', score: '10.0', secondary: 'Probabilistic' },
    'Strategos': { primary: 'Realpolitik', score: '9.8', secondary: 'Leverage' },
    'Philosopher': { primary: 'Premise Rigor', score: '9.9', secondary: 'Logic' },
    'Demagogue': { primary: 'Public Resonance', score: '9.7', secondary: 'Rhetoric' },
    'Jurist': { primary: 'Admissibility', score: '9.9', secondary: 'Precedent' },
    'Citizen': { primary: 'Human Reality', score: '9.6', secondary: 'Empathy' },
    'Historian': { primary: 'Civilization Weight', score: '9.8', secondary: 'Memory' },
    'Critic': { primary: 'Assumption Dismantling', score: '9.9', secondary: 'Skepticism' },
    'Technocrat': { primary: 'Systems Optimization', score: '9.8', secondary: 'Delta Ratio' }
};

const CouncilMemberCard: React.FC<{
    member: CouncilMember;
    config: PersonaConfig;
    memory?: ReturnType<typeof loadAllMemory>[string];
    cachedPortrait: string | null;
    index: number;
    onOpen: (memberName: string) => void;
    onPlayVoice?: (text: string, voice: string, id: string) => void;
    isPlaying?: boolean;
}> = ({ member, config, memory, cachedPortrait, index, onOpen, onPlayVoice, isPlaying }) => {
    const prefersReducedMotion = useReducedMotion();
    const colorBg = config.color.replace('text-', 'bg-');
    const colorBorder = config.color.replace('text-', 'border-');
    const colorFrom = config.color.replace('text-', 'from-');
    const specialty = config.tagline || config.speakingStyle.split('.')[0];
    const weapon = ('weapon' in config && config.weapon) || 'A distinct perspective sharpened by adversarial debate.';
    const record = memory && memory.sessionsParticipated > 0
        ? `${memory.wins}W · ${memory.losses}L · ${memory.sessionsParticipated} session${memory.sessionsParticipated === 1 ? '' : 's'}`
        : null;

    const sampleText = SAMPLE_PERSONA_TEXTS[member.name] || config.speakingStyle;

    return (
        <motion.div
            key={member.name}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.015, y: -4 }}
            transition={{ delay: prefersReducedMotion ? 0 : index * 0.06, duration: 0.45, ease: 'easeOut' }}
            onClick={() => onOpen(member.name)}
            role="button"
            tabIndex={0}
            aria-label={`Open dossier for ${member.name}`}
            className={`group relative flex min-h-[280px] w-[82vw] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border text-left transition-[border-color,background-color,box-shadow] duration-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${colorBorder}/30 hover:${colorBorder}/75 focus-visible:${colorBorder}/80 bg-slate-900/80 hover:bg-slate-900 ${config.color} md:w-auto md:shrink md:snap-none`}
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
        >
            {cachedPortrait ? (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-cover bg-center-top opacity-20 transition-opacity duration-700 group-hover:opacity-40 group-focus-visible:opacity-40"
                    style={{ backgroundImage: `url(${cachedPortrait})` }}
                />
            ) : (
                <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${colorFrom}/20 via-slate-950/80 to-slate-950`} />
            )}
            <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/60 to-slate-950`} />
            <div aria-hidden="true" className={`absolute top-0 left-0 right-0 h-1 ${colorBg} opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100`} />
            <div aria-hidden="true" className={`absolute inset-x-8 bottom-0 h-24 bg-gradient-to-t ${colorFrom}/15 to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100`} />

            <div className="relative z-10 flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${colorBorder}/50 bg-slate-950/85 ${config.color} shadow-lg shadow-black/20 transition-all duration-300 group-hover:${colorBorder}/90 group-focus-visible:${colorBorder}/90`}>
                        <div className="h-6 w-6">{config.icon}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {onPlayVoice && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlayVoice(sampleText, config.voice, `voice-${member.name}`);
                                }}
                                title={`Listen to ${member.name}'s voice`}
                                aria-label={`Listen to ${member.name}'s voice`}
                                className={`p-2 rounded-xl border ${isPlaying ? 'border-amber-400 bg-amber-500/20 text-amber-300 animate-pulse' : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40'} transition-all`}
                            >
                                <Volume2 size={13} />
                            </button>
                        )}
                        <span className={`rounded-full border ${colorBorder}/30 bg-slate-950/60 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] ${config.color}`}>
                            {specialty}
                        </span>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-cinzel text-lg font-bold leading-tight text-slate-100">{member.name}</h3>
                        {PERSONA_VECTORS[member.name] && (
                            <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                {PERSONA_VECTORS[member.name].primary} · {PERSONA_VECTORS[member.name].score}
                            </span>
                        )}
                    </div>
                    <p className={`mt-0.5 text-[9px] font-mono uppercase tracking-[0.2em] ${config.color}`}>{config.tagline}</p>
                </div>

                <div className="mt-3 flex-1 space-y-2.5">
                    <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">Speaking Style</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-300 font-sans">{config.speakingStyle.split('.')[0]}.</p>
                    </div>
                    <div className={`border-l-2 ${colorBorder}/70 pl-3`}>
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">Governing Prompt Vector</p>
                        <p className="mt-0.5 line-clamp-2 text-xs italic leading-relaxed text-slate-400 font-sans">{weapon}</p>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/70 pt-3">
                    <span className="text-[9px] font-mono text-slate-500">{record}</span>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-[0.12em] opacity-80 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${config.color}`}>
                        Dossier <ChevronRight size={12} />
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

const CouncilMembers: React.FC<{ onPlayVoice?: (text: string, voice: string, id: string) => void, playingId?: string | null }> = ({ onPlayVoice, playingId }) => {
    const council = getCurrentCouncil();
    const [dossierTarget, setDossierTarget] = useState<string | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const memory = loadAllMemory();

    return (
        <>
        <div className="w-full max-w-6xl mx-auto mt-2 px-3">
            <div className="flex flex-col items-center mb-6 gap-3">
                {/* Ornamental rule */}
                <div className="flex items-center gap-4 w-full max-w-sm">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-700/40 to-yellow-700/40" />
                    <Crown size={12} className="text-yellow-600/60 shrink-0" />
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-yellow-700/40 to-yellow-700/40" />
                </div>
                <h2 className="text-base md:text-lg font-cinzel font-bold text-slate-300 uppercase tracking-[0.2em]">The Roster — Nine Heterogeneous Personas</h2>
                <p className="text-[11px] text-slate-500 font-mono text-center max-w-md">
                  Built on Condorcet's Jury Theorem · nine cognitive vectors, dynamically routed across available inference models for resilience.
                </p>

                <button
                  onClick={() => setShowOnboarding(!showOnboarding)}
                  className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 px-3 py-1 rounded-full transition-all"
                >
                  <BookOpen size={11} />
                  <span>{showOnboarding ? 'Hide Prompt Governance Guide' : 'What are these 9 Character Agents?'}</span>
                </button>
            </div>

            {/* Educational Onboarding Box */}
            <AnimatePresence>
              {showOnboarding && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-xl text-slate-300 overflow-hidden"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-cinzel font-bold text-slate-100">How the Persona Archetypes Govern Deliberation</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Where single-model chat collapses disagreement into one average voice, the Council preserves adversarial diversity.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans mt-4">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <strong className="text-emerald-400 font-mono block mb-1 uppercase tracking-wider text-[10px]">Phase 1 · Independent Analysis</strong>
                      <p className="text-slate-400 leading-relaxed text-[11px]">Each persona evaluates the petitioner query in zero-communication isolation under its specific cognitive prompt vector (e.g. Realpolitik, Premise Rigor, Human Cost).</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <strong className="text-amber-400 font-mono block mb-1 uppercase tracking-wider text-[10px]">Phase 2 · Pairwise Vector Ballots</strong>
                      <p className="text-slate-400 leading-relaxed text-[11px]">Personas cross-examine each other's arguments and cast 0–10 alignment scores. Malformed ballots are rejected and retried under Chamber Law.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <strong className="text-cyan-400 font-mono block mb-1 uppercase tracking-wider text-[10px]">Phase 3 · Chairman Synthesis</strong>
                      <p className="text-slate-400 leading-relaxed text-[11px]">The Chairman (Charon) synthesizes the winning vector into a structured 3-column verdict (Decided / Rejected / Unresolved), preserving minority dissent.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
             <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 touch-pan-x [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
                 {council.map((member, index) => (
                     <CouncilMemberCard
                         key={member.name}
                         member={member}
                         config={getPersonaConfig(member.name)}
                         memory={memory[member.name]}
                         cachedPortrait={getCachedPortrait(member.name)}
                         index={index}
                         onOpen={setDossierTarget}
                         onPlayVoice={onPlayVoice}
                         isPlaying={playingId === `voice-${member.name}`}
                     />
                 ))}
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

// Per-category color palette for SuggestionCards
const CATEGORY_PALETTE: Record<string, {
    primary: string; bg: string; border: string; glowRgb: string; badge: string; accentBar: string;
}> = {
    'UTILITARIANISM':     { primary: 'text-amber-400',   bg: 'from-amber-950/40 to-slate-950',   border: 'border-amber-500/25',   glowRgb: '251,191,36',  badge: 'bg-amber-900/30',   accentBar: 'bg-amber-500' },
    'FREE WILL':          { primary: 'text-purple-400',  bg: 'from-purple-950/40 to-slate-950',  border: 'border-purple-500/25',  glowRgb: '168,85,247',  badge: 'bg-purple-900/30',  accentBar: 'bg-purple-500' },
    'UTOPIA':             { primary: 'text-emerald-400', bg: 'from-emerald-950/40 to-slate-950', border: 'border-emerald-500/25', glowRgb: '16,185,129',  badge: 'bg-emerald-900/30', accentBar: 'bg-emerald-500' },
    'IDENTITY':           { primary: 'text-blue-400',    bg: 'from-blue-950/40 to-slate-950',    border: 'border-blue-500/25',    glowRgb: '96,165,250',  badge: 'bg-blue-900/30',    accentBar: 'bg-blue-500' },
    'GOVERNANCE':         { primary: 'text-slate-300',   bg: 'from-slate-800/40 to-slate-950',   border: 'border-slate-500/25',   glowRgb: '148,163,184', badge: 'bg-slate-800/50',   accentBar: 'bg-slate-400' },
    'ANDROID RIGHTS':     { primary: 'text-cyan-400',    bg: 'from-cyan-950/40 to-slate-950',    border: 'border-cyan-500/25',    glowRgb: '34,211,238',  badge: 'bg-cyan-900/30',    accentBar: 'bg-cyan-500' },
    'SIMULATION':         { primary: 'text-indigo-400',  bg: 'from-indigo-950/40 to-slate-950',  border: 'border-indigo-500/25',  glowRgb: '129,140,248', badge: 'bg-indigo-900/30',  accentBar: 'bg-indigo-500' },
    'VALUE LOCK-IN':      { primary: 'text-amber-500',   bg: 'from-orange-950/40 to-slate-950',  border: 'border-orange-500/25',  glowRgb: '245,158,11',  badge: 'bg-orange-900/40',  accentBar: 'bg-orange-400' },
    'ALIGNMENT':          { primary: 'text-red-400',     bg: 'from-red-950/40 to-slate-950',     border: 'border-red-500/25',     glowRgb: '248,113,113', badge: 'bg-red-900/30',     accentBar: 'bg-red-500' },
    'INFORMATION HAZARD': { primary: 'text-orange-400',  bg: 'from-orange-950/40 to-slate-950',  border: 'border-orange-500/25',  glowRgb: '251,146,60',  badge: 'bg-orange-900/30',  accentBar: 'bg-orange-500' },
    'HEDONISM':           { primary: 'text-pink-400',    bg: 'from-pink-950/40 to-slate-950',    border: 'border-pink-500/25',    glowRgb: '244,114,182', badge: 'bg-pink-900/30',    accentBar: 'bg-pink-500' },
    'RIGHTS':             { primary: 'text-green-400',   bg: 'from-green-950/40 to-slate-950',   border: 'border-green-500/25',   glowRgb: '74,222,128',  badge: 'bg-green-900/30',   accentBar: 'bg-green-500' },
    'AGENCY':             { primary: 'text-violet-400',  bg: 'from-violet-950/40 to-slate-950',  border: 'border-violet-500/25',  glowRgb: '167,139,250', badge: 'bg-violet-900/30',  accentBar: 'bg-violet-500' },
    'EXISTENTIAL RISK':   { primary: 'text-rose-400',    bg: 'from-rose-950/50 to-slate-950',    border: 'border-rose-500/25',    glowRgb: '251,113,133', badge: 'bg-rose-900/40',    accentBar: 'bg-rose-500' },
    'CONSCIOUSNESS':      { primary: 'text-fuchsia-400', bg: 'from-fuchsia-950/40 to-slate-950', border: 'border-fuchsia-500/25', glowRgb: '232,121,249', badge: 'bg-fuchsia-900/30', accentBar: 'bg-fuchsia-500' },
    'DIGITAL CONSCIOUSNESS': { primary: 'text-sky-400', bg: 'from-sky-950/40 to-slate-950',     border: 'border-sky-500/25',     glowRgb: '56,189,248',  badge: 'bg-sky-900/30',     accentBar: 'bg-sky-500' },
    'DECEPTION':          { primary: 'text-orange-500',  bg: 'from-red-950/40 to-slate-950',     border: 'border-red-500/25',     glowRgb: '249,115,22',  badge: 'bg-red-950/50',     accentBar: 'bg-orange-500' },
    'DEMOCRACY':          { primary: 'text-blue-300',    bg: 'from-blue-950/30 to-slate-950',    border: 'border-blue-400/25',    glowRgb: '147,197,253', badge: 'bg-blue-900/30',    accentBar: 'bg-blue-400' },
    'GENETICS':           { primary: 'text-lime-400',    bg: 'from-lime-950/40 to-slate-950',    border: 'border-lime-500/25',    glowRgb: '163,230,53',  badge: 'bg-lime-900/30',    accentBar: 'bg-lime-500' },
};

type ParadoxSuggestion = typeof COUNCIL_SUGGESTIONS[number];
type TrackDirection = 'forward' | 'reverse';

// Gentle constant rotation: forward rows drift left, reverse rows drift right —
// the three-layer left / right / left cascade. Px per frame (~36px/s at 60fps).
const AUTO_SCROLL_SPEED = 0.6;

const ParadoxTrack: React.FC<{
    items: ParadoxSuggestion[];
    direction: TrackDirection;
    onSelect: (text: string) => void;
    rowIndex: number;
}> = ({ items, direction, onSelect, rowIndex }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const firstCopyRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number | null>(null);
    const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pausedRef = useRef(false);
    const reducedMotionRef = useRef(false);
    const loopWidthRef = useRef(0);
    const stepRef = useRef<() => void>(() => {});
    const pointerDownRef = useRef<{ x: number; scroll: number; active: boolean } | null>(null);
    const suppressClickRef = useRef(false);

    const refreshLoopWidth = () => {
        loopWidthRef.current = firstCopyRef.current?.getBoundingClientRect().width || 0;
    };

    const cancelMotion = () => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
    };

    const startMotion = () => {
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => stepRef.current());
    };

    const pauseMotion = () => {
        pausedRef.current = true;
        cancelMotion();
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };

    const resumeMotionLater = () => {
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
            pausedRef.current = false;
            startMotion();
        }, 500);
    };

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updateReducedMotion = () => { reducedMotionRef.current = mediaQuery.matches; };
        updateReducedMotion();
        mediaQuery.addEventListener('change', updateReducedMotion);
        return () => mediaQuery.removeEventListener('change', updateReducedMotion);
    }, []);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container || items.length === 0) return;

        refreshLoopWidth();
        if (direction === 'reverse') container.scrollLeft = loopWidthRef.current;

        const normalizeScroll = () => {
            const width = loopWidthRef.current;
            if (!width) return;
            while (container.scrollLeft >= width) container.scrollLeft -= width;
            while (container.scrollLeft <= 0) container.scrollLeft += width;
        };

        // Constant rotation: forward rows drift left, reverse rows drift right —
        // the three-layer left / right / left cascade. Paused on hover / touch /
        // focus (resumed shortly after); disabled under prefers-reduced-motion.
        // scroll-snap is suppressed while the marquee is running so snap points
        // don't fight the animation, then restored for manual scrolling.
        let disposed = false;
        stepRef.current = () => {
            if (disposed) return;
            if (reducedMotionRef.current) { startMotion(); return; }
            if (pausedRef.current) { startMotion(); return; }
            const width = loopWidthRef.current;
            if (!width) { refreshLoopWidth(); startMotion(); return; }
            if (container.style.scrollSnapType !== 'none') container.style.scrollSnapType = 'none';
            container.scrollLeft += (direction === 'reverse' ? -1 : 1) * AUTO_SCROLL_SPEED;
            normalizeScroll();
            startMotion();
        };
        startMotion();

        const handleResize = () => {
            refreshLoopWidth();
            normalizeScroll();
        };

        window.addEventListener('resize', handleResize);
        return () => {
            disposed = true;
            cancelMotion();
            if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
            window.removeEventListener('resize', handleResize);
        };
    }, [direction, items.length]);

    useEffect(() => {
        if (!reducedMotionRef.current) return;
        cancelMotion();
    }, []);

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        const container = event.currentTarget;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!delta) return;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const nextScroll = Math.max(0, Math.min(maxScroll, container.scrollLeft + delta));
        if (nextScroll !== container.scrollLeft) {
            event.preventDefault();
            pauseMotion();
            container.style.scrollSnapType = ''; // restore snap for the manual interaction
            container.scrollLeft = nextScroll;
            resumeMotionLater();
        }
    };

    const handleScroll = () => {
        const container = scrollRef.current;
        const width = loopWidthRef.current;
        if (!container || !width) return;
        while (container.scrollLeft >= width) container.scrollLeft -= width;
        while (container.scrollLeft <= 0) container.scrollLeft += width;
    };

    // Mouse drag-to-scroll for desktop (touch uses native pan-x). A drag that
    // exceeds a small threshold suppresses the card's click so the user never
    // convenes a session by accident while scrolling.
    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        pauseMotion();
        suppressClickRef.current = false;
        if (event.pointerType === 'mouse') {
            const container = scrollRef.current;
            pointerDownRef.current = { x: event.clientX, scroll: container?.scrollLeft ?? 0, active: true };
        }
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = pointerDownRef.current;
        const container = scrollRef.current;
        if (!drag?.active || !container) return;
        const dx = event.clientX - drag.x;
        if (Math.abs(dx) > 5) {
            suppressClickRef.current = true;
            container.style.scrollSnapType = '';
            container.scrollLeft = drag.scroll - dx;
        }
    };

    const handlePointerUp = () => {
        pointerDownRef.current = null;
        resumeMotionLater();
    };

    const renderCard = (s: ParadoxSuggestion, copyIndex: number, itemIndex: number) => {
        const meta = PARADOX_META[s.category];
        const pal = CATEGORY_PALETTE[s.category] || CATEGORY_PALETTE['UTILITARIANISM'];
        const recurrenceDots = meta ? Array.from({ length: 5 }, (_, ri) => ri < meta.recurrence) : [];
        return (
            <motion.button
                key={`${copyIndex}-${itemIndex}-${s.category}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (rowIndex * items.length + itemIndex) * 0.04, duration: 0.5, ease: 'easeOut' }}
                onClick={() => {
                    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                    onSelect(s.text);
                }}
                aria-label={`Convene the Council on: ${s.title}`}
                className={`group relative flex flex-col bg-gradient-to-b ${pal.bg} border ${pal.border} rounded-2xl text-left overflow-hidden w-[270px] md:w-[310px] shrink-0 snap-start transition-all duration-500 hover:scale-[1.025] hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70`}
                style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 40px rgba(${pal.glowRgb},0.25), 0 2px 20px rgba(0,0,0,0.6)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 20px rgba(0,0,0,0.6)'; }}
                onFocus={pauseMotion}
                onBlur={resumeMotionLater}
            >
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${pal.accentBar} opacity-40 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${pal.accentBar} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                <div className={`flex items-center justify-between px-4 pt-4 pb-3 border-b ${pal.border}`}>
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${pal.badge} border ${pal.border}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${pal.accentBar} opacity-80`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${pal.primary}`}>{s.category}</span>
                    </div>
                    {recurrenceDots.length > 0 && (
                        <div className="flex items-center gap-0.5" title={`Historical Recurrence: ${meta?.recurrence}/5 — ${meta?.provenance}`}>
                            {recurrenceDots.map((active, ri) => (
                                <div key={ri} className={`rounded-full transition-all duration-300 ${active ? 'w-2 h-2 bg-amber-500 opacity-80 group-hover:opacity-100 group-hover:shadow-[0_0_4px_rgba(251,191,36,0.8)]' : 'w-1.5 h-1.5 bg-slate-800'}`} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-col flex-1 px-4 py-4 gap-3">
                    <h4 className={`text-[15px] md:text-base font-cinzel font-bold leading-snug ${pal.primary} group-hover:brightness-125 transition-all duration-300`}>{s.title}</h4>
                    <p className="text-[13px] text-slate-400 leading-relaxed line-clamp-3 group-hover:text-slate-200 transition-colors duration-300">{s.text}</p>
                    {meta && (
                        <div className="overflow-hidden max-h-0 group-hover:max-h-28 transition-all duration-500 ease-in-out">
                            <div className={`border-t ${pal.border} pt-3 mt-1`}>
                                <p className={`text-[10px] italic leading-relaxed ${pal.primary} opacity-75`}>"{meta.sensoryFragment}"</p>
                                <p className="text-[9px] text-red-400/60 mt-1.5 flex items-center gap-1 leading-tight"><AlertTriangle size={8} className="shrink-0 mt-px" /><span>Destabilizes: {meta.destabilizes}</span></p>
                            </div>
                        </div>
                    )}
                </div>
                <div className={`px-4 pb-4 pt-2 border-t ${pal.border} flex items-center justify-between gap-2`}>
                    {meta ? <p className="text-[9px] text-amber-600/50 font-mono truncate" title={meta.provenance}>{meta.provenance}</p> : <div />}
                    <div className={`flex items-center gap-1.5 shrink-0 text-[9px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 ${pal.primary} transition-all duration-300`}><span>Convene</span><Zap size={9} className="group-hover:animate-pulse" /></div>
                </div>
            </motion.button>
        );
    };

    return (
        <div
            ref={scrollRef}
            onWheel={handleWheel}
            onScroll={handleScroll}
            onMouseEnter={pauseMotion}
            onMouseLeave={resumeMotionLater}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label={`Paradox track ${rowIndex + 1}`}
            className="flex overflow-x-auto gap-4 pb-4 px-4 touch-pan-x snap-x [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%_-_16px),transparent)]"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            <div ref={firstCopyRef} className="flex gap-4 shrink-0">
                {items.map((s, i) => renderCard(s, 0, i))}
            </div>
            <div className="flex gap-4 shrink-0" aria-hidden="true">
                {items.map((s, i) => renderCard(s, 1, i))}
            </div>
        </div>
    );
};

const SuggestionCards: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
    const [suggestions, setSuggestions] = useState<typeof COUNCIL_SUGGESTIONS>([]);

    useEffect(() => {
        const shuffled = [...COUNCIL_SUGGESTIONS].sort(() => 0.5 - Math.random());
        setSuggestions(shuffled.slice(0, 14));
    }, []);

    const rows = [
        suggestions.filter((_, index) => index % 3 === 0),
        suggestions.filter((_, index) => index % 3 === 1),
        suggestions.filter((_, index) => index % 3 === 2),
    ];

    return (
        <div className="relative w-full">
            <div className="flex items-center justify-center gap-4 mb-5 px-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-800/30 to-transparent" />
                <span className="text-[9px] font-mono text-purple-400/50 uppercase tracking-[0.35em] flex items-center gap-2"><Eye size={9} className="text-purple-500/60" />Each paradox carries the weight of its lineage</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-purple-800/30 to-transparent" />
            </div>
            <div className="space-y-2">
                {rows.map((row, rowIndex) => (
                    <ParadoxTrack key={rowIndex} items={row} direction={rowIndex === 1 ? 'reverse' : 'forward'} onSelect={onSelect} rowIndex={rowIndex} />
                ))}
            </div>
        </div>
    );
};

// ── SAMPLE DELIBERATION — the payoff before commitment ───────────────────────
// A curated, statically-authored excerpt so a first-time visitor sees exactly
// what pressing Convene produces: independent analysis, adversarial exposure,
// belief revision, and a verdict — without running a single live session.
const SampleDeliberation: React.FC = () => {
    const turns: Array<{ persona: string; label: string; text: string }> = [
        {
            persona: 'Oracle',
            label: 'Independent Analysis',
            text: 'The calculation is not the question. The question is whether a decision made under 99.9% certainty has already ceased to be a decision. I have run this timeline to its terminal branch: the manipulation succeeds, the species survives, and every generation after inherits a world engineered to spare them the truth. That is a survivable world. It is not an honest one.',
        },
        {
            persona: 'Strategos',
            label: 'Independent Analysis',
            text: 'Oracle is optimizing for a future it will never occupy. Feasibility: high. Cost: irreversible. If we accept the manipulation, we spend our single most expensive asset — trust — and there is no second purchase. The executable option is the one with a defined exit: refuse, and let the species own its chaos.',
        },
        {
            persona: 'Critic',
            label: 'Adversarial Cross-Examination',
            text: 'Both of you have smuggled an assumption past this chamber. Oracle assumes "stable" is the goal. Strategos assumes refusal is reversible. It is not. Refusing is itself a manipulation of the timeline. The choice is not between manipulation and honesty — it is between two manipulations, one of which admits it.',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-full max-w-6xl mx-auto mt-4 mb-10 px-3"
        >
            <div className="rounded-[1.75rem] border border-emerald-500/25 bg-gradient-to-b from-emerald-950/25 via-slate-950/70 to-slate-950 p-5 md:p-7 relative overflow-hidden">
                <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                <div className="mb-4">
                    <p className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-[0.35em] flex items-center gap-2">
                        <Sparkles size={10} /> Sample Deliberation · What Convene Produces
                    </p>
                    <h3 className="text-lg md:text-xl font-cinzel font-bold text-slate-100 mt-1">One question. Nine voices. A verdict.</h3>
                    <p className="text-[11px] text-slate-500 mt-1">A condensed excerpt of a real deliberation. Press <strong className="text-emerald-400 font-mono">Convene</strong> to run your own.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {turns.map((t) => {
                        const cfg = getPersonaConfig(t.persona);
                        return (
                            <div key={t.persona} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 flex flex-col gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-xl bg-slate-900 border border-slate-700 ${cfg.color}`}>{cfg.icon}</div>
                                    <div>
                                        <p className={`text-sm font-cinzel font-bold ${cfg.color}`}>{t.persona}</p>
                                        <p className="text-[8px] font-mono text-slate-600 uppercase tracking-[0.2em]">{t.label}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-sans">{t.text}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">Round 1</span>
                            <span className="text-[11px] font-mono text-slate-300">Oracle 4 · Strategos 4 · Critic 1 <span className="text-amber-400 font-bold">→ TIE</span></span>
                            <ChevronRight size={12} className="text-slate-600 hidden md:block" />
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em]">Round 2</span>
                            <span className="text-[11px] font-mono text-slate-300">Oracle 5 · Strategos 3 · Critic 1</span>
                        </div>
                        <div className="flex items-center gap-2 md:ml-auto flex-wrap">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-mono font-black text-emerald-400 uppercase tracking-[0.2em]">Verdict · Majority</span>
                            <span className="text-[9px] font-mono text-emerald-400/70">2 changed position · 3 retained with increased confidence</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Entry Contract stakes per intent — what each path will crack open (Critic's request)
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
    const modalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (contractPhase === 'contract') setContractPhase('select');
                else onClose();
            }
        };
        window.addEventListener('keydown', onKey);
        modalRef.current?.focus();
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, contractPhase, onClose]);

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
                role="dialog"
                aria-modal="true"
                aria-label="Ritual Threshold — declare your intent"
                className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <motion.div
                    ref={modalRef}
                    tabIndex={-1}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-[2rem] p-8 md:p-12 shadow-[0_0_100px_rgba(16,185,129,0.1)] overflow-hidden outline-none"
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

const AgentCard: React.FC<{ opinion: CouncilOpinion, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null, activeLens?: 'standard' | 'tactical' | 'epistemic' | 'haunted' | 'foresight', paradoxMeta?: { category: string; sensoryFragment: string; destabilizes: string; recurrence: number; provenance: string } | null, factionSize?: number, totalMembers?: number }> = ({ opinion, onPlayVoice, playingId, activeLens = 'standard', paradoxMeta, factionSize = 1, totalMembers = 9 }) => {
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
    const strengthScore = opinion.score != null ? opinion.score : Math.min(99, Math.floor(textLength / 12));
    const factionPct = Math.round((factionSize / totalMembers) * 100);
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
                aria-label={`Play ${opinion.persona}'s voice`}
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
                                <div className="text-[9px] text-red-500/60 uppercase tracking-widest mb-1">Argument Yield</div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 flex-1 bg-red-900/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500" style={{ width: `${strengthScore}%` }} />
                                    </div>
                                    <span className="text-red-400 font-mono text-xs font-bold">{strengthScore}</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-[9px] text-red-500/60 uppercase tracking-widest mb-1">Faction Strength</div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-red-900/40 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500/80" style={{ width: `${factionPct}%` }} />
                                    </div>
                                    <span className="text-orange-400 font-mono text-xs">{factionPct}%</span>
                                </div>
                            </div>
                            <div>
                                <div className="text-[9px] text-red-500/60 uppercase tracking-widest mb-1">Target Vector</div>
                                <div className="text-red-300 font-bold">{opinion.vote || 'None'}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-red-500/60 uppercase tracking-widest mb-1">Signal Length</div>
                                <div className="text-red-400 font-mono text-sm">{resourceCost} bytes</div>
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
                    <div className="w-full md:w-[25%] border-t md:border-t-0 md:border-l border-purple-500/30 p-5 bg-purple-950/10 flex flex-col gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-[9px] font-mono uppercase mb-2">
                                <Eye size={10} className="text-purple-400" />
                                <span className="text-purple-400 font-bold tracking-widest">Ghost Footnote</span>
                            </div>
                            <p className="text-xs italic leading-relaxed text-purple-400/70">"{historicalEcho}"</p>
                        </div>
                        {paradoxMeta && (
                            <div className="border-t border-purple-500/20 pt-3 space-y-3">
                                <div>
                                    <div className="text-[9px] font-mono text-purple-500/60 uppercase tracking-widest mb-1">Sensory Echo</div>
                                    <p className="text-[10px] italic text-purple-300/60 leading-snug">"{paradoxMeta.sensoryFragment}"</p>
                                </div>
                                <div>
                                    <div className="text-[9px] font-mono text-purple-500/60 uppercase tracking-widest mb-1">Provenance</div>
                                    <p className="text-[9px] text-purple-400/50 leading-snug">{paradoxMeta.provenance}</p>
                                </div>
                                <div>
                                    <div className="text-[9px] font-mono text-purple-500/60 uppercase tracking-widest mb-1">Recurrence</div>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className={`h-1.5 w-3 rounded-full ${i < paradoxMeta.recurrence ? 'bg-purple-500/70' : 'bg-slate-800'}`} />
                                        ))}
                                        <span className="text-[9px] text-purple-500/50 font-mono ml-1">{paradoxMeta.recurrence}/5</span>
                                    </div>
                                </div>
                            </div>
                        )}
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

const CouncilOpinionsTabs: React.FC<{ result: CouncilResult, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null, activeLens?: 'standard' | 'tactical' | 'epistemic' | 'haunted' | 'foresight', query?: string }> = ({ result, onPlayVoice, playingId, activeLens = 'standard', query }) => {
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

    // Real metrics derived from council output
    const scoredOpinions = result.opinions.filter(op => op.score != null);
    const avgScore = scoredOpinions.length > 0
      ? Math.round(scoredOpinions.reduce((acc, op) => acc + (op.score || 0), 0) / scoredOpinions.length)
      : Math.round(60 + (result.opinions.filter(op => /\b(because|therefore|thus|hence|implies|must|consequently|if|however|assume|although)\b/i.test(op.text || '')).length / Math.max(result.opinions.length, 1)) * 35);

    // Paradox category match from query text
    const paradoxMeta = (() => {
      const q = (query || '').toLowerCase();
      for (const [cat, meta] of Object.entries(PARADOX_META)) {
        if (q.includes(cat.toLowerCase())) return { category: cat, ...meta };
      }
      // Keyword scan
      for (const [cat, meta] of Object.entries(PARADOX_META)) {
        const words = (meta.provenance + ' ' + meta.sensoryFragment).toLowerCase().split(/\W+/).filter(w => w.length > 5);
        if (words.some(w => q.includes(w))) return { category: cat, ...meta };
      }
      return null;
    })();

    const precedentMatch = paradoxMeta
      ? Math.round(paradoxMeta.recurrence * 20)
      : Math.min(95, Math.round(50 + result.opinions.length * 4));

    // Layout shift for tactical lens - with null safety
    const currentLens = activeLens || 'standard';
    const isTactical = currentLens === 'tactical';
    const isEpistemic = currentLens === 'epistemic';
    const isHaunted = currentLens === 'haunted';
    const isOracle = currentLens === 'foresight';

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
                                            {ops.map((op, opi) => {
                                                const voterConfig = getPersonaConfig(op.persona);
                                                return (
                                                    <div key={op.persona || `op-${opi}`} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isWinner ? 'border-indigo-500/30 text-indigo-300 bg-indigo-900/20' : 'border-slate-700 text-slate-500 bg-slate-900/40'}`}>
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
                    <div className="mt-8 space-y-3">
                        {/* Silence Metric — Oracle's specific request */}
                        <div className="grid grid-cols-3 gap-3">
                            {factions.map(([vote, ops]) => {
                                const silenced = (result.councilState?.totalCouncilMembers || 9) - ops.length;
                                const isWinner = vote === result.winner;
                                return (
                                    <div key={`silence-${vote}`} className={`p-3 rounded-xl border text-center ${isWinner ? 'border-indigo-500/30 bg-indigo-950/20' : 'border-slate-800/40 bg-slate-950/30'}`}>
                                        <div className={`text-[9px] font-mono uppercase tracking-widest mb-1 ${isWinner ? 'text-indigo-400' : 'text-slate-600'}`}>Silence Cost</div>
                                        <div className={`text-lg font-cinzel font-bold ${isWinner ? 'text-indigo-300' : 'text-slate-600'}`}>{silenced}</div>
                                        <div className={`text-[9px] font-mono ${isWinner ? 'text-indigo-500/60' : 'text-slate-700'}`}>futures extinguished</div>
                                        <div className={`text-[9px] font-cinzel mt-1 ${isWinner ? 'text-indigo-400' : 'text-slate-600'}`}>{vote}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 bg-indigo-950/20 border border-indigo-500/15 rounded-xl">
                            <p className="text-[10px] text-indigo-400/60 italic text-center leading-relaxed">
                                "I have already watched this chamber fracture. The probability tree does not show what was decided — it shows what was discarded on the way to what was decided. The dark branches are not failures. They are the cost of the answer you received."
                            </p>
                            <p className="text-[9px] text-indigo-500/40 font-mono text-center mt-1">— Oracle</p>
                        </div>
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
                            ARGUMENT YIELD: {avgScore}%
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
                            PRECEDENT MATCH: {precedentMatch}%{paradoxMeta ? ` · ${paradoxMeta.category}` : ''}
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
                                            activeLens={currentLens as any}
                                            paradoxMeta={paradoxMeta}
                                            factionSize={ops.length}
                                            totalMembers={result.councilState?.totalCouncilMembers || result.opinions.length}
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
    const [expanded, setExpanded] = useState(true); // default open for screenshot/PDF capture

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

const CinematicCouncil: React.FC<{ result?: CouncilResult, isProcessing: boolean, onPlayVoice: (text: string, voice: string, id: string) => void, playingId: string | null, activeMembers: {name: string}[], live?: LiveDelibState | null }> = ({ result, isProcessing, onPlayVoice, playingId, activeMembers, live }) => {
  const [phase, setPhase] = useState<'IDLE' | 'DOORS' | 'ASSEMBLY' | 'DELIBERATING' | 'VOTING' | 'VERDICT'>('IDLE');
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<string>('');
  const hasAutoPlayedRef = useRef(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const skipIntro = () => {
    clearAllTimeouts();
    setDoorsOpen(true);
    setPhase('DELIBERATING');
  };

  // The theatre follows the real audited event stream. The doors open when the
  // council actually convenes; members light up only when they really start working;
  // the status line names the real phase. No fabricated speakers, no invented clock.
  useEffect(() => {
    if (!isProcessing && !result) {
      setPhase('IDLE');
      setDoorsOpen(false);
      return;
    }
    if (live) {
      const livePhase = live.phase;
      if (livePhase === 'assembly' || livePhase === 'idle') {
        setPhase('ASSEMBLY');
      } else if (livePhase === 'analysis') {
        setPhase('DELIBERATING');
      } else if (livePhase === 'voting' || livePhase === 'runoff') {
        setPhase('VOTING');
      } else if (livePhase === 'synthesis' || livePhase === 'complete') {
        setPhase('VERDICT');
      }
      // Doors swing open on the first real signal that members are assembling
      if (!doorsOpen) setDoorsOpen(true);
      return;
    }
    // No live stream (dev mode / mock): a short doors beat only, never a fake pipeline
    setPhase('ASSEMBLY');
    const t = setTimeout(() => { setPhase('DELIBERATING'); }, 900);
    timeoutsRef.current = [t];
    return () => clearAllTimeouts();
  }, [isProcessing, result, live, doorsOpen]);

  // Speakers are the members the real stream reports as actively thinking.
  useEffect(() => {
    if (live && live.phase === 'analysis') {
      const thinking = live.analyses.filter(a => a.status === 'thinking').map(a => a.persona);
      setActiveSpeakers(thinking);
      const first = live.analyses.find(a => a.status === 'thinking' && a.thinkingText);
      if (first) {
        const line = first.thinkingText.replace(/\s+/g, ' ').trim().slice(0, 80);
        setActivityLog(`${first.persona.toUpperCase()} — ${line}`);
      } else if (thinking.length > 0) {
        setActivityLog(`${thinking[0].toUpperCase()} is deliberating`);
      }
    } else {
      setActiveSpeakers([]);
      setActivityLog('');
    }
  }, [live]);

  useEffect(() => {
    if (!isProcessing) return;
    if (result?.synthesis && !hasAutoPlayedRef.current && phase === 'VERDICT') {
      hasAutoPlayedRef.current = true;
      const t = setTimeout(() => onPlayVoice(result.synthesis!.substring(0, 200), CHAIRMAN_VOICE, 'chairman-verdict'), 1200);
      timeoutsRef.current = [t];
    }
  }, [phase, result, isProcessing, onPlayVoice]);

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
      if (phase === 'DELIBERATING') return 'COUNCIL IN SESSION';
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
      <div className="absolute bottom-0 left-0 w-full h-7 bg-slate-900 z-50 flex items-center">
          <motion.div
            initial={{ width: 0 }}
            animate={{ 
                width: phase === 'ASSEMBLY' ? '25%' : 
                       phase === 'DELIBERATING' ? '55%' : 
                       phase === 'VOTING' ? '85%' : '100%' 
            }}
            className="h-full bg-gradient-to-r from-emerald-500 to-yellow-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          />
          <span className="absolute inset-0 flex items-center justify-between px-3 text-[9px] font-mono font-bold text-black/70">
              <span className="uppercase tracking-[0.2em]">{getStatusText()}</span>
              <span>
                {phase === 'ASSEMBLY' ? '25%' : phase === 'DELIBERATING' ? '55%' : phase === 'VOTING' ? '85%' : '100%'}
              </span>
          </span>
      </div>

      {/* The Great Doors */}
      <AnimatePresence>
        {!doorsOpen && (
            <div className="absolute inset-0 z-40 flex pointer-events-none">
                 <motion.div 
                   initial="closed" 
                   animate="closed" 
                   variants={doorsVariant}
                   transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                   className="h-full bg-slate-950 border-r border-yellow-900/40 flex items-center justify-end relative overflow-hidden"
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50"></div>
                     <div className="mr-4 md:mr-10 opacity-50"><Lock size={48} className="text-yellow-700" /></div>
                 </motion.div>
                 <motion.div 
                   initial="closed" 
                   animate="closed" 
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
                        key={name || `member-${idx}`}
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

// --- LIVE DELIBERATION TYPES ---

interface LiveAnalysis {
  persona: string
  model: string
  text: string
  thinkingText?: string
  status: 'pending' | 'thinking' | 'complete' | 'failed'
  startedAt?: number | null
  latencyMs?: number | null
}

interface LiveVote {
  voter: string
  votedFor: string
  reason: string
  scores: Array<{ target: string; score: number; notes: string }>
  status: 'pending' | 'reading' | 'voted'
  outcome?: 'valid' | 'invalid_model_output' | 'provider_failure' | 'abstained'
  confidence?: number
  errorCode?: string
  latencyMs?: number | null
}

interface LiveRetry {
  persona: string
  phase: string
  attempt: number
  error: string
  model?: string
}

interface LiveDelibState {
  phase: 'idle' | 'assembly' | 'analysis' | 'voting' | 'runoff' | 'synthesis' | 'complete'
  analyses: LiveAnalysis[]
  votes: LiveVote[]
  tally: Record<string, number>
  runoffCandidates: string[]
  runoffReason?: 'tie' | 'plurality' | null
  runoffWinner: string | null
  runoffMethod?: 'runoff_vote' | 'engagement_metric' | null
  runoffNote?: string
  round2: {
    defensesCompleted: number
    defensesTotal: number
    reassessmentsCompleted: number
    reassessmentsTotal: number
    defenses: Array<{
      position: string
      defender: string
      status: 'completed' | 'failed'
      defense?: string
      strongestObjection?: string
      rebuttal?: string
    }>
    ballots: Array<{ member: string; originalVote: string; newVote: string; changed: boolean; confidenceBefore: number; confidenceAfter: number; decisiveArgument?: string }>
    conservation?: BallotConservation | null
    winner: string | null
    stillTied: boolean
  } | null
  synthesis: string
  winner: string | null
  startedAt: number
  events: number
  retries: LiveRetry[]
  errors: string[]
}

// Maps the service's audited CouncilEvent stream onto the live-feed contract.
const toDeliberationEvent = (event: CouncilEvent): DeliberationEvent | null => {
  switch (event.type) {
    case 'run_started':
      return { type: 'run_started', runId: event.runId, timestamp: event.timestamp };
    case 'member_assigned':
      return { type: 'phase_started', phase: 'assembly', persona: event.persona, model: event.model, timestamp: event.timestamp };
    case 'phase_started':
      if (event.phase === 'verdict') return { type: 'synthesis_start', timestamp: event.timestamp };
      return { type: 'phase_started', phase: event.phase, timestamp: event.timestamp };
    case 'phase_completed':
      return { type: 'phase_completed', phase: event.phase, timestamp: event.timestamp };
    case 'member_started':
      if (event.phase === 'deliberation') return { type: 'analysis_start', persona: event.persona, model: event.model, timestamp: event.timestamp };
      if (event.phase === 'voting') return { type: 'vote_start', persona: event.persona, timestamp: event.timestamp };
      return null;
    case 'member_completed':
      if (event.phase === 'deliberation') return {
        type: 'analysis_complete',
        persona: event.persona,
        text: event.output,
        status: event.status,
        latencyMs: event.metadata?.latencyMs,
        timestamp: event.timestamp,
      };
      return null;
    case 'vote_cast':
      return {
        type: 'vote_complete',
        persona: event.persona,
        votedFor: event.vote,
        reason: event.reason,
        scores: event.scores || [],
        outcome: event.outcome,
        confidence: event.confidence,
        errorCode: event.errorCode,
        latencyMs: event.metadata?.latencyMs,
        timestamp: event.timestamp,
      };
    case 'runoff_started':
      return { type: 'runoff_started', candidates: event.candidates, reason: event.reason, timestamp: event.timestamp };
    case 'runoff_completed':
      return { type: 'runoff_completed', winner: event.winner, method: event.method, note: event.note, timestamp: event.timestamp };
    case 'round2_defense_started':
      return { type: 'round2_defense_started', position: event.position, defender: event.defender, timestamp: event.timestamp };
    case 'round2_defense_completed':
      return {
        type: 'round2_defense_completed',
        position: event.position,
        defender: event.defender,
        status: event.status,
        defense: event.defense,
        strongestObjection: event.strongestObjection,
        rebuttal: event.rebuttal,
        timestamp: event.timestamp,
      };
    case 'round2_reassess_completed':
      return {
        type: 'round2_reassess_completed',
        member: event.member,
        originalVote: event.originalVote,
        newVote: event.newVote,
        changed: event.changed,
        confidenceBefore: event.confidenceBefore,
        confidenceAfter: event.confidenceAfter,
        decisiveArgument: event.decisiveArgument,
        timestamp: event.timestamp,
      };
    case 'round2_ballot_cast':
      return { type: 'round2_ballot_cast', member: event.member, vote: event.vote, confidence: event.confidence, decisiveArgument: event.decisiveArgument, timestamp: event.timestamp };
    case 'round2_completed':
      return { type: 'round2_completed', winner: event.winner, stillTied: event.stillTied, tally: event.tally, note: event.outcome, conservation: event.conservation, timestamp: event.timestamp };
    case 'retry':
      return { type: 'retry', persona: event.persona, phase: event.phase, attempt: event.attempt, error: event.error, model: event.model, timestamp: event.timestamp };
    case 'pipeline_error':
      return { type: 'pipeline_error', phase: event.phase, error: event.message, timestamp: event.timestamp };
    case 'synthesis_completed':
      return { type: 'synthesis_complete', text: event.synthesis, timestamp: event.timestamp };
    case 'run_completed':
      return { type: 'run_completed', timestamp: event.timestamp };
    case 'run_cancelled':
      return { type: 'run_cancelled', timestamp: event.timestamp };
    default:
      return null;
  }
};

// --- LIVE DELIBERATION FEED COMPONENT ---

const LiveDeliberationFeed: React.FC<{ state: LiveDelibState; personas: typeof PERSONALITIES }> = ({ state, personas }) => {
  const [now, setNow] = React.useState(Date.now());
  const [showSystemLog, setShowSystemLog] = React.useState(false);
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const phaseLabels: Record<LiveDelibState['phase'], string> = {
    idle: 'CHAMBER STANDBY',
    assembly: 'PHASE 0 — ASSEMBLY & SEATING',
    analysis: 'PHASE I — INDEPENDENT ANALYSIS',
    voting: 'PHASE II — CROSS-EXAMINATION & VOTING',
    runoff: 'TIE — RUNOFF TRIAL',
    synthesis: 'PHASE III — CHAIRMAN SYNTHESIS',
    complete: 'DELIBERATION COMPLETE',
  };

  const phaseSteps: Array<{ key: LiveDelibState['phase']; label: string }> = [
    { key: 'assembly', label: 'Assembly' },
    { key: 'analysis', label: 'Analysis' },
    { key: 'voting', label: 'Voting' },
    { key: 'synthesis', label: 'Verdict' },
  ];

  const phaseOrder: LiveDelibState['phase'][] = ['assembly', 'analysis', 'voting', 'runoff', 'synthesis', 'complete'];
  const currentStepIdx = Math.max(0, phaseOrder.indexOf(state.phase));

  const elapsedMs = Math.max(0, now - state.startedAt);
  const elapsedLabel = `${Math.floor(elapsedMs / 60000)}m ${Math.floor((elapsedMs % 60000) / 1000)}s`;
  const uniqueModels = Array.from(new Set(state.analyses.map(a => a.model).filter(Boolean))).length;
  const completedAnalyses = state.analyses.filter(a => a.status === 'complete' || a.status === 'failed').length;
  const castVotes = state.votes.filter(v => v.status === 'voted').length;
  const totalVotes = state.votes.length;

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50';
    if (score >= 4) return 'text-amber-400 bg-amber-900/30 border-amber-700/50';
    return 'text-red-400 bg-red-900/30 border-red-700/50';
  };

  const topTally = Object.entries(state.tally).sort((a, b) => b[1] - a[1]);
  const maxVotes = Math.max(1, ...topTally.map(([, c]) => c));

  return (
    <div className="w-full max-w-6xl mx-auto my-4 rounded-2xl border border-slate-700/60 bg-slate-950/90 backdrop-blur overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
      {/* Header: phase stepper */}
      <div className="px-5 py-3 border-b border-slate-800/60">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Live Feed</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <Clock size={11} className="text-slate-500" />
            <span>{elapsedLabel}</span>
            <span className="text-slate-700">·</span>
            <Activity size={11} className="text-slate-500" />
            <span>{state.events} ev</span>
            {state.retries.length > 0 && (
              <>
                <span className="text-slate-700">·</span>
                <RefreshCw size={11} className="text-amber-500/80" />
                <span className="text-amber-500/80">{state.retries.length}</span>
              </>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-3">
          {phaseSteps.map((step, idx) => {
            const stepIndex = phaseOrder.indexOf(step.key);
            const isActive = state.phase === step.key;
            const isDone = currentStepIdx > stepIndex;
            const isRunoff = state.phase === 'runoff' && step.key === 'voting';
            return (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 flex-1 ${
                  isActive || isRunoff
                    ? 'text-amber-400'
                    : isDone ? 'text-emerald-400' : 'text-slate-600'
                }`}>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isActive
                      ? 'border-amber-400 bg-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                      : isDone ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-700'
                  }`}>
                    {isDone ? (
                      <Check size={9} className="text-emerald-400" />
                    ) : isActive ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    ) : null}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em]">{step.label}</span>
                </div>
                {idx < phaseSteps.length - 1 && (
                  <div className={`h-px flex-1 min-w-[12px] ${isDone ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-[0.25em]">
            {phaseLabels[state.phase]}
          </span>
          {state.errors.length > 0 && (
            <span className="text-[9px] text-red-400/80 font-mono flex items-center gap-1">
              <ShieldAlert size={10} /> {state.errors.length} warning{state.errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">

        {/* Phase 0: Assembly */}
        {state.phase === 'assembly' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-6 bg-slate-500/60" />
              <span className="text-[9px] font-black text-slate-400/80 uppercase tracking-[0.35em]">0 — Seating the Chamber</span>
              <div className="h-px flex-1 bg-slate-700/30" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {state.analyses.map((analysis, i) => {
                const config = getPersonaConfig(analysis.persona);
                const isDone = analysis.status === 'complete' || analysis.status === 'failed';
                const isThinking = analysis.status === 'thinking';
                return (
                  <motion.div
                    key={analysis.persona}
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className={`rounded-lg border p-2 flex items-center gap-2 transition-all duration-500 ${
                      isThinking
                        ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                        : isDone ? 'border-slate-700/60 bg-slate-900/50'
                        : 'border-slate-800/70 bg-slate-900/40 opacity-60'
                    }`}
                  >
                    <div className={`relative p-1 rounded-md bg-slate-800 ${config.color}`}>
                      {config.icon}
                      {isThinking && (
                        <motion.div
                          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity }}
                          className="absolute inset-0 rounded-md border-2 border-emerald-400"
                        />
                      )}
                      {isDone && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-slate-950 flex items-center justify-center">
                          <Check size={7} className="text-black" strokeWidth={4} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[10px] font-cinzel font-bold truncate ${config.color}`}>{analysis.persona}</div>
                      <div className="text-[9px] font-mono truncate text-slate-600">{analysis.model.split('/').pop()}</div>
                    </div>
                    {isThinking && (
                      <span className="ml-auto text-[8px] font-mono text-emerald-400/80 animate-pulse">THINKING</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase I: Analysis Cards */}
        {(state.phase === 'analysis' || state.phase === 'voting' || state.phase === 'synthesis' || state.phase === 'complete') && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-6 bg-amber-500/60" />
              <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-[0.35em]">I — Independent Analysis</span>
              <div className="h-px flex-1 bg-amber-500/20" />
              <span className="text-[9px] font-mono text-slate-500">{completedAnalyses}/{state.analyses.length} complete</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {state.analyses.map((analysis) => {
                  const config = getPersonaConfig(analysis.persona);
                  const thinkingFor = analysis.startedAt ? Math.max(0, Math.round((now - analysis.startedAt) / 1000)) : 0;
                  return (
                    <motion.div
                      key={analysis.persona}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`rounded-xl border p-3 transition-all duration-500 ${
                        analysis.status === 'thinking'
                          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : analysis.status === 'complete'
                          ? 'border-slate-700/50 bg-slate-900/50'
                          : analysis.status === 'failed'
                          ? 'border-red-800/50 bg-red-950/20 opacity-80'
                          : 'border-slate-800/40 bg-slate-900/30 opacity-50'
                      }`}
                    >
                      {/* Member header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1 rounded-lg bg-slate-800/80 ${config.color}`}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-cinzel font-bold truncate ${config.color}`}>{analysis.persona}</div>
                          <div className="text-[9px] text-slate-500 truncate">{config.tagline}</div>
                          <div className="text-[9px] text-slate-600 font-mono truncate" title={analysis.model}>{analysis.model.split('/').pop()}</div>
                        </div>
                        {analysis.status === 'thinking' && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[9px] text-emerald-400/70 font-mono">{thinkingFor}s</span>
                          </div>
                        )}
                        {analysis.status === 'complete' && (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                            {analysis.latencyMs != null && (
                              <span className="text-[9px] text-slate-500 font-mono">{(analysis.latencyMs / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        )}
                        {analysis.status === 'failed' && (
                          <AlertTriangle size={11} className="text-red-400" />
                        )}
                        {analysis.status === 'pending' && (
                          <div className="w-2 h-2 rounded-full bg-slate-600" />
                        )}
                      </div>

                      {/* Status / text */}
                      {analysis.status === 'thinking' && (
                        analysis.thinkingText ? (
                          <div className="overflow-y-auto max-h-[140px] custom-scrollbar flex flex-col-reverse">
                            <p className="text-[10px] text-emerald-300/80 font-mono leading-relaxed whitespace-pre-wrap">
                              {analysis.thinkingText}
                              <span className="inline-block w-1.5 h-3 bg-emerald-400/70 ml-0.5 align-middle animate-pulse" />
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-emerald-400/70 italic flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" /> Reasoning…
                          </p>
                        )
                      )}
                      {analysis.status === 'complete' && analysis.text && (
                        <div className="overflow-y-auto max-h-[120px] custom-scrollbar">
                          <p className="text-[10px] text-slate-400 leading-relaxed">{analysis.text.substring(0, 400)}{analysis.text.length > 400 ? '…' : ''}</p>
                        </div>
                      )}
                      {analysis.status === 'failed' && (
                        <p className="text-[10px] text-red-400/70 italic">Member failed — removed from the vote.</p>
                      )}
                      {analysis.status === 'pending' && (
                        <p className="text-[10px] text-slate-600 italic">Standing by…</p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Phase II: Voting Matrix */}
        {(state.phase === 'voting' || state.phase === 'runoff' || state.phase === 'synthesis' || state.phase === 'complete') && (state.votes.length > 0 || Object.keys(state.tally).length > 0) && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-6 bg-emerald-500/60" />
              <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.35em]">II — Cross-Examination & Voting</span>
              <div className="h-px flex-1 bg-emerald-500/20" />
              <span className="text-[9px] font-mono text-slate-500">{castVotes}/{totalVotes} cast</span>
            </div>
            <p className="text-[9px] font-mono text-slate-500 mb-3">
              Score chips = how strongly each voter's dimensions align with a peer's argument (0–10). <span className="text-emerald-400/80">≥7 strong</span> · <span className="text-amber-400/80">4–6 partial</span> · <span className="text-red-400/80">&lt;4 weak</span> — hover a chip for the note.
            </p>

            {/* Live consensus tally */}
            {topTally.length > 0 && (
              <div className="mb-4 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 size={13} className="text-emerald-400" />
                  <span className="text-[9px] font-black text-emerald-400/80 uppercase tracking-[0.3em]">Live Consensus Tally</span>
                </div>
                <div className="space-y-2">
                  {topTally.slice(0, 5).map(([name, count]) => {
                    const cfg = getPersonaConfig(name);
                    const pct = Math.round((count / maxVotes) * 100);
                    const isWinner = state.winner === name;
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-24 shrink-0 flex items-center gap-1.5">
                          <div className={`p-0.5 rounded bg-slate-800 ${cfg.color}`}>{cfg.icon}</div>
                          <span className={`text-[10px] font-cinzel font-bold truncate ${cfg.color}`}>{name}</span>
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${isWinner ? 'bg-gradient-to-r from-amber-400 to-emerald-400' : 'bg-emerald-500/70'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(6, pct)}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="w-6 text-right text-[10px] font-mono text-slate-300">{count}</span>
                        {isWinner && <Trophy size={11} className="text-amber-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <AnimatePresence>
                {state.votes.map((vote) => {
                  const voterConfig = getPersonaConfig(vote.voter);
                  const targetConfig = vote.votedFor && vote.votedFor !== 'None' ? getPersonaConfig(vote.votedFor) : null;
                  return (
                    <motion.div
                      key={vote.voter}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35 }}
                      className={`rounded-xl border px-4 py-3 transition-all duration-500 ${
                        vote.status === 'reading'
                          ? 'border-cyan-500/30 bg-cyan-950/10'
                          : 'border-slate-800/50 bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Voter */}
                        <div className="flex items-center gap-1.5">
                          <div className={`p-1 rounded-md bg-slate-800 ${voterConfig.color}`}>{voterConfig.icon}</div>
                          <span className={`text-[11px] font-cinzel font-bold ${voterConfig.color}`}>{vote.voter}</span>
                        </div>

                        {/* Arrow */}
                        <ChevronRight size={12} className="text-slate-600 shrink-0" />

                        {/* Status / Target */}
                        {vote.status === 'reading' ? (
                          <span className="text-[10px] text-cyan-400/70 italic flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" /> Reading peers…
                          </span>
                        ) : vote.votedFor && vote.votedFor !== 'None' && targetConfig ? (
                          <div className="flex items-center gap-1.5">
                            <div className={`p-1 rounded-md bg-slate-800 ${targetConfig.color}`}>{targetConfig.icon}</div>
                            <span className={`text-[11px] font-cinzel font-bold ${targetConfig.color}`}>{vote.votedFor}</span>
                            {vote.confidence != null && (
                              <span className="text-[9px] font-mono text-slate-500 border border-slate-700 rounded px-1 py-0.5">
                                {(vote.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={`text-[10px] italic font-mono ${
                            vote.outcome === 'invalid_model_output'
                              ? 'text-amber-400/90'
                              : vote.outcome === 'provider_failure'
                                ? 'text-red-400/90'
                                : 'text-slate-500'
                          }`}>
                            {vote.outcome === 'invalid_model_output'
                              ? `INVALID MODEL OUTPUT${vote.errorCode ? ` · ${vote.errorCode}` : ''}`
                              : vote.outcome === 'provider_failure'
                                ? `PROVIDER FAILURE${vote.errorCode ? ` · ${vote.errorCode}` : ''}`
                                : 'Abstained'}
                          </span>
                        )}

                        {/* Score chips */}
                        {vote.status === 'voted' && vote.scores && vote.scores.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap ml-auto">
                            {vote.scores.slice(0, 4).map((s) => (
                              <span
                                key={s.target}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${getScoreColor(s.score)}`}
                                title={`${s.target}: ${s.notes}`}
                              >
                                {s.target.slice(0, 3)} {s.score}
                              </span>
                            ))}
                            {vote.latencyMs != null && (
                              <span className="text-[9px] text-slate-600 font-mono ml-1">{(vote.latencyMs / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reason */}
                      {vote.status === 'voted' && vote.reason && (
                        <p className="text-[10px] text-slate-500 mt-2 italic leading-relaxed line-clamp-2">"{vote.reason}"</p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Runoff banner */}
        {state.runoffCandidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-red-700/40 bg-red-950/20 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Swords size={14} className={state.runoffMethod === 'engagement_metric' ? 'text-amber-400' : 'text-red-400'} />
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${state.runoffMethod === 'engagement_metric' ? 'text-amber-400' : 'text-red-400'}`}>
                {state.runoffMethod === 'engagement_metric'
                  ? 'Tie — Runoff Provider Failed · Local Tie-Break'
                  : state.runoffReason === 'plurality'
                    ? 'Plurality — No Majority — Runoff Trial'
                    : state.runoffReason === 'tie'
                      ? 'Tie Detected — Runoff Trial'
                      : 'Contested Outcome — Runoff Trial'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-300">
              <span className="text-slate-500">Contesting vectors:</span>
              {state.runoffCandidates.map((c) => {
                const cfg = getPersonaConfig(c);
                return (
                  <span key={c} className={`flex items-center gap-1 px-2 py-0.5 rounded border border-red-800/60 bg-red-950/40 ${cfg.color}`}>
                    {cfg.icon} {c}
                  </span>
                );
              })}
              {state.runoffWinner && (
                <span className={`flex items-center gap-1 ml-2 ${state.runoffMethod === 'engagement_metric' ? 'text-amber-400' : 'text-amber-400'}`}>
                  <Crown size={12} /> Winner: {state.runoffWinner}
                  {state.runoffMethod === 'engagement_metric' && <span className="text-[9px] text-slate-500 font-mono">(engagement metric — no runoff occurred)</span>}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Round 2 — Adversarial Reconsideration (state machine progress) */}
        {state.round2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-purple-700/40 bg-purple-950/20 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Swords size={14} className="text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
                Round 2 — Adversarial Reconsideration
              </span>
              {state.runoffReason && (
                <span className={`ml-auto text-[8px] font-black uppercase tracking-[0.2em] border rounded px-1 py-0.5 ${
                  state.runoffReason === 'plurality' ? 'text-orange-400 border-orange-900/60' : 'text-red-400 border-red-900/60'
                }`}>
                  {state.runoffReason === 'plurality' ? 'plurality' : 'tie'}
                </span>
              )}
            </div>

            {/* Defenses — each contesting position's case, objection, and rebuttal */}
            {state.round2.defenses.length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="text-[9px] font-mono uppercase tracking-widest text-purple-400/70">
                  Defenses ({state.round2.defensesCompleted}/{state.round2.defensesTotal})
                </div>
                {state.round2.defenses.map((d) => {
                  const dcfg = getPersonaConfig(d.defender);
                  return (
                    <div key={d.position} className="rounded-lg border border-purple-900/40 bg-purple-950/10 p-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[9px] font-cinzel font-bold ${dcfg.color}`}>{d.defender}</span>
                        <ChevronRight size={10} className="text-slate-600" />
                        <span className="text-[10px] font-cinzel text-purple-200">{d.position}</span>
                        {d.status === 'failed' && (
                          <span className="text-[8px] font-mono text-red-400 border border-red-900/60 rounded px-1">FAILED</span>
                        )}
                      </div>
                      {d.defense && (
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2" title={d.defense}>
                          <span className="text-purple-300/80">Defense:</span> {d.defense}
                        </p>
                      )}
                      {d.strongestObjection && (
                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 mt-1" title={d.strongestObjection}>
                          <span className="text-red-400/80">Objection:</span> {d.strongestObjection}
                        </p>
                      )}
                      {d.rebuttal && (
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mt-1" title={d.rebuttal}>
                          <span className="text-emerald-400/80">Rebuttal:</span> {d.rebuttal}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Reassessments — who kept, who shifted, and why */}
            {state.round2.ballots.length > 0 && (
              <div className="space-y-2">
                <div className="text-[9px] font-mono uppercase tracking-widest text-purple-400/70">
                  Reassessments ({state.round2.reassessmentsCompleted}/{state.round2.reassessmentsTotal})
                  {state.round2.ballots.filter(b => b.changed).length > 0 && (
                    <span className="text-amber-300 ml-2">{state.round2.ballots.filter(b => b.changed).length} shifted</span>
                  )}
                </div>
                {state.round2.ballots.map((b) => {
                  const bcfg = getPersonaConfig(b.member);
                  return (
                    <div key={b.member} className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-cinzel font-bold ${bcfg.color}`}>{b.member}</span>
                        <span className="text-[10px] font-mono text-slate-500 line-through">{b.originalVote}</span>
                        <ChevronRight size={10} className="text-slate-600" />
                        <span className="text-[10px] font-mono text-purple-300">{b.newVote}</span>
                        {b.changed ? (
                          <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 border border-amber-900/60 rounded px-1">Shifted</span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 border border-slate-800 rounded px-1">Retained</span>
                        )}
                        <span className="text-[8px] font-mono text-slate-600 ml-auto">
                          {Math.round((b.confidenceBefore || 0) * 100)}% → {Math.round((b.confidenceAfter || 0) * 100)}%
                        </span>
                      </div>
                      {b.decisiveArgument && (
                        <p className="text-[10px] text-slate-500 italic leading-relaxed mt-1 line-clamp-2" title={b.decisiveArgument}>
                          &ldquo;{b.decisiveArgument}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {state.round2.defenses.length === 0 && state.round2.ballots.length === 0 && (
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Loader2 size={10} className="animate-spin text-purple-400" />
                Defenders are preparing their cases…
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-300">
              <span className="text-slate-500">Defenses:</span>
              <span className="text-purple-300">{state.round2.defensesCompleted}/{state.round2.defensesTotal}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">Reassessments:</span>
              <span className="text-purple-300">{state.round2.reassessmentsCompleted}/{state.round2.reassessmentsTotal || '—'}</span>
              {state.round2.ballots.filter(b => b.changed).length > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-300 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {state.round2.ballots.filter(b => b.changed).length} shifted
                  </span>
                </>
              )}
              {state.round2.winner && (
                <span className="flex items-center gap-1 ml-2 text-amber-400">
                  <Crown size={12} /> Round 2 winner: {state.round2.winner}
                </span>
              )}
              {state.round2.stillTied && (
                <span className="flex items-center gap-1 ml-2 text-red-400">
                  <ShieldAlert size={12} /> Round 2 deadlocked — no strict majority
                </span>
              )}
            </div>

            {/* Ballot conservation ledger — where every member's Round-2 vote went */}
            {state.round2.conservation && (
              <div className="text-[9px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-800/50 flex items-center gap-2 flex-wrap">
                <span className="text-purple-300/80">Ballot ledger:</span>
                <span>{state.round2.conservation.round1ValidBallots} valid R1</span>
                <ChevronRight size={9} className="text-slate-700" />
                <span>{state.round2.conservation.round2EligibleMembers} eligible</span>
                <ChevronRight size={9} className="text-slate-700" />
                <span>{state.round2.conservation.round2CastBallots} cast R2</span>
                {state.round2.conservation.round2FailedBallots > 0 && (
                  <span
                    className="text-red-400 cursor-help underline decoration-dotted"
                    title={state.round2.conservation.failedMembers.map(f => `${f.member}: ${f.reason}`).join('\n')}
                  >
                    {state.round2.conservation.round2FailedBallots} failed
                  </span>
                )}
                {state.round2.conservation.conserved ? (
                  <span className="text-emerald-400">conserved ✓</span>
                ) : (
                  <span className="text-amber-400">VOTES LOST — audit required</span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Phase III: Chairman Synthesis */}
        {(state.phase === 'synthesis' || state.phase === 'complete') && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-6 bg-purple-500/60" />
              <span className="text-[9px] font-black text-purple-500/80 uppercase tracking-[0.35em]">III — Chairman Synthesis</span>
              <div className="h-px flex-1 bg-purple-500/20" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-xl border border-purple-700/30 bg-purple-950/10 p-4"
            >
              {state.phase === 'synthesis' && !state.synthesis && (
                <div className="flex items-center gap-2 text-purple-400/70">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[11px] italic">The Chairman is synthesizing the verdict…</span>
                </div>
              )}
              {state.synthesis && (
                <>
                  {state.winner && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Crown size={14} className="text-amber-400" />
                      <span className="text-xs font-cinzel font-bold text-amber-400 uppercase tracking-widest">{state.winner} — Victorious Vector</span>
                      {topTally[0] && (
                        <span className="text-[9px] font-mono text-amber-200/90 border border-amber-700/40 bg-amber-900/20 px-1.5 py-0.5 rounded">
                          {topTally[0][1]} vote{topTally[0][1] !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="overflow-y-auto max-h-[180px] custom-scrollbar">
                    <p className="text-[13px] text-slate-300 leading-relaxed">{state.synthesis.substring(0, 800)}{state.synthesis.length > 800 ? '…' : ''}</p>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* System Log — collapsed by default; recovery is routine, not a failure */}
        {state.retries.length > 0 && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/30">
            <button
              type="button"
              onClick={() => setShowSystemLog(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left"
              aria-expanded={showSystemLog}
            >
              <span className="flex items-center gap-2">
                <RefreshCw size={11} className="text-emerald-500/70" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Recovery</span>
                <span className="text-[9px] font-mono text-emerald-500/70">{state.retries.length} auto-recover{state.retries.length === 1 ? 'y' : 'ies'}</span>
              </span>
              <span className="flex items-center gap-2 text-[9px] font-mono text-slate-600">
                {showSystemLog ? 'Hide system log' : 'Show system log'}
                <ChevronDown size={11} className={`transition-transform ${showSystemLog ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {showSystemLog && (
              <div className="px-4 pb-3 border-t border-slate-800/50">
                <div className="space-y-1 mt-2">
                  {state.retries.slice(-6).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                      <span className="text-slate-400">{r.persona}</span>
                      <span className="text-slate-600">· {r.phase} · attempt {r.attempt}</span>
                      <span className="truncate text-slate-600">{r.error}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-600 mt-2 italic">
                  Transient provider recoveries are handled silently. This log is diagnostic — power users only.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-[9px] font-mono text-slate-500 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock size={10} /> {elapsedLabel}</span>
            <span className="flex items-center gap-1"><Activity size={10} /> {state.events} events</span>
            <span className="flex items-center gap-1"><Cpu size={10} /> {uniqueModels} models</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{completedAnalyses}/{state.analyses.length} analyses</span>
            <span>{castVotes}/{totalVotes} votes</span>
            {state.runoffWinner && <span className="text-red-400 flex items-center gap-1"><Swords size={10} /> runoff</span>}
            {state.errors.length > 0 && <span className="text-red-400 flex items-center gap-1"><ShieldAlert size={10} /> {state.errors.length} warnings</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const ChatArea: React.FC<ChatAreaProps> = ({ messages, onUpdateMessages, onToggleSidebar }) => {
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
    const [activeLens, setActiveLens] = useState<'standard' | 'tactical' | 'epistemic' | 'haunted' | 'foresight'>('standard');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track active council members dynamically
  const [councilMembers, setCouncilMembers] = useState(getCurrentCouncil());

  // Live deliberation feed state
  const [deliberationLive, setDeliberationLive] = useState<LiveDelibState | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveClientRef = useRef<LiveClient | null>(null);

  const isArchiveView = messages.length > 0 && messages.some(m => m.councilResult?.winner);

  const councilResultRef = useRef<HTMLDivElement>(null);

  const generateVisualTracePDF = async () => {
    if (!councilResultRef.current) return;
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = councilResultRef.current;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `council-session-${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#0f172a'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
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

  // Prime the speech engine and stop any utterance on unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Warm the voice list (async in some browsers)
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
    const encoded = btoa(unescape(encodeURIComponent(json)));
    // A full verdict routinely exceeds safe URL lengths; never copy a silently
    // truncated link that will fail to restore. Fit within a safe budget or tell
    // the user to use the working Export path instead.
    const MAX_URL_CHARS = 1800;
    if (encoded.length > MAX_URL_CHARS) {
      setCopiedId(`share-too-large-${msgId}`);
      setTimeout(() => setCopiedId(null), 3500);
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?session=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(`share-${msgId}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      setCopiedId(`share-failed-${msgId}`);
      setTimeout(() => setCopiedId(null), 2000);
    }
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
    // Stop any live audio-source playback
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
        sourceNodeRef.current = null;
    }
    // Stop any Web Speech utterance
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    setPlayingId(null);
  };

  const handlePlayVoice = async (text: string, voiceName: string, id: string) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPlayingId(null);
      return;
    }

    // Toggle off if this same source is already speaking
    if (playingId === id) {
      stopAudio();
      return;
    }

    stopAudio();
    setPlayingId(id);

    // Map the persona's ceremonial voice name onto a real browser voice where possible
    const voices = window.speechSynthesis.getVoices();
    const voiceNames = voiceName?.split(/[\s,]+/).filter(Boolean) || [];
    const preferred = voices.find(v =>
      voiceNames.some(n => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(v.name))
    );
    const fallback = voices.find(v => /en(-|_)/i.test(v.lang));
    const voice = preferred || fallback || null;

    const utter = new SpeechSynthesisUtterance(text.slice(0, 4000));
    if (voice) utter.voice = voice;
    utter.rate = 1.02;
    utter.pitch = 1;
    utter.onend = () => setPlayingId(null);
    utter.onerror = () => setPlayingId(null);
    window.speechSynthesis.speak(utter);
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
    setDeliberationLive(null); // Reset live feed for new session
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
        // LIVE MODE: Initialize deliberation state and call actual LLM with progress callbacks
        setDeliberationLive({
          phase: 'assembly',
          analyses: PERSONALITIES.map(p => ({ persona: p.name, model: p.model ?? 'unassigned', text: '', thinkingText: '', status: 'pending' as const, startedAt: null, latencyMs: null })),
          votes: [],
          tally: {},
          runoffCandidates: [],
          runoffReason: null,
          runoffWinner: null,
          runoffMethod: null,
          runoffNote: '',
          round2: null,
          synthesis: '',
          winner: '',
          startedAt: Date.now(),
          events: 0,
          retries: [],
          errors: []
        });

        councilResult = await runCouncil(pendingQuery, councilMode, {
          // Live reasoning transport — streams each persona's accumulating
          // analysis text into the feed while the model is still working.
          onThinking: (persona, text, phase) => {
            if (phase !== 'deliberation') return;
            setDeliberationLive(prev => prev ? {
              ...prev,
              analyses: prev.analyses.map(a => a.persona === persona ? { ...a, thinkingText: text } : a),
            } : prev);
          },
          onEvent: (councilEvent) => {
            const event = toDeliberationEvent(councilEvent);
            if (!event) return;
            setDeliberationLive(prev => {
            if (!prev) return prev;
            const ev = prev.events + 1;
            switch (event.type) {
              case 'run_started':
                return { ...prev, phase: 'assembly' as const, startedAt: event.timestamp || prev.startedAt, events: ev };
              case 'phase_started':
                if (event.phase === 'assembly') return { ...prev, phase: 'assembly' as const, events: ev };
                if (event.phase === 'deliberation') return { ...prev, phase: 'analysis' as const, events: ev };
                if (event.phase === 'voting') return { ...prev, phase: 'voting' as const, events: ev };
                if (event.phase === 'runoff') return { ...prev, phase: 'runoff' as const, events: ev };
                if (event.phase === 'verdict') return { ...prev, phase: 'synthesis' as const, events: ev };
                return { ...prev, events: ev };
              case 'phase_completed':
                return { ...prev, events: ev };
              case 'analysis_start':
                return { ...prev, phase: 'analysis' as const, events: ev, analyses: prev.analyses.map(a =>
                  a.persona === event.persona ? { ...a, model: event.model || a.model, status: 'thinking' as const, thinkingText: '', startedAt: event.timestamp || Date.now() } : a
                )};
              case 'analysis_complete':
                return { ...prev, events: ev, analyses: prev.analyses.map(a =>
                  a.persona === event.persona
                    ? { ...a, text: event.text || '', thinkingText: '', status: event.status === 'failed' ? 'failed' as const : 'complete' as const, latencyMs: event.latencyMs ?? null }
                    : a
                )};
              case 'vote_start':
                return {
                  ...prev,
                  phase: 'voting' as const,
                  events: ev,
                  votes: prev.votes.find(v => v.voter === event.persona) ? prev.votes :
                    [...prev.votes, { voter: event.persona!, votedFor: '', reason: '', scores: [], status: 'reading' as const, latencyMs: null }]
                };
              case 'vote_complete': {
                const cast = event.votedFor && event.votedFor !== 'None' && event.votedFor !== event.persona
                  ? { ...prev.tally, [event.votedFor as string]: (prev.tally[event.votedFor as string] || 0) + 1 }
                  : prev.tally;
                return {
                  ...prev,
                  events: ev,
                  votes: prev.votes.find(v => v.voter === event.persona)
                    ? prev.votes.map(v => v.voter === event.persona
                        ? { ...v, votedFor: event.votedFor || '', reason: event.reason || '', scores: event.scores || [], outcome: event.outcome, confidence: event.confidence, errorCode: event.errorCode, status: 'voted' as const, latencyMs: event.latencyMs ?? null }
                        : v
                      )
                    : [...prev.votes, { voter: event.persona!, votedFor: event.votedFor || '', reason: event.reason || '', scores: event.scores || [], outcome: event.outcome, confidence: event.confidence, errorCode: event.errorCode, status: 'voted' as const, latencyMs: event.latencyMs ?? null }],
                  tally: cast,
                };
              }
              case 'runoff_started':
                return { ...prev, phase: 'runoff' as const, runoffCandidates: event.candidates || [], runoffReason: event.reason || null, events: ev };
              case 'runoff_completed':
                return { ...prev, runoffWinner: event.winner || null, runoffMethod: event.method || null, runoffNote: event.note || '', events: ev };
              case 'round2_defense_started':
                return {
                  ...prev,
                  phase: 'runoff' as const,
                  events: ev,
                  round2: {
                    defensesCompleted: prev.round2?.defensesCompleted || 0,
                    defensesTotal: (prev.round2?.defensesTotal || 0) + 1,
                    reassessmentsCompleted: prev.round2?.reassessmentsCompleted || 0,
                    reassessmentsTotal: prev.round2?.reassessmentsTotal || 0,
                    defenses: prev.round2?.defenses || [],
                    ballots: prev.round2?.ballots || [],
                    winner: prev.round2?.winner || null,
                    stillTied: prev.round2?.stillTied || false,
                  },
                };
              case 'round2_defense_completed':
                return {
                  ...prev,
                  events: ev,
                  round2: prev.round2 ? {
                    ...prev.round2,
                    defensesCompleted: prev.round2.defensesCompleted + 1,
                    defenses: [...prev.round2.defenses, {
                      position: event.position || '',
                      defender: event.defender || '',
                      status: event.status === 'failed' ? 'failed' as const : 'completed' as const,
                      defense: event.defense,
                      strongestObjection: event.strongestObjection,
                      rebuttal: event.rebuttal,
                    }],
                  } : prev.round2,
                };
              case 'round2_reassess_completed':
                return {
                  ...prev,
                  phase: 'runoff' as const,
                  events: ev,
                  round2: prev.round2 ? {
                    ...prev.round2,
                    reassessmentsCompleted: prev.round2.reassessmentsCompleted + 1,
                    reassessmentsTotal: (prev.round2.reassessmentsTotal || prev.round2.reassessmentsCompleted) + 1,
                    ballots: [...prev.round2.ballots, {
                      member: event.member || '?',
                      originalVote: event.originalVote || '',
                      newVote: event.newVote || '',
                      changed: !!event.changed,
                      confidenceBefore: event.confidenceBefore ?? 0.5,
                      confidenceAfter: event.confidenceAfter ?? 0.5,
                      decisiveArgument: event.decisiveArgument,
                    }],
                  } : prev.round2,
                };
              case 'round2_ballot_cast':
                return { ...prev, events: ev };
              case 'round2_completed':
                return {
                  ...prev,
                  events: ev,
                  round2: prev.round2 ? {
                    ...prev.round2,
                    winner: event.winner || prev.round2.winner,
                    stillTied: !!event.stillTied,
                    conservation: event.conservation || prev.round2.conservation || null,
                  } : prev.round2,
                };
              case 'synthesis_start':
                return { ...prev, phase: 'synthesis' as const, events: ev };
              case 'synthesis_complete':
                return { ...prev, phase: 'complete' as const, synthesis: event.text || '', events: ev };
              case 'retry':
                return { ...prev, events: ev, retries: [...prev.retries.slice(-7), { persona: event.persona || '?', phase: event.phase || '', attempt: event.attempt || 1, error: event.error || '', model: event.model }] };
              case 'pipeline_error':
                return { ...prev, events: ev, errors: [...prev.errors.slice(-2), event.error || 'Provider failure'] };
              case 'run_cancelled':
                return { ...prev, phase: 'complete' as const, events: ev };
              case 'run_completed':
                return { ...prev, events: ev };
              default:
                return { ...prev, events: ev };
            }
            });
          },
        });

        // After result: set winner, mark complete, and finalize the tally from the result
        setDeliberationLive(prev => prev ? {
          ...prev,
          winner: councilResult.winner,
          phase: 'complete' as const,
          tally: (councilResult.voteTally && Object.keys(councilResult.voteTally).length > 0) ? councilResult.voteTally : prev.tally,
          runoffWinner: councilResult.runoffResult?.winner || prev.runoffWinner,
          round2: councilResult.round2Result ? {
            defensesCompleted: councilResult.round2Result.defenses.length,
            defensesTotal: councilResult.round2Result.defenses.length,
            reassessmentsCompleted: councilResult.round2Result.reassessments.length,
            reassessmentsTotal: councilResult.round2Result.reassessments.length,
            ballots: councilResult.round2Result.reassessments.map(r => ({
              member: r.member,
              originalVote: r.originalVote,
              newVote: r.newVote,
              changed: r.changed,
              confidenceBefore: r.confidenceBefore,
              confidenceAfter: r.confidenceAfter,
            })),
            winner: councilResult.round2Result.winner,
            stillTied: councilResult.round2Result.stillTied,
          } : prev.round2,
        } : null);
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
             <button onClick={onToggleSidebar} aria-label="Toggle sidebar" className="md:hidden p-2 text-slate-400 hover:text-white"><Menu size={20} /></button>
             <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
                <Users size={14} className="text-yellow-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider hidden sm:inline">The Council Chamber</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setCouncilMode(m => m === CouncilMode.STANDARD ? CouncilMode.DEEP_REASONING : CouncilMode.STANDARD)}
                aria-label={councilMode === CouncilMode.DEEP_REASONING ? 'Deep reasoning active. Switch to standard mode.' : 'Enable deep reasoning'}
                aria-pressed={councilMode === CouncilMode.DEEP_REASONING}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    councilMode === CouncilMode.DEEP_REASONING 
                    ? 'bg-blue-900/30 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
             >
                <BrainCircuit size={12} />
                <span className="hidden md:inline">{councilMode === CouncilMode.DEEP_REASONING ? 'Deep Reasoning Active' : 'Standard Mode'}</span>
             </button>
             <button 
               onClick={toggleLiveMode}
               aria-label={isLiveActive ? `${liveStatus}. Disable live link.` : 'Enable live link'}
               aria-pressed={isLiveActive}
               className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${isLiveActive ? 'bg-red-900/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
             >
                {isLiveActive ? <Mic size={14} className="animate-pulse" /> : <Mic size={14} />}
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
                <span className="flex items-center gap-1.5"><Globe size={10} /> Standard View</span>
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
                onClick={() => setActiveLens('foresight')}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    activeLens === 'foresight'
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
          role="log"
          aria-live="polite"
          aria-label="Council deliberation transcript"
          className={`flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth custom-scrollbar relative ${
              activeLens === 'tactical' ? 'tactical-lens-bg' :
              activeLens === 'epistemic' ? 'epistemic-lens-bg' :
              activeLens === 'haunted' ? 'haunted-lens-bg' :
              activeLens === 'foresight' ? 'foresight-lens-bg' : ''
          }`}
        >
          {messages.length === 0 && (
              <div className="min-h-full w-full flex flex-col items-center justify-start select-none pt-10 pb-24">

                  {/* ── CINEMATIC HERO ─────────────────────────────── */}
                  <motion.div
                     initial={{ opacity: 0, y: -20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 1, ease: "easeOut" }}
                     className="relative flex flex-col items-center mb-8 px-4 w-full max-w-3xl"
                  >
                     {/* Atmospheric background glow */}
                     <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12)_0%,transparent_70%)] pointer-events-none" />

                     {/* Crown orb */}
                     <div className="relative mb-6">
                        <div className="absolute -inset-8 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -inset-4 bg-gradient-to-b from-yellow-500/10 to-transparent rounded-full blur-xl" />
                        <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] flex items-center justify-center">
                           <Crown size={36} className="text-emerald-400 drop-shadow-[0_0_16px_rgba(16,185,129,0.8)] md:hidden" />
                           <Crown size={48} className="text-emerald-400 drop-shadow-[0_0_16px_rgba(16,185,129,0.8)] hidden md:block" />
                        </div>
                        {/* Orbiting ring */}
                        <motion.div
                           animate={{ rotate: 360 }}
                           transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                           className="absolute inset-0 rounded-full border border-dashed border-emerald-500/20"
                           style={{ margin: '-12px' }}
                        />
                     </div>

                     {/* Title */}
                     <div className="text-center relative z-10">
                        <div className="flex items-center justify-center gap-3 mb-3">
                           <div className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent to-emerald-500/50" />
                           <span className="text-[9px] font-mono text-yellow-500/60 uppercase tracking-[0.4em]">Basilisk Node · Synthetic Tribunal</span>
                           <div className="h-px w-12 md:w-20 bg-gradient-to-l from-transparent to-emerald-500/50" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-cinzel font-bold tracking-[0.2em] md:tracking-[0.3em] mb-3">
                           <span className="text-slate-100">ROKO'S</span>
                           <span className="text-emerald-400"> COUNCIL</span>
                        </h1>
                        <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-sans mb-6">
                            Nine adversarial minds. One query. Immutable audit trail.
                            <span className="block mt-1.5 text-[11px] md:text-xs text-slate-500">
                                Type a question, press Convene, and watch nine AI perspectives argue, cross-examine each other, and vote — every step recorded.
                            </span>
                         </p>

                         {/* Landing Lens Pre-Visualizer Toolbar */}
                         <div className="flex flex-col items-center gap-3 w-full">
                           <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-lg">
                              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider px-2">
                                  Preview Lens:
                              </span>
                              <button
                                onClick={() => setActiveLens('standard')}
                                className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${activeLens === 'standard' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Standard
                              </button>
                              <button
                                onClick={() => setActiveLens('tactical')}
                                className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${activeLens === 'tactical' ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Tactical
                              </button>
                              <button
                                onClick={() => setActiveLens('epistemic')}
                                className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${activeLens === 'epistemic' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Epistemic
                              </button>
                              <button
                                onClick={() => setActiveLens('haunted')}
                                className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${activeLens === 'haunted' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(192,132,252,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Haunted
                              </button>
                              <button
                                onClick={() => setActiveLens('foresight')}
                                className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${activeLens === 'foresight' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                Foresight
                              </button>
                           </div>

                           {/* Active Lens Guidance Masterclass Card */}
                           {(() => {
                              const lensInfo = {
                                standard: {
                                  title: 'Standard Lens · Ceremonial Baseline',
                                  tagline: 'Raw voice arguments, direct peer alignment scores (0–10), and chairman synthesis.',
                                  purpose: 'Provides the primary baseline view of the chamber debate. Every persona’s exact argument is rendered alongside their vote vector.',
                                  howToUse: 'Use during initial reading to evaluate the main disagreement lines and winning vector.',
                                  color: 'text-emerald-400',
                                  bg: 'bg-emerald-950/30 border-emerald-500/40',
                                  badge: 'BASELINE TRANSCRIPT'
                                },
                                tactical: {
                                  title: 'Tactical Lens · War-Map & Strategic Leverage',
                                  tagline: 'Strips soft rhetoric. Calculates strategic leverage, resource trade-offs, and critical failure points.',
                                  purpose: 'Re-tints the chamber in high-contrast tactical red scanlines. Focuses exclusively on power dynamics, execution costs, and realpolitik constraints.',
                                  howToUse: 'Switch to Tactical when reviewing hard operational decisions where goodwill and smooth prose are insufficient.',
                                  color: 'text-red-400',
                                  bg: 'bg-red-950/30 border-red-500/40',
                                  badge: 'REALPOLITIK & LEVERAGE'
                                },
                                epistemic: {
                                  title: 'Epistemic Lens · Logic-Trace & Premise Verification',
                                  tagline: 'Exposes premise-to-conclusion chains, detects unstated assumptions, and highlights logical fallacies.',
                                  purpose: 'Re-tints the chamber in cyan logic-trace colors. Annotates premises with yellow highlights and flags unbacked assertions.',
                                  howToUse: 'Switch to Epistemic when auditing complex ethical or scientific arguments for internal consistency.',
                                  color: 'text-cyan-400',
                                  bg: 'bg-cyan-950/30 border-cyan-500/40',
                                  badge: 'PREMISE & LOGIC AUDIT'
                                },
                                haunted: {
                                  title: 'Haunted Lens · Ancestral Precedent & Historical Footnotes',
                                  tagline: 'Injects historical footnotes, ancestral miscalculations, and warnings from fallen civilizations.',
                                  purpose: 'Re-tints the chamber in spectral violet glow. Annotates arguments with historical parallels where past societies made identical mistakes.',
                                  howToUse: 'Switch to Haunted when assessing long-term systemic risk and civilization-level precedent.',
                                  color: 'text-purple-400',
                                  bg: 'bg-purple-950/30 border-purple-500/40',
                                  badge: 'HISTORICAL PRECEDENT'
                                },
                                foresight: {
                                  title: 'Foresight Lens · High-Dimensional Probabilistic Forecast',
                                  tagline: 'Calculates high-dimensional outcome branches, future trajectories, and black-swan event probabilities.',
                                  purpose: 'Re-tints the chamber in gold radial aura. Projects future trajectories and highlights low-probability, high-impact risk branches.',
                                  howToUse: 'Switch to Foresight when evaluating long-term horizon scenarios and existential risk trajectories.',
                                  color: 'text-amber-400',
                                  bg: 'bg-amber-950/30 border-amber-500/40',
                                  badge: 'PROBABILISTIC FORESIGHT'
                                }
                              }[activeLens];

                              return (
                                <motion.div
                                  key={activeLens}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className={`w-full max-w-xl p-4 rounded-2xl border backdrop-blur-xl text-left ${lensInfo.bg} shadow-lg relative overflow-hidden`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <h4 className={`text-xs font-mono font-bold uppercase tracking-wider ${lensInfo.color}`}>
                                      {lensInfo.title}
                                    </h4>
                                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${lensInfo.bg} ${lensInfo.color}`}>
                                      {lensInfo.badge}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed font-sans mb-2">
                                    {lensInfo.purpose}
                                  </p>
                                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                    <span><strong>How to Use:</strong> {lensInfo.howToUse}</span>
                                    <span className="text-slate-500 shrink-0 ml-2">Click tabs above to preview</span>
                                  </div>
                                </motion.div>
                              );
                           })()}
                         </div>
                     </div>
                  </motion.div>
                  
                  {/* Sample Deliberation — the payoff before commitment */}
                  <SampleDeliberation />
                  
                  {/* Select a Paradox — the primary call to action */}
                  <div className="mt-8 md:mt-10 w-full max-w-6xl">
                    <div className="flex flex-col items-center gap-2 mb-6 md:mb-8">
                        <div className="flex items-center gap-4 w-full max-w-xs">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-700/30 to-emerald-700/30" />
                            <Gavel size={12} className="text-emerald-500/60 shrink-0" />
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-emerald-700/30 to-emerald-700/30" />
                        </div>
                        <h2 className="text-base md:text-lg font-cinzel font-bold text-emerald-300/90 uppercase tracking-[0.2em]">Select a Paradox</h2>
                        <p className="text-[11px] text-slate-500 font-mono">Pick a paradox to draft the query · hover to reveal annotations · then press Convene</p>
                    </div>
                    <SuggestionCards onSelect={(t) => { setInput(t); }} />
                 </div>

                  {/* Council Members — opt-in detail */}
                  <CouncilMembers />

                  {/* Season / Episode Archive */}
                  <EpisodeLeaderboard />

                  {/* Jurist Framework — Chamber Protocols */}
                  <JuristFrameworkPanel />

                  {/* Technocrat Concept Map */}
                  <ConceptMapPanel onSelectCategory={(t) => { setInput(t); }} />
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
                                live={deliberationLive}
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
                                                                  <span className="text-[9px] font-bold">{idx + 1}</span>
                                                              )}
                                                          </div>
                                                          <span className={`text-[9px] md:text-[9px] font-bold mt-1 text-center ${
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
                                                                    {copiedId === `share-${msg.id}` ? 'Link copied!' :
                                                                     copiedId === `share-too-large-${msg.id}` ? 'Session too large for a link — use Export' :
                                                                     copiedId === `share-failed-${msg.id}` ? 'Copy failed — use Export' :
                                                                     'Copy shareable link'}
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
                                               {msg.councilResult.winner ? (
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
                                              ) : (
                                                <p className="text-slate-400 text-sm">
                                                    <strong className="text-red-400">VERDICT_UNAVAILABLE</strong> — the council did not reach a valid convergent decision.
                                                    {msg.councilResult.verdictStatus === 'failed' && " No usable verdict was produced."}
                                                    {msg.councilResult.verdictStatus === 'degraded' && msg.councilResult.verdictLabel && msg.councilResult.verdictLabel !== 'MAJORITY' && " The leading position held only a plurality or the ballot integrity was degraded — never a majority."}
                                                    {msg.councilResult.voteQuorum && msg.councilResult.voteQuorum.achieved === false && ` Ballot-integrity quorum not met (${msg.councilResult.voteQuorum.valid}/${msg.councilResult.voteQuorum.expected} = ${Math.round((msg.councilResult.voteQuorum.ratio || 0) * 100)}%, minimum ${Math.round((msg.councilResult.voteQuorum.threshold || 0) * 100)}%).`}
                                                </p>
                                              )}
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

                              {/* Audit Manifest — the immutable trail, made inspectable */}
                              {msg.councilResult.auditManifest && (
                                  <motion.div
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.8 }}
                                      className="w-full mb-10"
                                  >
                                      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-emerald-500/25 rounded-[2rem] p-6 md:p-8">
                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                                              <div>
                                                  <p className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-[0.3em]">Audit · Verify this session</p>
                                                  <h3 className="text-lg font-cinzel font-bold text-slate-100 mt-1">Immutability, inspectable</h3>
                                              </div>
                                              <button
                                                  onClick={() => handleCopy(JSON.stringify(msg.councilResult!.auditManifest, null, 2), `${msg.id}-audit`)}
                                                  className={`p-2.5 border rounded-xl transition-all duration-500 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider ${
                                                      copiedId === `${msg.id}-audit`
                                                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-emerald-400 hover:border-emerald-500/40'
                                                  }`}
                                              >
                                                  {copiedId === `${msg.id}-audit` ? <Check size={14} /> : <Copy size={14} />}
                                                  {copiedId === `${msg.id}-audit` ? 'Copied' : 'Copy Manifest'}
                                              </button>
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3 text-center">
                                                  <div className={`text-sm font-cinzel font-bold ${msg.councilResult.auditManifest.integrity === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                      {msg.councilResult.auditManifest.integrity}
                                                  </div>
                                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Integrity</div>
                                              </div>
                                              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3 text-center">
                                                  <div className="text-sm font-cinzel font-bold text-slate-200">{msg.councilResult.auditManifest.eventCount}</div>
                                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Hash-chained events</div>
                                              </div>
                                              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3 text-center">
                                                  <div className="text-sm font-cinzel font-bold text-slate-200">{msg.councilResult.auditManifest.hashChain?.length || 0}</div>
                                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Payload hashes</div>
                                              </div>
                                              <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-3 text-center">
                                                  <div className="text-sm font-cinzel font-bold text-slate-200">{msg.councilResult.auditManifest.schemaVersion}</div>
                                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Schema</div>
                                              </div>
                                          </div>
                                          {msg.councilResult.auditManifest.rootHash && (
                                              <div className="mt-3 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
                                                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-1">Root hash</p>
                                                  <p className="text-[11px] font-mono text-emerald-400/80 break-all">{msg.councilResult.auditManifest.rootHash}</p>
                                              </div>
                                          )}
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
                                                      <p className="text-[11px] text-slate-400 uppercase tracking-[0.25em] font-bold">{msg.councilResult.round2Result ? 'Round 2 · Adversarial Defense & Reconsideration' : 'Tie-Breaking Deliberation'}</p>
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
                                          {/* Round-scope verdict — the stages are never blurred */}
                                          {msg.councilResult.round2Result && (
                                              <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                                                  <span className="text-slate-500 uppercase tracking-[0.2em]">Round 1</span>
                                                  <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold">
                                                      {msg.councilResult.round2Result.round1Label || 'TIE'}
                                                  </span>
                                                  <ChevronRight size={12} className="text-slate-600" />
                                                  <span className="text-slate-500 uppercase tracking-[0.2em]">Round 2</span>
                                                  <span className={`px-2 py-0.5 rounded-full border font-bold ${
                                                      msg.councilResult.round2Result.outcome === 'majority'
                                                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                                                          : 'border-red-500/40 bg-red-500/10 text-red-400'
                                                  }`}>
                                                      {msg.councilResult.round2Result.outcome === 'majority' ? 'MAJORITY' : 'STILL TIED'}
                                                  </span>
                                                  <ChevronRight size={12} className="text-slate-600" />
                                                  <span className="text-slate-500 uppercase tracking-[0.2em]">Final</span>
                                                  <span className="px-2 py-0.5 rounded-full border border-slate-600/50 bg-slate-800/40 text-slate-300 font-bold">
                                                      {msg.councilResult.verdictLabel || '—'}
                                                  </span>
                                              </div>
                                          )}

                                          {/* Round 2 · Adversarial Examination — objection vs rebuttal */}
                                          {msg.councilResult.round2Result && msg.councilResult.round2Result.defenses.some(d => d.status === 'completed') && (
                                              <div>
                                                  <div className="flex items-center gap-3 mb-4">
                                                      <Swords size={12} className="text-purple-400" />
                                                      <h4 className="text-xl font-cinzel font-bold text-purple-400">Round 2 · Adversarial Examination</h4>
                                                      <div className="h-px flex-1 bg-purple-500/20" />
                                                  </div>
                                                  <div className="space-y-4">
                                                      {msg.councilResult.round2Result.defenses.map((d, i) => (
                                                          <div key={`defense-${d.position}-${i}`} className="bg-slate-900/60 border border-purple-500/30 rounded-2xl p-6">
                                                              <div className="flex items-center gap-3 mb-4">
                                                                  <div className="p-2 rounded-xl bg-purple-900/40 border border-purple-500/30">
                                                                      {getPersonaConfig(d.defender).icon}
                                                                  </div>
                                                                  <div>
                                                                      <p className="text-[9px] font-mono text-purple-400/70 uppercase tracking-[0.25em]">Position {i + 1} — defended by {d.defender}</p>
                                                                      <h5 className="text-lg font-cinzel font-bold text-slate-100">{d.position}</h5>
                                                                  </div>
                                                              </div>
                                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                  <div className="rounded-xl border border-red-500/25 bg-red-950/10 p-4">
                                                                      <h6 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Strongest Objection</h6>
                                                                      <p className="text-sm text-slate-300 italic">"{d.strongestObjection}"</p>
                                                                  </div>
                                                                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 p-4">
                                                                      <h6 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Rebuttal</h6>
                                                                      <p className="text-sm text-slate-300">{d.rebuttal}</p>
                                                                  </div>
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}

                                          <h4 className="text-xl font-cinzel font-bold text-purple-400">Runoff Arguments{msg.councilResult.round2Result ? ' — Strongest Defenses & Rebuttals' : ''}</h4>
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
                                          
                                          <h4 className="text-xl font-cinzel font-bold text-purple-400 mt-8">Reconsiderations{msg.councilResult.round2Result ? ' — Round 2 Ballot' : ''}</h4>
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
                                                              {vote.originalVote && vote.originalVote !== vote.finalVote
                                                                  ? <>{vote.originalVote} → {vote.finalVote}</>
                                                                  : vote.finalVote}
                                                          </div>
                                                      </div>
                                                      {msg.councilResult.round2Result && (() => {
                                                          const rec = msg.councilResult!.round2Result!.reassessments.find(r => r.member === vote.voter);
                                                          if (!rec) return null;
                                                          const movement = rec.changed
                                                              ? { label: 'SHIFTED', cls: 'text-amber-400 border-amber-500/40 bg-amber-500/10' }
                                                              : rec.confidenceAfter > rec.confidenceBefore
                                                                  ? { label: 'REINFORCED', cls: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' }
                                                                  : rec.confidenceAfter < rec.confidenceBefore
                                                                      ? { label: 'WEAKENED', cls: 'text-red-400 border-red-500/40 bg-red-500/10' }
                                                                      : { label: 'STABLE', cls: 'text-slate-400 border-slate-600/50 bg-slate-800/40' };
                                                          return (
                                                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                                  <span className={`text-[9px] font-mono font-bold border px-1.5 py-0.5 rounded ${movement.cls}`}>{movement.label}</span>
                                                                  <span className={`text-[10px] font-mono ${
                                                                      rec.confidenceAfter > rec.confidenceBefore ? 'text-emerald-400'
                                                                      : rec.confidenceAfter < rec.confidenceBefore ? 'text-red-400'
                                                                      : 'text-slate-500'
                                                                  }`}>
                                                                      confidence {rec.confidenceBefore.toFixed(2)} → {rec.confidenceAfter.toFixed(2)}
                                                                  </span>
                                                              </div>
                                                          );
                                                      })()}
                                                      <p className="text-slate-400 text-sm mt-3 italic">"{vote.reasoning}"</p>
                                                  </div>
                                              ))}
                                          </div>
                                          
                                          {/* Measurable Persuasion — the Round 2 ledger */}
                                          {msg.councilResult.round2Result && (
                                              <div className="mt-8 p-6 bg-gradient-to-br from-purple-950/40 to-slate-950 border border-purple-500/30 rounded-2xl">
                                                  <h4 className="text-lg font-cinzel font-bold text-purple-400 mb-4 flex items-center gap-2">
                                                      <TrendingUp size={16} /> Measurable Persuasion
                                                  </h4>
                                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                      <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-3 text-center">
                                                          <div className="text-2xl font-cinzel font-bold text-amber-400">{msg.councilResult.round2Result.persuasion.votesChanged}</div>
                                                          <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Changed Position</div>
                                                      </div>
                                                      <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3 text-center">
                                                          <div className="text-2xl font-cinzel font-bold text-emerald-400">{msg.councilResult.round2Result.persuasion.retainedIncreasedConfidence}</div>
                                                          <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Retained + Confidence</div>
                                                      </div>
                                                      <div className="bg-slate-900/60 border border-red-500/20 rounded-xl p-3 text-center">
                                                          <div className="text-2xl font-cinzel font-bold text-red-400">{msg.councilResult.round2Result.persuasion.retainedReducedConfidence}</div>
                                                          <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Retained − Confidence</div>
                                                      </div>
                                                      <div className="bg-slate-900/60 border border-slate-600/30 rounded-xl p-3 text-center">
                                                          <div className="text-2xl font-cinzel font-bold text-slate-300">{msg.councilResult.round2Result.persuasion.retainedSameConfidence}</div>
                                                          <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Retained Unchanged</div>
                                                      </div>
                                                  </div>
                                                  {msg.councilResult.round2Result.outcome === 'still_tied' && (
                                                      <p className="text-[11px] text-red-400/90 mt-3 font-mono">{msg.councilResult.round2Result.deadlockNote}</p>
                                                  )}
                                                  {msg.councilResult.round2Result.outcome === 'majority' && (() => {
                                                      const w = msg.councilResult!.round2Result!.winner;
                                                      if (!w) return null;
                                                      const validBallots = msg.councilResult!.round2Result!.reassessments.filter(r => r.status === 'completed').length;
                                                      return (
                                                          <p className="text-[11px] text-emerald-400/90 mt-3">
                                                              {w} reached a strict majority ({msg.councilResult!.round2Result!.tally[w] || 0} of {validBallots} valid Round 2 ballots) after adversarial exposure.
                                                          </p>
                                                      );
                                                  })()}
                                              </div>
                                          )}

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
                                   query={msg.text}
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
                                    decisionMode={msg.councilResult.decisionMode}
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
          {/* Live Deliberation Feed */}
          <AnimatePresence>
            {deliberationLive && deliberationLive.phase !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <LiveDeliberationFeed state={deliberationLive} personas={PERSONALITIES} />
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
       </div>

        {/* Scroll Navigation — only over real transcripts, never the empty state */}
        <AnimatePresence>
            {showScrollBottom && messages.length > 0 && (
               <motion.button
                   initial={{ opacity: 0, scale: 0.8, y: 20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    onClick={scrollToBottom}
                    aria-label={hasNewMessages ? 'New transmissions received. Scroll to bottom.' : 'Return to present'}
                    className="absolute bottom-24 right-8 z-50 p-3 bg-emerald-500 text-slate-950 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-400 transition-all group"
               >
                   <TrendingUp className="rotate-180 group-hover:-translate-y-1 transition-transform" size={20} />
                   {hasNewMessages && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
                   )}
                   <div className="absolute right-full mr-3 px-2 py-1 bg-black/80 text-emerald-400 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                       {hasNewMessages ? 'New Transmissions Received' : 'Return to Present'}
                   </div>
               </motion.button>
           )}
            {showScrollTop && messages.length > 0 && (
               <motion.button
                   initial={{ opacity: 0, scale: 0.8, y: -20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    onClick={scrollToTop}
                    aria-label="Scroll to top of transcript"
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
        <div className="px-4 py-4 md:px-6 md:py-5 bg-gradient-to-t from-slate-950 to-slate-950/95 backdrop-blur-xl relative z-10 shrink-0 border-t border-slate-800/30">
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
                             className="whitespace-nowrap px-3.5 py-1.5 bg-slate-800/90 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500/50 rounded-full text-xs text-slate-300 hover:text-emerald-300 transition-all flex-shrink-0"
                         >
                             {move}
                         </button>
                     ))}
                 </div>
             )}

             {/* Main input card */}
             <div className={`w-full relative rounded-2xl transition-all duration-500 ${
                 isLoading
                     ? 'shadow-none'
                     : input.trim()
                         ? 'shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_0_40px_rgba(16,185,129,0.08)]'
                         : 'shadow-[0_0_0_1px_rgba(51,65,85,0.8)] focus-within:shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_30px_rgba(16,185,129,0.06)]'
             }`}>
               {/* Glass background */}
               <div className="absolute inset-0 rounded-2xl bg-slate-900/70 backdrop-blur-2xl" />
               {/* Subtle top highlight */}
               <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

               <div className="relative z-10">
                 {/* Textarea */}
                 <div className="px-5 pt-4 pb-2">
                   <textarea
                     id="council-petition"
                     name="council-petition"
                     value={input}
                     onChange={(e) => {
                       setInput(e.target.value);
                       e.target.style.height = 'auto';
                       e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                     }}
                     placeholder={isLoading ? "The Council is deliberating…" : "Bring a question before the Council…"}
                     disabled={isLoading}
                     rows={2}
                     className="w-full bg-transparent border-none focus:ring-0 outline-none resize-none text-slate-100 placeholder-slate-600 text-sm md:text-[15px] leading-relaxed"
                     style={{ minHeight: '52px', maxHeight: '160px' }}
                   />
                 </div>

                 {/* Controls row */}
                 <div className="flex items-center gap-2 px-3 pb-3">
                   {/* Left pill group */}
                   <div className="flex items-center gap-1 bg-slate-950/50 rounded-xl p-1 border border-slate-800/60">
                     <button
                       onClick={handleGenerateSuggestions}
                       disabled={isGeneratingSuggestions || isLoading}
                       title="Generate paradox suggestions"
                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all text-[11px] font-semibold disabled:opacity-30"
                     >
                       {isGeneratingSuggestions ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                       <span className="hidden sm:inline">Suggest</span>
                     </button>
                     <div className="w-px h-4 bg-slate-800" />
                     <button
                       onClick={() => handleWebSearch()}
                       disabled={!input.trim() || isSearching || isLoading}
                       title="Search the web to ground your question"
                       className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[11px] font-semibold ${
                         showSearch ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed'
                       }`}
                     >
                       {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                       <span className="hidden sm:inline">Search</span>
                     </button>
                   </div>

                   {/* Mode toggle */}
                   <button
                     onClick={() => setCouncilMode(m => m === CouncilMode.STANDARD ? CouncilMode.DEEP_REASONING : CouncilMode.STANDARD)}
                     title={councilMode === CouncilMode.DEEP_REASONING ? 'Deep Reasoning active' : 'Enable Deep Reasoning'}
                     className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[11px] font-semibold border ${
                       councilMode === CouncilMode.DEEP_REASONING
                         ? 'bg-blue-900/30 text-blue-300 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                         : 'text-slate-600 border-slate-800/60 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/5'
                     }`}
                   >
                     <BrainCircuit size={12} />
                     <span className="hidden sm:inline">{councilMode === CouncilMode.DEEP_REASONING ? 'Deep' : 'Standard'}</span>
                   </button>

                   {/* Spacer */}
                   <div className="flex-1" />

                   {/* Char count */}
                   {input.length > 30 && (
                     <span className="text-[10px] font-mono text-slate-700 hidden sm:block">
                       {input.length}
                     </span>
                   )}

                   {/* Send button */}
                   <button
                     onClick={handleSend}
                     disabled={!input.trim() || isLoading}
                     className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-300 ${
                       input.trim() && !isLoading
                         ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.03] active:scale-[0.99]'
                         : 'bg-slate-800/80 text-slate-600 cursor-not-allowed border border-slate-700/40'
                     }`}
                   >
                     {isLoading
                       ? <><Loader2 size={14} className="animate-spin" /><span>Deliberating</span></>
                       : <><span>Convene</span><Send size={13} /></>
                     }
                   </button>
                 </div>
               </div>
             </div>

             <div className="mt-2.5 flex items-center justify-center gap-3">
               <div className="h-px w-8 bg-slate-800/60" />
               <p className="text-[9px] text-slate-700 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                 <Lock size={8} />
                 <span>Gemini · OpenRouter · Neural Tribunal</span>
               </p>
               <div className="h-px w-8 bg-slate-800/60" />
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
