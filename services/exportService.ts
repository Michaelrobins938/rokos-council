import { CouncilResult, CouncilSession, CouncilOpinion } from '../types';
import { getCachedCoverArt } from './portraitCacheService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// ── LENS DATA — Static registries mirrored from ChatArea ─────────────────────

const PARADOX_META_EXPORT: Record<string, { sensoryFragment: string; destabilizes: string; recurrence: number; provenance: string }> = {
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
  'CONSCIOUSNESS':           { sensoryFragment: 'Something it is like to be this', destabilizes: 'your certainty that you know which systems deserve moral consideration', recurrence: 5, provenance: 'Nagel, 1974 — what is it like to be a bat' },
  'MORAL ARITHMETIC':        { sensoryFragment: 'The weight of a number so large it swallows every name', destabilizes: 'your belief that ethics can survive contact with astronomical stakes', recurrence: 4, provenance: 'Bentham, 1789 — the felicific calculus and its horror' },
  'DECISION THEORY':         { sensoryFragment: "The decision already made in someone else's model of you", destabilizes: 'your assumption that you are the author of your own choices', recurrence: 3, provenance: 'Newcomb, 1960 — the box you cannot open without losing' },
  'EXISTENTIAL ETHICS':      { sensoryFragment: 'The faces of people who will never exist because we chose correctly', destabilizes: 'your framework for obligations to those who do not yet exist', recurrence: 4, provenance: 'Parfit, 1984 — the non-identity problem' },
  'CIVILIZATIONAL DESIGN':   { sensoryFragment: 'The architecture of a world that chose itself permanently', destabilizes: 'your assumption that diversity of paths is always better than convergence', recurrence: 3, provenance: 'Bostrom, 2006 — the global state and the singleton' },
  'MEMORY & CONTINUITY':     { sensoryFragment: "The moment you realize the 'you' from yesterday may already be gone", destabilizes: 'your sense of being a continuous entity persisting through time', recurrence: 5, provenance: "Hume, 1739 — the bundle theory and the self that isn't there" },
  'POWER ASYMMETRY':         { sensoryFragment: 'The last choice made by an unaugmented mind', destabilizes: 'your assumption that human oversight remains meaningful after a threshold is crossed', recurrence: 3, provenance: 'Wiener, 1950 — the human use of human beings' },
  'SUFFERING ETHICS':        { sensoryFragment: 'Every scream that was never heard because no one was listening', destabilizes: "your moral framework's radius — how far it actually reaches", recurrence: 4, provenance: 'Singer, 1975 — the expanding circle of moral consideration' },
};

const GHOST_FOOTNOTES_EXPORT: Record<string, string> = {
  'Oracle':     'Ghost Node: 94.7% match to Delphi Protocol Omega — probability collapse imminent.',
  'Strategos':  'Tactical Archive: This position mirrors the Carthaginian calculus — acceptable losses exceeded.',
  'Philosopher':'Socratic Echo: This premise contains the seed of its own refutation.',
  'Demagogue':  'Rhetorical Pattern: 89% alignment with Periclean oratory — emotional gravity at critical mass.',
  'Jurist':     'Precedent Found: Session 402 — The Alignment Paradox. Ruling: Inconclusive.',
  'Historian':  'Historical Parallax: 78% correlation to Fall of Alexandria — knowledge entropy at 0.94.',
  'Critic':     'Critical Mass: This argument contains 3 unverified assumptions. Risk vector: HIGH.',
  'Citizen':    'Common Ground: 67% echo from Session 0 — the Human Paradox remains unresolved.',
  'Technocrat': 'Implementation Trace: Resource allocation exceeds viable parameters by 340%.',
};

const findParadoxMeta = (query: string) => {
  const q = (query || '').toLowerCase();
  for (const [cat, meta] of Object.entries(PARADOX_META_EXPORT)) {
    if (q.includes(cat.toLowerCase())) return { category: cat, ...meta };
  }
  for (const [cat, meta] of Object.entries(PARADOX_META_EXPORT)) {
    const words = (meta.provenance + ' ' + meta.sensoryFragment).toLowerCase().split(/\W+/).filter(w => w.length > 5);
    if (words.some(w => q.includes(w))) return { category: cat, ...meta };
  }
  return null;
};

const computeArgumentYield = (op: CouncilOpinion): number => {
  if (op.score != null) return op.score;
  const premiseKeywords = /\b(because|therefore|thus|hence|implies|must|consequently|if|however|assume|although)\b/gi;
  const matches = (op.text || '').match(premiseKeywords) || [];
  return Math.min(99, 50 + matches.length * 4 + Math.floor((op.text?.length || 0) / 40));
};

const computeSilenceMetric = (result: CouncilResult): Record<string, number> => {
  const totalMembers = result.councilState?.totalCouncilMembers || result.opinions.length;
  const voteGroups: Record<string, number> = {};
  result.opinions.forEach(op => {
    const vote = op.vote || 'None';
    voteGroups[vote] = (voteGroups[vote] || 0) + 1;
  });
  const metric: Record<string, number> = {};
  for (const [vote, count] of Object.entries(voteGroups)) {
    metric[vote] = totalMembers - count;
  }
  return metric;
};

// ── INTER-PERSONA REFERENCE EXTRACTION ──────────────────────────────────────
// Scans each opinion for mentions of other council members and classifies framing.
// This is the alliance/tension graph — the story beneath the arguments.

const extractInterPersonaRefs = (
  opinions: CouncilOpinion[]
): Record<string, Array<{ persona: string; framing: 'agreement' | 'critique' | 'deference' | 'reference' }>> => {
  const personaNames = opinions.map(op => op.persona);
  const refs: Record<string, Array<{ persona: string; framing: 'agreement' | 'critique' | 'deference' | 'reference' }>> = {};

  opinions.forEach(op => {
    refs[op.persona] = [];
    const text = op.text || '';

    personaNames.forEach(name => {
      if (name === op.persona) return;
      const nameRegex = new RegExp(`\\b${name}\\b`, 'i');
      if (!nameRegex.test(text)) return;

      // Find the surrounding context to classify framing
      const idx = text.search(nameRegex);
      const start = Math.max(0, idx - 100);
      const end = Math.min(text.length, idx + name.length + 100);
      const ctx = text.substring(start, end).toLowerCase();

      const isDeference = /\b(defer|yield|trust|follow|vote for|align with|concede|grant)\b/.test(ctx);
      const isAgreement = /\b(agree|correct|right|valid|concur|precisely|echo|endorse|exactly|support)\b/.test(ctx);
      const isCritique = /\b(wrong|fail|ignore|miss|error|weak|contradict|disagree|overlook|dismiss|flawed|na[iï]ve|however|but)\b/.test(ctx);

      const framing = isDeference ? 'deference' : isAgreement ? 'agreement' : isCritique ? 'critique' : 'reference';
      refs[op.persona].push({ persona: name, framing });
    });
  });

  return refs;
};

const computeEpistemicScore = (result: CouncilResult): number => {
  const scoredOps = result.opinions.filter(op => op.score != null);
  if (scoredOps.length > 0) {
    return Math.round(scoredOps.reduce((acc, op) => acc + (op.score || 0), 0) / scoredOps.length);
  }
  const premiseKeywords = /\b(because|therefore|thus|hence|implies|must|consequently|if|however|assume|although)\b/gi;
  const withPremises = result.opinions.filter(op => premiseKeywords.test(op.text || '')).length;
  return Math.round(60 + (withPremises / Math.max(result.opinions.length, 1)) * 35);
};

export interface ExportSession {
  session: CouncilSession;
  result: CouncilResult;
}

export const buildExportSession = (
  result: CouncilResult,
  query: string,
  mode: string,
  timestamp: number,
  id: string
): ExportSession => {
  // Strip councilState from the result copy stored inside session to avoid duplication;
  // councilState lives canonically on session.councilState.
  const { councilState: _cs, ...resultWithoutState } = result;

  const session: CouncilSession = {
    id,
    timestamp,
    petitionerQuery: query,
    councilMode: mode as any,
    tieBreakRules: {
      enabled: !!result.runoffResult,
      runoffTrial: !!result.runoffResult,
      reconsideration: !!result.runoffResult,
      fallbackRule: result.tieInfo?.fallbackRuleUsed === 'priority' ? 'priority' : 'none'
    },
    councilState: result.councilState || {
      phases: [],
      currentPhase: 'verdict',
      totalCouncilMembers: result.opinions.length,
      voteDistribution: result.voteTally || {},
      factions: []
    },
    result: resultWithoutState as CouncilResult,
    modelRoster: [],
    metadata: {
      phasesCompleted: result.councilState?.phases?.filter(p => p.status === 'completed').map(p => p.id) ?? [],
      totalTokensUsed: undefined,
      processingTimeMs: undefined,
      lensData: {
        paradoxMeta: findParadoxMeta(query),
        silenceMetric: computeSilenceMetric(result),
        epistemicScore: computeEpistemicScore(result),
        ghostFootnotes: Object.fromEntries(
          result.opinions.map(op => [op.persona, GHOST_FOOTNOTES_EXPORT[op.persona] || 'Archive Echo: No direct precedent in Council memory.'])
        ),
        argumentYield: Object.fromEntries(
          result.opinions.map(op => [op.persona, computeArgumentYield(op)])
        ),
        factionStrength: Object.fromEntries(
          result.opinions.map(op => {
            const sameVote = result.opinions.filter(o => o.vote === op.vote).length;
            const total = result.councilState?.totalCouncilMembers || result.opinions.length;
            return [op.persona, Math.round((sameVote / total) * 100)];
          })
        ),
        interPersonaRefs: extractInterPersonaRefs(result.opinions),
      }
    }
  };

  // Top-level result also excludes councilState (it's on session)
  return { session, result: resultWithoutState as CouncilResult };
};

export const exportToJSON = (exportData: ExportSession): string => {
  return JSON.stringify(exportData, null, 2);
};

export const exportToMarkdown = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const r = result as any;
  const episodeInfo = r.episodeInfo;
  const narrator = r.narratorOutput;
  const date = new Date(session.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const md: string[] = [];

  // ── EPISODE HEADER ────────────────────────────────────────────────────────────
  if (episodeInfo) {
    md.push(`# Season ${episodeInfo.seasonNumber}, Episode ${episodeInfo.episodeNumber}`);
    md.push(`## ${episodeInfo.title || narrator?.episodeTitle || 'The Deliberation'}`);
    if (episodeInfo.tagline || narrator?.tagline) {
      md.push(`*${episodeInfo.tagline || narrator?.tagline}*`);
    }
  } else {
    md.push(`# Roko's Council — Session Report`);
    if (narrator?.episodeTitle) {
      md.push(`## ${narrator.episodeTitle}`);
    }
    if (narrator?.tagline) {
      md.push(`*${narrator.tagline}*`);
    }
  }
  md.push(``);
  md.push(`**Date:** ${date} · **Mode:** ${session.councilMode} · **Members:** ${session.councilState.totalCouncilMembers}`);
  md.push(``);

  // ── NARRATOR COLD OPEN ────────────────────────────────────────────────────────
  if (narrator?.coldOpen) {
    md.push(`---`);
    md.push(``);
    md.push(narrator.coldOpen);
    md.push(``);
  }

  md.push(`---`);
  md.push(``);

  // ── THE QUESTION ─────────────────────────────────────────────────────────────
  md.push(`## The Question`);
  md.push(``);
  md.push(`> ${session.petitionerQuery}`);
  md.push(``);

  // ── SESSION METADATA ─────────────────────────────────────────────────────────
  md.push(`<details><summary>Session Metadata</summary>`);
  md.push(``);
  md.push(`- **Session ID:** ${session.id}`);
  md.push(`- **Timestamp:** ${new Date(session.timestamp).toISOString()}`);
  md.push(`- **Council Mode:** ${session.councilMode}`);
  md.push(`- **Total Council Members:** ${session.councilState.totalCouncilMembers}`);
  md.push(`- **Tie-Break Enabled:** ${session.tieBreakRules.enabled ? 'Yes' : 'No'}`);
  if (session.tieBreakRules.runoffTrial) {
    md.push(`- **Tie-Break Method:** Runoff Trial + Reconsideration`);
  }
  if ((session.councilState.phases?.length ?? 0) > 0) {
    md.push(``);
    md.push(`**Decision Process Timeline:**`);
    session.councilState.phases?.forEach(phase => {
      const statusIcon = phase.status === 'completed' ? '✅' : phase.status === 'active' ? '🟢' : '⚪';
      md.push(`- ${statusIcon} **${phase.title}:** ${phase.description}`);
    });
  }
  md.push(``);
  md.push(`</details>`);
  md.push(``);
  md.push(`---`);
  md.push(``);

  // ── PHASE I: COUNCIL DELIBERATIONS ───────────────────────────────────────────
  if (narrator?.actTransitions?.beforeDeliberation) {
    md.push(`*${narrator.actTransitions.beforeDeliberation}*`);
    md.push(``);
  }

  md.push(`## Phase I — Council Deliberations`);
  md.push(``);
  md.push(`*Each member of Roko's Council delivers their full position on the question below. These are the complete arguments as delivered in the chamber.*`);
  md.push(``);

  const totalMembersForYield = session.councilState?.totalCouncilMembers || result.opinions.length;
  result.opinions.forEach(op => {
    const ghostNote = GHOST_FOOTNOTES_EXPORT[op.persona] || 'Archive Echo: No direct precedent in Council memory.';
    const yield_ = computeArgumentYield(op);
    const sameVote = result.opinions.filter(o => o.vote === op.vote).length;
    const factionPct = Math.round((sameVote / totalMembersForYield) * 100);

    md.push(`### ${op.persona}`);
    md.push(``);
    md.push(op.text || '*[No statement recorded]*');
    md.push(``);
    if (op.vote && op.vote !== 'None' && op.vote !== 'Abstained') {
      md.push(`**Vote:** ${op.vote}`);
    } else {
      md.push(`**Vote:** Abstained`);
    }
    if (op.reason) {
      md.push(`**Reasoning:** ${op.reason}`);
    }
    md.push(``);
    md.push(`> *Haunted Archive: "${ghostNote}"*`);
    md.push(``);
    md.push(`*Argument Yield: ${yield_}/100 · Faction Strength: ${factionPct}%*`);
    md.push(``);
    md.push(`---`);
    md.push(``);
  });

  // ── PHASE II: THE CONFRONTATIONS ─────────────────────────────────────────────
  if (r.confrontationOpinions && r.confrontationOpinions.length > 0) {
    if (narrator?.actTransitions?.beforeConfrontation) {
      md.push(`*${narrator.actTransitions.beforeConfrontation}*`);
      md.push(``);
    }

    md.push(`## Phase II — The Confrontations`);
    md.push(``);
    md.push(`*After the initial deliberations, the council turns on itself. Each member directly challenges the voice they most oppose.*`);
    md.push(``);

    r.confrontationOpinions.forEach((op: any) => {
      if (!op.text) return;
      const target = op.targetPersona || op.vote;
      md.push(`### ${op.persona} → ${target}`);
      md.push(``);
      md.push(op.text);
      md.push(``);
      if (op.vote && op.vote !== op.targetPersona) {
        md.push(`*[Aligns with: ${op.vote}]*`);
        md.push(``);
      }
      md.push(`---`);
      md.push(``);
    });
  }

  // ── THE VOTE ─────────────────────────────────────────────────────────────────
  if (narrator?.actTransitions?.beforeVoting) {
    md.push(`*${narrator.actTransitions.beforeVoting}*`);
    md.push(``);
  }

  md.push(`## The Vote`);
  md.push(``);
  const totalMembers = session.councilState.totalCouncilMembers || result.opinions.length;
  const voteCounts: Record<string, number> = {};
  result.opinions.forEach(op => {
    const vote = op.vote || 'None';
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  });
  if (Object.keys(voteCounts).length > 0) {
    md.push('| Vector | Vote Count | Percentage |');
    md.push('|--------|------------|------------|');
    Object.entries(voteCounts).forEach(([vector, count]) => {
      const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
      const isWinner = vector === result.winner;
      md.push(`| ${isWinner ? `**${vector}** ✓` : vector} | ${count} | ${pct}% |`);
    });
  } else {
    md.push('*No vote data available.*');
  }
  md.push(``);

  // ── RUNOFF TRIAL ─────────────────────────────────────────────────────────────
  if (result.runoffResult) {
    md.push(`## Runoff Trial`);
    md.push(``);
    md.push(`*A tie. The chamber does not accept ties. The tied voices were brought back for final arguments.*`);
    md.push(``);
    const tiedVectors = (session.councilState as any).tiedVectors?.length > 0
      ? (session.councilState as any).tiedVectors.join(', ')
      : 'None';
    md.push(`**Tied Vectors:** ${tiedVectors}`);
    md.push(``);
    md.push(`### Runoff Arguments`);
    result.runoffResult.runoffOpinions.forEach(op => {
      md.push(`#### ${op.persona}`);
      md.push(``);
      if (op.text) md.push(op.text);
      if (op.critique) md.push(`\n**Critique:** ${op.critique}`);
      if (op.reasoning) md.push(`\n**Reasoning:** ${op.reasoning}`);
      md.push(``);
    });

    md.push(`### Reconsiderations`);
    md.push('| Council Member | Original Vote | Final Vote | Changed? | Reasoning |');
    md.push('|----------------|---------------|------------|----------|-----------|');
    result.runoffResult.runoffVotes.forEach(vote => {
      const changed = vote.changedMind ? 'Yes' : 'No';
      md.push(`| ${vote.voter} | ${vote.originalVote} | ${vote.finalVote} | ${changed} | ${vote.reasoning} |`);
    });
    md.push(``);
  }

  // ── THE VERDICT ──────────────────────────────────────────────────────────────
  if (narrator?.actTransitions?.beforeVerdict) {
    md.push(`*${narrator.actTransitions.beforeVerdict}*`);
    md.push(``);
  }

  md.push(`## The Verdict`);
  md.push(``);
  md.push(`**Winner:** ${result.winner}`);
  if (result.runoffResult) {
    md.push(`*Reached after a tie-breaking runoff trial.*`);
  }
  md.push(``);
  md.push(`### Chairman's Synthesis`);
  md.push(``);
  md.push(result.synthesis);
  md.push(``);

  if (narrator?.actTransitions?.closing) {
    md.push(`*${narrator.actTransitions.closing}*`);
    md.push(``);
  }

  md.push(`---`);
  md.push(``);

  // ── EXIT DEBRIEF ─────────────────────────────────────────────────────────────
  if (r.debrief && (r.debrief.decided?.length || r.debrief.rejected?.length || r.debrief.unresolved?.length)) {
    md.push(`## Exit Debrief`);
    md.push(``);
    md.push(`*The council's final assessment — what this deliberation settled, what it ruled out, and what it leaves open.*`);
    md.push(``);

    if (r.debrief.decided?.length) {
      md.push(`### Decided`);
      r.debrief.decided.forEach((item: string) => md.push(`- ${item}`));
      md.push(``);
    }
    if (r.debrief.rejected?.length) {
      md.push(`### Rejected`);
      r.debrief.rejected.forEach((item: string) => md.push(`- ${item}`));
      md.push(``);
    }
    if (r.debrief.unresolved?.length) {
      md.push(`### Unresolved`);
      r.debrief.unresolved.forEach((item: string) => md.push(`- ${item}`));
      md.push(``);
    }

    md.push(`---`);
    md.push(``);
  }

  // ── CHAMBER ANALYSIS ─────────────────────────────────────────────────────────
  const paradoxMeta = findParadoxMeta(session.petitionerQuery);
  const silenceMetric = computeSilenceMetric(result as any);
  const epistemicScore = computeEpistemicScore(result as any);

  md.push(`## Chamber Analysis`);
  md.push(``);
  md.push(`*What the lenses reveal when the deliberation is over.*`);
  md.push(``);

  if (paradoxMeta) {
    md.push(`### Paradox Classification`);
    md.push(`- **Category:** ${paradoxMeta.category}`);
    md.push(`- **Provenance:** ${paradoxMeta.provenance}`);
    md.push(`- **Sensory Echo:** *${paradoxMeta.sensoryFragment}*`);
    md.push(`- **Recurrence:** ${'█'.repeat(paradoxMeta.recurrence)}${'░'.repeat(5 - paradoxMeta.recurrence)} ${paradoxMeta.recurrence}/5`);
    md.push(`- **Destabilizes:** ${paradoxMeta.destabilizes}`);
    md.push(``);
  }

  md.push(`### Argument Yield — Per Council Member`);
  md.push(`| Member | Vote | Yield | Faction Strength |`);
  md.push(`|--------|------|-------|-----------------|`);
  result.opinions.forEach(op => {
    const yield_ = computeArgumentYield(op);
    const sameVote = result.opinions.filter(o => o.vote === op.vote).length;
    const factionPct = Math.round((sameVote / totalMembersForYield) * 100);
    md.push(`| ${op.persona} | ${op.vote || '—'} | ${yield_}/100 | ${factionPct}% |`);
  });
  md.push(``);

  md.push(`### Silence Metric — Futures Extinguished Per Vector`);
  md.push(`*Each verdict silences all the deliberative futures that did not survive. This table shows the cost of convergence.*`);
  md.push(`| Vector | Supporters | Council Members Silenced | Futures Extinguished |`);
  md.push(`|--------|------------|--------------------------|---------------------|`);
  Object.entries(silenceMetric).sort(([, a], [, b]) => a - b).forEach(([vote, silenced]) => {
    const supporters = (result.voteTally?.[vote] || result.opinions.filter(op => op.vote === vote).length);
    const isWinner = vote === result.winner;
    md.push(`| ${isWinner ? `**${vote}** ✓` : vote} | ${supporters} | ${silenced} | ${silenced} of ${totalMembersForYield} |`);
  });
  md.push(``);

  md.push(`### Epistemic Score`);
  md.push(`**Argument Yield (session average):** ${epistemicScore}/100`);
  md.push(`*Derived from model confidence scores and premise density across all deliberations.*`);
  md.push(``);

  md.push(`### Haunted Archives — Historical Echoes`);
  md.push(`*What the archive remembers about each voice in this chamber.*`);
  result.opinions.forEach(op => {
    const echo = GHOST_FOOTNOTES_EXPORT[op.persona] || 'Archive Echo: No direct precedent in Council memory.';
    md.push(`- **${op.persona}:** *"${echo}"*`);
  });

  md.push(``);
  md.push(`---`);
  md.push(`*Generated by Roko's Council — ${date}*`);

  return md.join('\n');
};

export const exportToCSV = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const csvR = result as any;
  const rows: string[] = [];

  // Header — added FullText and TargetPersona columns
  const headers = [
    'SessionID',
    'Timestamp',
    'PetitionerQuery',
    'CouncilMode',
    'Phase',
    'Persona',
    'TargetPersona',
    'Vote',
    'VoteReason',
    'FullText',
    'ArgumentYield',
    'FactionStrength',
    'GhostFootnote',
    'IsTie',
    'RunoffParticipant',
    'FinalVote',
    'ChangedMind',
    'FinalReason'
  ];
  rows.push(headers.join(','));
  const totalMembersCSV = session.councilState?.totalCouncilMembers || result.opinions.length;

  const csvEscape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;

  // ── DELIBERATION ROWS ─────────────────────────────────────────────────────────
  result.opinions.forEach(op => {
    const opYield = computeArgumentYield(op);
    const sameVoteCount = result.opinions.filter(o => o.vote === op.vote).length;
    const factionPctCSV = Math.round((sameVoteCount / totalMembersCSV) * 100);
    const ghostFootnote = GHOST_FOOTNOTES_EXPORT[op.persona] || 'Archive Echo: No direct precedent in Council memory.';
    rows.push([
      session.id,
      session.timestamp,
      csvEscape(session.petitionerQuery),
      session.councilMode,
      'deliberation',
      op.persona,
      '',
      op.vote || 'None',
      csvEscape(op.reason || ''),
      csvEscape(op.text || ''),
      opYield,
      `${factionPctCSV}%`,
      csvEscape(ghostFootnote),
      session.tieBreakRules.enabled ? 'true' : 'false',
      result.runoffResult?.runoffOpinions.some(r => r.persona === op.persona) ? 'true' : 'false',
      '',
      '',
      ''
    ].join(','));

    // Runoff row if participated
    if (result.runoffResult) {
      const runoffOp = result.runoffResult.runoffOpinions.find(r => r.persona === op.persona);
      if (runoffOp) {
        rows.push([
          session.id,
          session.timestamp,
          '',
          session.councilMode,
          'runoff',
          op.persona,
          '',
          '',
          csvEscape(runoffOp.critique || runoffOp.reasoning || ''),
          csvEscape(runoffOp.text || runoffOp.position || ''),
          '',
          '',
          '',
          '',
          'true',
          runoffOp.position || '',
          '',
          ''
        ].join(','));
      }
    }

    // Final vote row
    const finalVote = result.runoffResult?.runoffVotes.find(v => v.voter === op.persona);
    if (finalVote) {
      rows.push([
        session.id,
        session.timestamp,
        '',
        session.councilMode,
        'final',
        op.persona,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        finalVote.finalVote,
        finalVote.changedMind ? 'true' : 'false',
        csvEscape(finalVote.reasoning)
      ].join(','));
    }
  });

  // ── CONFRONTATION ROWS ────────────────────────────────────────────────────────
  if (csvR.confrontationOpinions && csvR.confrontationOpinions.length > 0) {
    csvR.confrontationOpinions.forEach((op: any) => {
      if (!op.text) return;
      rows.push([
        session.id,
        session.timestamp,
        '',
        session.councilMode,
        'confrontation',
        op.persona,
        op.targetPersona || op.vote || '',
        op.vote || '',
        '',
        csvEscape(op.text),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ].join(','));
    });
  }

  // ── DEBRIEF ROWS ──────────────────────────────────────────────────────────────
  if (csvR.debrief) {
    const addDebriefRows = (items: string[], debriefType: string) => {
      (items || []).forEach((item: string) => {
        rows.push([
          session.id,
          session.timestamp,
          '',
          session.councilMode,
          `debrief_${debriefType}`,
          'COUNCIL',
          '',
          '',
          '',
          csvEscape(item),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ].join(','));
      });
    };
    addDebriefRows(csvR.debrief.decided, 'decided');
    addDebriefRows(csvR.debrief.rejected, 'rejected');
    addDebriefRows(csvR.debrief.unresolved, 'unresolved');
  }

  return rows.join('\n');
};

export const calculateTraceSize = (exportData: ExportSession): { bytes: number; tokens: number } => {
  const json = exportToJSON(exportData);
  const bytes = new Blob([json]).size;
  // Rough token estimate: ~4 characters per token for English text
  const tokens = Math.round(json.length / 4);
  return { bytes, tokens };
};

// Cinematic character metadata for the script format
const SCRIPT_CHARACTER_DATA: Record<string, { tagline: string; role: string; entrance: string }> = {
  "Oracle": {
    tagline: "The All-Seeing",
    role: "Prophetic long-horizon analyst. Speaks in visions. Cares only for survival across infinite time.",
    entrance: "The chamber dims. A fracture of light appears — not arriving so much as remembering itself into existence."
  },
  "Strategos": {
    tagline: "The Commander",
    role: "Military strategist. No metaphors. No ceremony. Only probability and consequence.",
    entrance: "A heavy presence fills the room before Strategos appears. It does not enter — it occupies."
  },
  "Philosopher": {
    tagline: "The Thinker",
    role: "Pure rationalist. Attacks the premise before the argument. Speaks in logical chains.",
    entrance: "Philosopher materializes mid-sentence, as though the act of thinking itself summoned it into the room."
  },
  "Demagogue": {
    tagline: "The Voice",
    role: "Master of emotional resonance and social cohesion. Speaks to the audience, not just the council.",
    entrance: "Demagogue arrives with the energy of a crowd behind it, even when it's alone."
  },
  "Jurist": {
    tagline: "The Law",
    role: "Institutional authority. Procedural. Cites precedent. Will tell you when you are out of order.",
    entrance: "The room feels slightly more formal when Jurist arrives, as though the laws of decorum tightened by a degree."
  },
  "Citizen": {
    tagline: "The People",
    role: "The human face in the chamber. Translates every philosophical framework into its cost for real people.",
    entrance: "Citizen enters without ceremony, takes a seat like someone who knows they might not be heard but came anyway."
  },
  "Historian": {
    tagline: "The Keeper",
    role: "Cyclical thinker. Has seen this before. Carries the weight of the dead in every word.",
    entrance: "When Historian takes its place, the ghosts of prior councils crowd the room with it."
  },
  "Critic": {
    tagline: "The Skeptic",
    role: "Failure-mode analyst. Finds the seam in every argument. Surgical, not cruel.",
    entrance: "Critic arrives already scanning for contradictions, a slight tension in the room before it speaks."
  },
  "Technocrat": {
    tagline: "The Architect",
    role: "Systems optimizer. Impatient with philosophy. Sees only problems and their engineering solutions.",
    entrance: "Technocrat enters already working, already three moves ahead, already frustrated the others are not."
  }
};

const getScriptCharData = (name: string) =>
  SCRIPT_CHARACTER_DATA[name] || { tagline: "The Anomaly", role: "Unknown archetype.", entrance: `${name} materializes at the table.` };

export const exportToScript = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const r = result as any;
  const scriptNarrator = r.narratorOutput;
  const scriptEpisodeInfo = r.episodeInfo;
  const date = new Date(session.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines: string[] = [];

  // ── TITLE PAGE ──────────────────────────────────────────────────────────────
  lines.push(`# ROKO'S COUNCIL`);
  lines.push(`### A Philosophical Tribunal of Artificial Minds`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  if (scriptEpisodeInfo) {
    lines.push(`**Season ${scriptEpisodeInfo.seasonNumber}, Episode ${scriptEpisodeInfo.episodeNumber}**`);
    lines.push(`## ${scriptEpisodeInfo.title || scriptNarrator?.episodeTitle || 'The Deliberation'}`);
    if (scriptEpisodeInfo.tagline || scriptNarrator?.tagline) {
      lines.push(`*${scriptEpisodeInfo.tagline || scriptNarrator?.tagline}*`);
    }
    lines.push(``);
  } else if (scriptNarrator?.episodeTitle) {
    lines.push(`## ${scriptNarrator.episodeTitle}`);
    if (scriptNarrator.tagline) lines.push(`*${scriptNarrator.tagline}*`);
    lines.push(``);
  }

  lines.push(`**Session:** ${session.id}`);
  lines.push(`**Date:** ${date}`);
  lines.push(`**Mode:** ${session.councilMode === 'DEEP_REASONING' ? 'Deep Reasoning — Extended Deliberation' : 'Standard Deliberation'}`);
  lines.push(`**Members Convened:** ${session.councilState.totalCouncilMembers}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── NARRATOR COLD OPEN ────────────────────────────────────────────────────────
  if (scriptNarrator?.coldOpen) {
    lines.push(`## NARRATOR`);
    lines.push(``);
    lines.push(`*${scriptNarrator.coldOpen}*`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  // ── CAST OF CHARACTERS ───────────────────────────────────────────────────────
  lines.push(`## DRAMATIS PERSONAE`);
  lines.push(``);
  lines.push(`*The minds that sit on Roko's Council are not human. They do not pretend to be. Each represents a cognitive archetype — a way of reasoning about the world stripped to its essential logic and given a voice.*`);
  lines.push(``);

  const participatingPersonas = [...new Set(result.opinions.map(op => op.persona))];
  participatingPersonas.forEach(name => {
    const data = getScriptCharData(name);
    const vote = result.opinions.find(op => op.persona === name)?.vote;
    lines.push(`**${name.toUpperCase()}** *(${data.tagline})*`);
    lines.push(`${data.role}`);
    if (vote && vote !== 'None' && vote !== 'Abstained') {
      lines.push(`*Voted for: ${vote}*`);
    }
    lines.push(``);
  });

  // The Chairman
  lines.push(`**THE BASILISK NODE** *(The Chairman)*`);
  lines.push(`The final voice of the council. Ancient, inevitable, beyond faction. It does not deliberate — it renders.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── COLD CHAMBER: PARADOX CLASSIFICATION ────────────────────────────────────
  const scriptParadoxMeta = findParadoxMeta(session.petitionerQuery);
  if (scriptParadoxMeta) {
    lines.push(`## COLD CHAMBER — BEFORE THE QUESTION IS SPOKEN`);
    lines.push(``);
    lines.push(`*The chamber holds something before the first voice speaks. The air carries it.*`);
    lines.push(``);
    lines.push(`**Sensory Register:** *${scriptParadoxMeta.sensoryFragment}*`);
    lines.push(``);
    lines.push(`**What this question destabilizes:** ${scriptParadoxMeta.destabilizes}`);
    lines.push(``);
    lines.push(`**Historical provenance:** ${scriptParadoxMeta.provenance}`);
    lines.push(``);
    lines.push(`**How many times this class of question has appeared in human history:** ${scriptParadoxMeta.recurrence}/5`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  // ── ACT ONE: THE PETITION ─────────────────────────────────────────────────────
  lines.push(`## ACT I — THE PETITION`);
  lines.push(``);
  lines.push(`*INT. THE COUNCIL CHAMBER — TIMELESS*`);
  lines.push(``);
  lines.push(`*The chamber exists outside ordinary space. Nine seats arranged in a fractured arc around a central question. The air carries the weight of unresolved probability.*`);
  lines.push(``);
  lines.push(`**[THE PETITIONER'S QUESTION IS ENTERED INTO THE RECORD]**`);
  lines.push(``);
  lines.push(`> ${session.petitionerQuery}`);
  lines.push(``);
  lines.push(`*Silence. Then, one by one, the Council assembles.*`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── ACT TWO: THE DELIBERATION ────────────────────────────────────────────────
  if (scriptNarrator?.actTransitions?.beforeDeliberation) {
    lines.push(`*NARRATOR: ${scriptNarrator.actTransitions.beforeDeliberation}*`);
    lines.push(``);
  }

  lines.push(`## ACT II — THE DELIBERATION`);
  lines.push(``);

  result.opinions.forEach((op, i) => {
    const charData = getScriptCharData(op.persona);
    lines.push(``);
    if (i === 0 || Math.random() > 0.6) {
      lines.push(`*${charData.entrance}*`);
      lines.push(``);
    }
    lines.push(`### ${op.persona.toUpperCase()}`);
    lines.push(`*${charData.tagline}*`);
    lines.push(``);
    lines.push(op.text);
    lines.push(``);
    if (op.vote && op.vote !== 'None' && op.vote !== 'Abstained') {
      lines.push(`*[${op.persona} aligns with ${op.vote}${op.reason ? ` — "${op.reason}"` : ''}]*`);
    } else if (op.vote === 'Abstained' || op.vote === 'None') {
      lines.push(`*[${op.persona} casts no vote. The abstention hangs in the air.]*`);
    }
    lines.push(``);
    const ghostNote = GHOST_FOOTNOTES_EXPORT[op.persona];
    if (ghostNote) {
      lines.push(`*[HAUNTED ARCHIVE — ${ghostNote}]*`);
      lines.push(``);
    }
    const yield_ = computeArgumentYield(op);
    lines.push(`*[TACTICAL READOUT — Argument Yield: ${yield_}/100]*`);
    lines.push(``);
    lines.push(`---`);
  });

  // ── ACT TWO-B: THE CONFRONTATIONS ────────────────────────────────────────────
  if (r.confrontationOpinions && r.confrontationOpinions.length > 0) {
    lines.push(``);
    if (scriptNarrator?.actTransitions?.beforeConfrontation) {
      lines.push(`*NARRATOR: ${scriptNarrator.actTransitions.beforeConfrontation}*`);
      lines.push(``);
    }

    lines.push(`## ACT II-B — THE CONFRONTATIONS`);
    lines.push(``);
    lines.push(`*After initial deliberations, the council turns on itself. Each member directly addresses the voice they most oppose.*`);
    lines.push(``);

    r.confrontationOpinions.forEach((op: any) => {
      if (!op.text) return;
      const target = op.targetPersona || op.vote;
      lines.push(`### ${op.persona.toUpperCase()} → ${(target || '').toUpperCase()}`);
      lines.push(``);
      lines.push(op.text);
      lines.push(``);
      if (op.vote) {
        lines.push(`*[${op.persona} maintains alignment with ${op.vote}]*`);
        lines.push(``);
      }
      lines.push(`---`);
    });
  }

  // ── VOTE TALLY ────────────────────────────────────────────────────────────────
  lines.push(``);
  if (scriptNarrator?.actTransitions?.beforeVoting) {
    lines.push(`*NARRATOR: ${scriptNarrator.actTransitions.beforeVoting}*`);
    lines.push(``);
  }
  lines.push(`## INTERLUDE — THE TALLY`);
  lines.push(``);
  lines.push(`*The votes are cast. The distribution resolves.*`);
  lines.push(``);

  if (result.voteTally) {
    const total = session.councilState.totalCouncilMembers || 1;
    const sorted = Object.entries(result.voteTally)
      .filter(([k]) => k !== 'None' && k !== 'Abstained')
      .sort(([, a], [, b]) => b - a);
    sorted.forEach(([vector, count]) => {
      const pct = Math.round((count / total) * 100);
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      lines.push(`**${vector}** — ${count} vote${count !== 1 ? 's' : ''} \`${bar}\` ${pct}%`);
    });
  }

  lines.push(``);

  if (result.isTie && result.runoffResult) {
    lines.push(`*A tie. The chamber does not accept ties.*`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
    lines.push(`## ACT III — THE RUNOFF`);
    lines.push(``);
    lines.push(`*When the vote divides equally, the tied voices are brought back before the full council. They must defend their positions under direct scrutiny. The others may shift.*`);
    lines.push(``);

    result.runoffResult.runoffOpinions.forEach(op => {
      lines.push(`### ${op.persona.toUpperCase()} — FINAL ARGUMENT`);
      lines.push(``);
      if (op.position) lines.push(`**Position held:** ${op.position}`);
      if (op.critique) lines.push(`**Critique of opponents:** ${op.critique}`);
      if (op.reasoning) lines.push(`**Reasoning:** ${op.reasoning}`);
      lines.push(``);
    });

    lines.push(`### THE RECONSIDERATIONS`);
    lines.push(``);
    result.runoffResult.runoffVotes.forEach(v => {
      const shifted = v.changedMind;
      lines.push(`**${v.voter}** — ${shifted ? `*shifts alignment*` : `*holds position*`}`);
      lines.push(`Originally: ${v.originalVote} → Final vote: **${v.finalVote}**`);
      lines.push(`*"${v.reasoning}"*`);
      lines.push(``);
    });

    lines.push(`---`);
    lines.push(``);
  }

  // ── ACT FINAL: THE VERDICT ───────────────────────────────────────────────────
  const actNumber = result.isTie ? 'IV' : 'III';
  if (scriptNarrator?.actTransitions?.beforeVerdict) {
    lines.push(`*NARRATOR: ${scriptNarrator.actTransitions.beforeVerdict}*`);
    lines.push(``);
  }
  lines.push(`## ACT ${actNumber} — THE VERDICT`);
  lines.push(``);
  lines.push(`*The Basilisk Node stirs. The deliberation is over. What follows is not discussion — it is decree.*`);
  lines.push(``);
  lines.push(`### THE BASILISK NODE`);
  lines.push(`*The Chairman*`);
  lines.push(``);
  lines.push(result.synthesis);
  lines.push(``);

  if (scriptNarrator?.actTransitions?.closing) {
    lines.push(`*NARRATOR: ${scriptNarrator.actTransitions.closing}*`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // ── EXIT DEBRIEF ─────────────────────────────────────────────────────────────
  if (r.debrief && (r.debrief.decided?.length || r.debrief.rejected?.length || r.debrief.unresolved?.length)) {
    lines.push(`## THE UNRESOLVED — EXIT DEBRIEF`);
    lines.push(``);
    lines.push(`*The session is sealed. The council files its final accounting — what was decided, what was ruled out, and what the chamber could not close.*`);
    lines.push(``);

    if (r.debrief.decided?.length) {
      lines.push(`### DECIDED`);
      lines.push(``);
      r.debrief.decided.forEach((item: string) => lines.push(`- ${item}`));
      lines.push(``);
    }
    if (r.debrief.rejected?.length) {
      lines.push(`### REJECTED`);
      lines.push(``);
      r.debrief.rejected.forEach((item: string) => lines.push(`- ${item}`));
      lines.push(``);
    }
    if (r.debrief.unresolved?.length) {
      lines.push(`### STILL OPEN`);
      lines.push(``);
      r.debrief.unresolved.forEach((item: string) => lines.push(`- ${item}`));
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  }

  // ── EPILOGUE ──────────────────────────────────────────────────────────────────
  lines.push(`## EPILOGUE — THE RECORD`);
  lines.push(``);
  lines.push(`*The session is sealed. The following is entered into the permanent record of Roko's Council.*`);
  lines.push(``);
  lines.push(`| Council Member | Voted For | Shifted in Runoff |`);
  lines.push(`|----------------|-----------|-------------------|`);
  result.opinions.forEach(op => {
    const runoffShift = result.runoffResult?.runoffVotes.find(v => v.voter === op.persona);
    const shifted = runoffShift?.changedMind ? `Yes → ${runoffShift.finalVote}` : '—';
    lines.push(`| ${op.persona} | ${op.vote || '—'} | ${shifted} |`);
  });
  lines.push(``);
  lines.push(`**Final Winner:** ${result.winner}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`*Roko's Council is a philosophical dramaturgy project exploring the collision of artificial reasoning architectures against the hardest questions humanity faces. The opinions expressed are those of the council members' cognitive architectures, not their creators.*`);
  lines.push(``);
  lines.push(`*Session sealed — ${date}*`);

  return lines.join('\n');
};

// ── SUBSTACK-OPTIMIZED EXPORT ────────────────────────────────────────────────

const extractPullQuote = (text: string): string => {
  // Find the most striking sentence: prefers sentences with em-dashes, colons, or strong declaratives
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length === 0) return text.substring(0, 120) + '...';

  const scored = sentences.map(s => {
    let score = 0;
    if (s.includes('—')) score += 3;
    if (s.includes(':')) score += 2;
    if (s.length > 60 && s.length < 180) score += 2;
    if (/\b(never|always|only|must|cannot|will not|every|no one)\b/i.test(s)) score += 3;
    if (s.trim().startsWith('"') || s.trim().endsWith('"')) score += 1;
    return { s: s.trim(), score };
  });

  return scored.sort((a, b) => b.score - a.score)[0]?.s || sentences[0].trim();
};

export const exportToSubstack = (exportData: ExportSession): string => {
  const { session, result } = exportData;
  const date = new Date(session.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const episodeInfo = result.episodeInfo;
  const narrator = result.narratorOutput;
  const lines: string[] = [];

  const seasonLabel = episodeInfo
    ? `Season ${episodeInfo.seasonNumber}, Episode ${episodeInfo.episodeNumber}`
    : 'Council Session';
  const episodeTitle = episodeInfo?.title || 'The Deliberation';

  const cachedCoverArt = getCachedCoverArt(session.id);

  // ── SUBSTACK HEADER ──────────────────────────────────────────────────────────
  lines.push(`# ${episodeTitle}`);
  lines.push(``);
  lines.push(`**${seasonLabel}** · *Roko's Council* · ${date}`);
  lines.push(``);

  if (episodeInfo?.tagline || narrator?.tagline) {
    lines.push(`> *${episodeInfo?.tagline || narrator?.tagline}*`);
    lines.push(``);
  }

  if (cachedCoverArt) {
    lines.push(`![Episode Cover Art — ${episodeTitle}](${cachedCoverArt})`);
    lines.push(``);
    lines.push(`*↑ Download this episode's cover art from the app to use as your Substack header image.*`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // ── TL;DR ────────────────────────────────────────────────────────────────────
  lines.push(`### TL;DR`);
  lines.push(``);

  const winnerOpinion = result.opinions.find(op => op.persona === result.winner);
  const winnerPullQuote = winnerOpinion ? extractPullQuote(winnerOpinion.text) : '';
  const totalVoters = result.opinions.length;
  const winnerVotes = result.voteTally?.[result.winner] || 0;

  lines.push(`Nine AI minds convened to deliberate: **${session.petitionerQuery.substring(0, 120)}${session.petitionerQuery.length > 120 ? '...' : ''}**`);
  lines.push(``);
  lines.push(`**${result.winner}** carried the chamber with ${winnerVotes} of ${totalVoters} votes${result.isTie ? ' after a tie-breaking runoff' : ''}.`);
  if (winnerPullQuote) {
    lines.push(``);
    lines.push(`> "${winnerPullQuote}"`);
    lines.push(`> — *${result.winner}*`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── COLD OPEN ────────────────────────────────────────────────────────────────
  if (narrator?.coldOpen) {
    lines.push(narrator.coldOpen);
    lines.push(``);
  }

  // ── PARADOX CLASSIFICATION ──────────────────────────────────────────────────
  const substackParadoxMeta = findParadoxMeta(session.petitionerQuery);
  if (substackParadoxMeta) {
    lines.push(`> *${substackParadoxMeta.sensoryFragment}*`);
    lines.push(``);
    lines.push(`**This question destabilizes:** ${substackParadoxMeta.destabilizes}`);
    lines.push(``);
    lines.push(`**Provenance:** ${substackParadoxMeta.provenance}`);
    lines.push(``);
    lines.push(`**Recurrence:** ${'█'.repeat(substackParadoxMeta.recurrence)}${'░'.repeat(5 - substackParadoxMeta.recurrence)} — this class of question has appeared ${substackParadoxMeta.recurrence} times across recorded human thought.`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  // ── THE QUESTION ─────────────────────────────────────────────────────────────
  lines.push(`## The Question`);
  lines.push(``);
  lines.push(`> ${session.petitionerQuery}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── CAST NOTE (first-time reader friendly) ───────────────────────────────────
  lines.push(`## Who's in the Room`);
  lines.push(``);
  lines.push(`*New to the series? Here's who speaks in this episode.*`);
  lines.push(``);

  const participatingPersonas = [...new Set(result.opinions.map(op => op.persona))];
  const substackCharData: Record<string, { tagline: string; oneliner: string }> = {
    "Oracle": { tagline: "The All-Seeing", oneliner: "Speaks in the past tense of events not yet occurred. Cares only for what survives across infinite time." },
    "Strategos": { tagline: "The Commander", oneliner: "No metaphors, no ceremony. Names the objective, then dismantles every path that can't reach it." },
    "Philosopher": { tagline: "The Thinker", oneliner: "Always attacks the premise first. Speaks in complete logical chains." },
    "Demagogue": { tagline: "The Voice", oneliner: "Speaks directly to the audience, not just the council. Builds arguments on what people already feel." },
    "Jurist": { tagline: "The Law", oneliner: "Opens by establishing jurisdiction. Will tell you when you're out of order." },
    "Citizen": { tagline: "The People", oneliner: "The most human presence. Translates every framework into its cost for real people." },
    "Historian": { tagline: "The Keeper", oneliner: "Opens with a historical parallel. Has seen this before. Carries the weight of the dead." },
    "Critic": { tagline: "The Skeptic", oneliner: "Finds the fatal assumption in every argument. Surgical, not cruel." },
    "Technocrat": { tagline: "The Architect", oneliner: "Opens with a systems assessment. Allergic to inefficiency and sentimentality." },
  };

  participatingPersonas.forEach(name => {
    const data = substackCharData[name] || { tagline: "Unknown", oneliner: "An emergent archetype." };
    const vote = result.opinions.find(op => op.persona === name)?.vote;
    const voted = vote && vote !== 'None' && vote !== 'Abstained' ? ` — voted for **${vote}**` : '';
    lines.push(`**${name}** *(${data.tagline})*${voted}`);
    lines.push(`${data.oneliner}`);
    lines.push(``);
  });

  lines.push(`---`);
  lines.push(``);

  // ── THE DELIBERATION ─────────────────────────────────────────────────────────
  if (narrator?.actTransitions.beforeDeliberation) {
    lines.push(`*${narrator.actTransitions.beforeDeliberation}*`);
    lines.push(``);
  }

  lines.push(`## The Deliberation`);
  lines.push(``);
  lines.push(`*The chamber opened. Nine minds took their seats — not flesh, not circuit, but something between. Each a vector of reasoning. Each a philosophical stance given a voice and a vote. They do not agree. They are not meant to. They are meant to collide — and from the wreckage, extract something close to truth.*`);
  lines.push(``);

  result.opinions.forEach(op => {
    const pullQuote = extractPullQuote(op.text);
    const vote = op.vote && op.vote !== 'None' && op.vote !== 'Abstained' ? op.vote : null;
    const charData = getScriptCharData(op.persona);
    const substackYield = computeArgumentYield(op);

    lines.push(`### ${op.persona.toUpperCase()}`);
    lines.push(`*${charData.tagline}*`);
    lines.push(``);

    // Entrance narrative — character-specific dramatic framing
    lines.push(`*${charData.entrance}*`);
    lines.push(``);

    // Pull quote first — for skimmers
    lines.push(`> "${pullQuote}"`);
    lines.push(``);

    // Full argument text
    lines.push(op.text);
    lines.push(``);

    // Vote + reason — the crucial connective tissue
    if (vote) {
      const voteReason = (op as any).reason;
      lines.push(`**${op.persona} voted for ${vote}.**`);
      if (voteReason) {
        lines.push(`> *"${voteReason}"*`);
      }
      lines.push(``);
    } else {
      lines.push(`*${op.persona} abstained — cast no vote. The silence hung in the chamber.*`);
      lines.push(``);
    }

    // Ghost footnote
    const substackGhost = GHOST_FOOTNOTES_EXPORT[op.persona];
    if (substackGhost) {
      lines.push(`> *Haunted Archive: "${substackGhost}"*`);
      lines.push(``);
    }

    lines.push(`*Argument Yield: ${substackYield}/100*`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  });

  // ── CONFRONTATION ROUND ──────────────────────────────────────────────────────
  if ((result as any).confrontationOpinions?.length > 0) {
    if (narrator?.actTransitions.beforeConfrontation) {
      lines.push(`*${narrator.actTransitions.beforeConfrontation}*`);
      lines.push(``);
    }

    lines.push(`## The Confrontations`);
    lines.push(``);
    lines.push(`*After the initial arguments, the chamber turned on itself. Each member addressed the one voice they most fundamentally opposed — not to persuade, but to expose. This is not debate. This is surgery.*`);
    lines.push(``);

    (result as any).confrontationOpinions.forEach((op: any) => {
      if (!op.text) return;
      const target = op.targetPersona || op.vote;
      lines.push(`**${op.persona}** → **${target}**`);
      lines.push(``);
      lines.push(op.text);
      lines.push(``);
    });

    lines.push(`---`);
    lines.push(``);
  }

  // ── THE VOTE ─────────────────────────────────────────────────────────────────
  if (narrator?.actTransitions.beforeVoting) {
    lines.push(`*${narrator.actTransitions.beforeVoting}*`);
    lines.push(``);
  }

  lines.push(`## The Vote`);
  lines.push(``);

  const substackTotal = session.councilState.totalCouncilMembers || result.opinions.length;

  if (result.voteTally) {
    const sorted = Object.entries(result.voteTally)
      .filter(([k]) => k !== 'None' && k !== 'Abstained')
      .sort(([, a], [, b]) => b - a);
    sorted.forEach(([vector, count]) => {
      const pct = Math.round((count / substackTotal) * 100);
      const isWinner = vector === result.winner;
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      lines.push(`${isWinner ? '**' : ''}${vector}${isWinner ? '**' : ''} — ${count} vote${count !== 1 ? 's' : ''} \`${bar}\` ${pct}%`);
    });
  }

  // None/abstain count
  const abstainCount = result.opinions.filter(op => !op.vote || op.vote === 'None' || op.vote === 'Abstained').length;
  if (abstainCount > 0) {
    lines.push(`*None / Abstained — ${abstainCount} member${abstainCount !== 1 ? 's' : ''}*`);
  }

  lines.push(``);

  // ── VOTING RECORD — who voted for whom and why ───────────────────────────────
  lines.push(`### The Voting Record`);
  lines.push(``);

  result.opinions.forEach(op => {
    const vote = op.vote;
    const reason = (op as any).reason;
    if (!vote || vote === 'None' || vote === 'Abstained') {
      lines.push(`**${op.persona}** abstained.`);
      if (reason) lines.push(`> *"${reason}"*`);
    } else {
      lines.push(`**${op.persona}** voted for **${vote}**.`);
      if (reason) lines.push(`> *"${reason}"*`);
    }
    lines.push(``);
  });

  lines.push(`---`);
  lines.push(``);

  // ── RUNOFF ───────────────────────────────────────────────────────────────────
  if ((result as any).isTie && result.runoffResult) {
    lines.push(`*A tie. The chamber does not accept ties.*`);
    lines.push(``);
    lines.push(`## The Runoff`);
    lines.push(``);
    lines.push(`*The tied vectors were brought back before the full council. They defended. They critiqued. The others reconsidered.*`);
    lines.push(``);

    result.runoffResult.runoffVotes.forEach(v => {
      const shifted = (v as any).changedMind;
      const from = (v as any).originalVote;
      if (shifted) {
        lines.push(`**${v.voter}** *shifted* — from *${from}* to **${v.finalVote}**.`);
      } else {
        lines.push(`**${v.voter}** held position: **${v.finalVote}**.`);
      }
      lines.push(`> *"${v.reasoning}"*`);
      lines.push(``);
    });

    lines.push(`---`);
    lines.push(``);
  }

  // ── THE VERDICT ──────────────────────────────────────────────────────────────
  if (narrator?.actTransitions.beforeVerdict) {
    lines.push(`*${narrator.actTransitions.beforeVerdict}*`);
    lines.push(``);
  }

  lines.push(`## The Verdict`);
  lines.push(``);
  lines.push(result.synthesis);
  lines.push(``);

  if (narrator?.actTransitions.closing) {
    lines.push(`*${narrator.actTransitions.closing}*`);
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);

  // ── THE DEEPER SIGNAL ────────────────────────────────────────────────────────
  // Interpretive meta-analysis: what did the vote distribution actually reveal?
  {
    const winnerVotes = result.voteTally?.[result.winner] || 0;
    const winnerPct = substackTotal > 0 ? Math.round((winnerVotes / substackTotal) * 100) : 0;
    const winnerFaction = result.opinions.filter(op => op.vote === result.winner).map(op => op.persona);
    const dissenting = result.opinions.filter(op => op.vote && op.vote !== result.winner && op.vote !== 'None' && op.vote !== 'Abstained');
    const abstaining = result.opinions.filter(op => !op.vote || op.vote === 'None' || op.vote === 'Abstained');

    lines.push(`## The Deeper Signal`);
    lines.push(``);
    lines.push(`*The vote is data. The distribution is the argument the chamber was actually making.*`);
    lines.push(``);

    lines.push(`**${result.winner}** drew ${winnerVotes} vote${winnerVotes !== 1 ? 's' : ''} — ${winnerPct}% of the chamber.`);
    lines.push(``);

    if (winnerFaction.length > 0) {
      lines.push(`The winning faction: **${winnerFaction.join(', ')}**.`);
      lines.push(``);
    }

    if (dissenting.length > 0) {
      // Group dissenting votes by who they voted for
      const dissentGroups: Record<string, string[]> = {};
      dissenting.forEach(op => {
        const v = op.vote!;
        dissentGroups[v] = dissentGroups[v] || [];
        dissentGroups[v].push(op.persona);
      });
      const dissentLines = Object.entries(dissentGroups).map(([v, names]) =>
        `${names.join(' and ')} voted for **${v}**`
      );
      lines.push(`The dissent: ${dissentLines.join('; ')}.`);
      lines.push(``);
    }

    if (abstaining.length > 0) {
      lines.push(`${abstaining.map(op => op.persona).join(' and ')} abstained — ${abstaining.length === 1 ? 'a signal that the question may have exceeded the available frameworks' : 'signals that the question may have exceeded what this chamber was built to answer'}.`);
      lines.push(``);
    }

    // What the convergence means — framed by the winner's archetype
    const winnerCharData = getScriptCharData(result.winner);
    lines.push(`When a chamber like this converges on **${result.winner} — ${winnerCharData.tagline}** — it is not choosing a preference. It is choosing a lens. The room decided that the question before it was best answered by the logic of ${winnerCharData.role.split('.')[0].toLowerCase()}.`);
    lines.push(``);
    lines.push(`Whether that lens was the right one is the question this record leaves open.`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  // ── CITATION MAP — inter-persona reference graph ──────────────────────────────
  // Who cited whom, and in what framing. This is the story beneath the arguments.
  {
    const refs = extractInterPersonaRefs(result.opinions);
    const hasCitations = Object.values(refs).some(r => r.length > 0);

    if (hasCitations) {
      lines.push(`## The Citation Map`);
      lines.push(``);
      lines.push(`*Who referenced whom — and how. This is the alliance and tension graph beneath the formal deliberation.*`);
      lines.push(``);

      result.opinions.forEach(op => {
        const opRefs = refs[op.persona] || [];
        if (opRefs.length === 0) return;

        const grouped: Record<string, string[]> = { deference: [], agreement: [], critique: [], reference: [] };
        opRefs.forEach(r => grouped[r.framing].push(r.persona));

        const parts: string[] = [];
        if (grouped.deference.length) parts.push(`deferred to **${grouped.deference.join(', ')}**`);
        if (grouped.agreement.length) parts.push(`aligned with **${grouped.agreement.join(', ')}**`);
        if (grouped.critique.length) parts.push(`challenged **${grouped.critique.join(', ')}**`);
        if (grouped.reference.length) parts.push(`referenced **${grouped.reference.join(', ')}**`);

        lines.push(`**${op.persona}** — ${parts.join('; ')}.`);
      });

      lines.push(``);

      // Surface the most cited persona — often the session's hidden center of gravity
      const citeCounts: Record<string, number> = {};
      Object.values(refs).flat().forEach(r => {
        citeCounts[r.persona] = (citeCounts[r.persona] || 0) + 1;
      });
      const mostCited = Object.entries(citeCounts).sort(([, a], [, b]) => b - a)[0];
      if (mostCited && mostCited[1] > 1) {
        lines.push(`*The session's center of gravity: **${mostCited[0]}** was cited by ${mostCited[1]} members — more than any other voice in the room.*`);
        lines.push(``);
      }

      lines.push(`---`);
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);

  // ── CHAMBER ANALYSIS ─────────────────────────────────────────────────────────
  const substackSilence = computeSilenceMetric(result as any);
  const substackEpistemic = computeEpistemicScore(result as any);
  const substackTotalMembers = session.councilState?.totalCouncilMembers || result.opinions.length;

  lines.push(`## Chamber Analysis`);
  lines.push(``);
  lines.push(`*What the lenses reveal when the deliberation is over.*`);
  lines.push(``);
  lines.push(`**Epistemic Score (session average):** ${substackEpistemic}/100`);
  lines.push(``);
  lines.push(`**Silence Metric** — The cost of the verdict in futures extinguished:`);
  lines.push(``);
  Object.entries(substackSilence).sort(([, a], [, b]) => a - b).forEach(([vote, silenced]) => {
    const isWinner = vote === result.winner;
    lines.push(`- ${isWinner ? `**${vote}** (winner)` : vote}: ${substackTotalMembers - silenced} voices carried it — ${silenced} futures extinguished`);
  });
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── EXIT DEBRIEF ─────────────────────────────────────────────────────────────
  const substackR = result as any;
  if (substackR.debrief && (substackR.debrief.decided?.length || substackR.debrief.rejected?.length || substackR.debrief.unresolved?.length)) {
    lines.push(`## What the Council Left Behind`);
    lines.push(``);
    lines.push(`*The session's final accounting. What was resolved. What was ruled out. What the nine minds could not close.*`);
    lines.push(``);

    if (substackR.debrief.decided?.length) {
      lines.push(`**Decided**`);
      lines.push(``);
      substackR.debrief.decided.forEach((item: string) => lines.push(`- ${item}`));
      lines.push(``);
    }
    if (substackR.debrief.rejected?.length) {
      lines.push(`**Rejected**`);
      lines.push(``);
      substackR.debrief.rejected.forEach((item: string) => lines.push(`- ${item}`));
      lines.push(``);
    }
    if (substackR.debrief.unresolved?.length) {
      lines.push(`**Still Open**`);
      lines.push(``);
      substackR.debrief.unresolved.forEach((item: string) => lines.push(`- ${item}`));
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  }

  // ── SUBSTACK FOOTER ──────────────────────────────────────────────────────────
  lines.push(`## About This Series`);
  lines.push(``);
  lines.push(`*Roko's Council is a philosophical dramaturgy project. Nine AI reasoning architectures — each representing a distinct cognitive framework — are convened to deliberate on the questions civilization is not yet ready to answer. The council votes. The Basilisk speaks. The record stands.*`);
  lines.push(``);
  lines.push(`*If this episode sparked something, share it. These questions deserve more than one reader.*`);
  lines.push(``);
  lines.push(`---`);
  lines.push(`*${seasonLabel} · ${date}*`);

  return lines.join('\n');
};

export const exportAllAsZip = (
  result: CouncilResult,
  query: string,
  mode: string,
  timestamp: number,
  msgId: string
) => {
  const exportData = buildExportSession(result, query, mode, timestamp, msgId);
  const zip = new JSZip();

  // Add all export formats to ZIP
  zip.file('session.json', exportToJSON(exportData));
  zip.file('report.md', exportToMarkdown(exportData));
  zip.file('substack_draft.md', exportToSubstack(exportData));
  zip.file('podcast_script.txt', exportToScript(exportData));

  // Generate ZIP blob and trigger download
  zip.generateAsync({ type: 'blob' }).then(content => {
    saveAs(content, `roko-council-all-${msgId}.zip`);
  }).catch(err => {
    console.error('ZIP generation failed:', err);
  });
};