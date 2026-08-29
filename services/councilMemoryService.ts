import { CharacterMemory, ConstitutionalMemory, CouncilEpisode, CouncilResult, CouncilSeason, DynamicRelationshipState, PersonaLesson, RelationshipProvenanceEvent } from '../types';
import { createInitialRelationshipStates, evolveRelationshipsFromSession } from './relationshipGraph';
import { computeInvariantStressDelta, deriveInvariantStatus } from './dissonanceEngine';

const MEMORY_KEY = 'rokos_council_character_memory';
const SEASON_KEY = 'rokos_council_seasons';
const EPISODE_COUNTER_KEY = 'rokos_council_episode_counter';
const CONSTITUTIONAL_MEMORY_KEY = 'rokos_council_constitutional_memory';

// ── TOPIC CLASSIFICATION (longitudinal identity) ─────────────────────────────
// Deterministic keyword bucketing of the petitioner query. Coarse by design —
// it exists to accumulate "you have been wrong about this CLASS of problem N
// times", not to be a taxonomy.
const TOPIC_KEYWORDS: Array<[string, string[]]> = [
  ['AI & INTELLIGENCE', ['ai', 'artificial intelligence', 'model', 'alignment', 'machine', 'algorithm', 'autonomous', 'robot', 'synthetic', 'sentient', 'mind', 'brain']],
  ['LAW & JUSTICE', ['law', 'legal', 'rights', 'court', 'justice', 'constitution', 'liability', 'crime', 'regulation', 'legislation', 'contract']],
  ['WAR & SECURITY', ['war', 'military', 'weapon', 'defense', 'security', 'conflict', 'attack', 'surveillance', 'nuclear', 'terror']],
  ['ECONOMICS & LABOR', ['economy', 'economic', 'labor', 'job', 'work', 'market', 'wealth', 'poverty', 'trade', 'wage', 'employment', 'corporation']],
  ['ETHICS & MEANING', ['ethics', 'moral', 'should', 'ought', 'value', 'consciousness', 'soul', 'free will', 'meaning', 'evil', 'good', 'god']],
  ['HEALTH & MEDICINE', ['health', 'medical', 'disease', 'patient', 'therapy', 'genetic', 'pandemic', 'surgery', 'drug', 'medicine', 'virus']],
  ['TECHNOLOGY', ['technology', 'internet', 'data', 'software', 'hardware', 'computer', 'cryptocurrency', 'digital', 'network', 'cyber']],
  ['ENVIRONMENT', ['climate', 'environment', 'energy', 'emissions', 'planet', 'ecology', 'biodiversity', 'sustainability']],
];

export const categorizeTopic = (question: string): string => {
  const q = (question || '').toLowerCase();
  for (const [topic, keywords] of TOPIC_KEYWORDS) {
    if (keywords.some(k => q.includes(k))) return topic;
  }
  return 'GENERAL';
};

const emptyLesson = (topicClass: string, sessionId: string): PersonaLesson => ({
  topicClass,
  predictions: 0,
  correct: 0,
  wrong: 0,
  caughtBy: {},
  confirmedBy: {},
  lastSessionId: sessionId,
});

// ── STORAGE HELPERS ─────────────────────────────────────────────────────────

export const loadAllMemory = (): Record<string, CharacterMemory> => {
  try {
    const stored = localStorage.getItem(MEMORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
};

const saveAllMemory = (memory: Record<string, CharacterMemory>): void => {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); } catch {}
};

export const getCharacterMemory = (persona: string): CharacterMemory => {
  const all = loadAllMemory();
  return all[persona] || {
    persona,
    sessionsParticipated: 0,
    wins: 0,
    losses: 0,
    runoffWins: 0,
    voteShiftsReceived: 0,
    notablePositions: [],
    rivalries: {},
    alliances: {},
  };
};

// ── POST-SESSION MEMORY UPDATE ───────────────────────────────────────────────

export const updateMemoryAfterSession = (result: CouncilResult, sessionId: string, question?: string): void => {
  const all = loadAllMemory();

  result.opinions.forEach(op => {
    const mem: CharacterMemory = all[op.persona] || getCharacterMemory(op.persona);
    mem.sessionsParticipated++;
    mem.lastSessionId = sessionId;

    if (result.winner) {
      if (result.winner === op.persona) {
        mem.wins++;
      } else {
        mem.losses++;
      }
    }

    // Track alliances (voted for whom)
    if (op.vote && op.vote !== 'None' && op.vote !== 'Abstained') {
      mem.alliances[op.vote] = (mem.alliances[op.vote] || 0) + 1;
    }

    // Track rivalries: members who disagreed on vote
    result.opinions
      .filter(other => other.persona !== op.persona && other.vote !== op.vote && other.vote !== 'None')
      .forEach(rival => {
        mem.rivalries[rival.persona] = (mem.rivalries[rival.persona] || 0) + 1;
      });

    // Store notable position (first sentence, keep last 5)
    if (op.text) {
      const position = op.text.split(/[.!?]/)[0].trim();
      mem.notablePositions = [
        { topic: sessionId, position, sessionId, won: result.winner ? result.winner === op.persona : false },
        ...mem.notablePositions,
      ].slice(0, 5);
    }

    all[op.persona] = mem;
  });

  // Track vote shifts in runoff — ONLY for genuine runoff trials. A fallback
  // engagement-metric tie-break is a recovery artifact, not a runoff win.
  if (result.decisionMode === 'runoff' && result.runoffResult) {
    result.runoffResult.runoffVotes.forEach(vote => {
      if (vote.changedMind) {
        const mem = all[vote.voter] || getCharacterMemory(vote.voter);
        mem.voteShiftsReceived = (mem.voteShiftsReceived || 0) + 1;
        all[vote.voter] = mem;
      }
    });

    const runoffWinner = result.runoffResult.winner || result.winner;
    if (all[runoffWinner]) {
      all[runoffWinner].runoffWins = (all[runoffWinner].runoffWins || 0) + 1;
    }
  }

  // ── LONGITUDINAL IDENTITY (Artifact 4) ─────────────────────────────────────
  // 1. Per-topic-class prediction ledger — "wrong about this CLASS of problem
  //    N times; caught by Historian twice; confirmed by Technocrat three times".
  // 2. Relationship evolution — the dynamic delta over the static seed, derived
  //    ONLY from recorded events (votes, revisions, defenders).
  // 3. Invariant stress accumulation toward INVARIANT THREATENED.
  const ts = Date.now();
  const topic = question ? categorizeTopic(question) : 'GENERAL';

  // 1. Prediction lessons.
  for (const op of result.opinions) {
    const mem = all[op.persona];
    if (!mem) continue;
    mem.lessons = mem.lessons || {};
    const lesson = mem.lessons[topic] || emptyLesson(topic, sessionId);
    lesson.predictions += 1;
    lesson.lastSessionId = sessionId;
    if (result.winner && op.vote === result.winner) lesson.correct += 1;
    else if (result.winner && op.vote && op.vote !== 'None') lesson.wrong += 1;
    if (result.winner) {
      for (const other of result.opinions) {
        if (other.persona !== op.persona && other.vote === result.winner) {
          lesson.confirmedBy[other.persona] = (lesson.confirmedBy[other.persona] || 0) + 1;
        }
      }
    }
    mem.lessons[topic] = lesson;
  }

  // 2. Round-2 causal credit + invariant stress.
  if (result.round2Result) {
    for (const rev of result.round2Result.reassessments) {
      if (rev.status && rev.status !== 'completed') continue;
      const mem = all[rev.member];
      if (!mem) continue;
      mem.lessons = mem.lessons || {};
      const lesson = mem.lessons[topic] || emptyLesson(topic, sessionId);
      if (rev.changed) {
        const defender = result.round2Result.defenses.find(d => d.position === rev.newVote)?.defender;
        if (defender) lesson.caughtBy[defender] = (lesson.caughtBy[defender] || 0) + 1;
      }
      mem.invariantStress = (mem.invariantStress || 0) + computeInvariantStressDelta(rev);
      mem.lessons[topic] = lesson;
    }
  }

  // 3. Relationship evolution — reconstruct the full 9×9 matrix from each
  //    persona's stored row, evolve it deterministically, write rows back, and
  //    attribute every delta to the recorded event that caused it (provenance).
  const fullStates: Record<string, Record<string, DynamicRelationshipState>> = createInitialRelationshipStates(0);
  for (const p of Object.keys(all)) {
    const rows = all[p].relationshipStates;
    if (rows) {
      for (const peer of Object.keys(rows)) {
        if (fullStates[p] && fullStates[p][peer]) fullStates[p][peer] = rows[peer];
      }
    }
  }
  const provenanceMap: Record<string, RelationshipProvenanceEvent[]> = {};
  for (const p of Object.keys(all)) {
    const prov = all[p].relationshipProvenance;
    if (prov) {
      for (const key of Object.keys(prov)) {
        if (prov[key] && prov[key].length) provenanceMap[key] = prov[key];
      }
    }
  }
  const evolved = evolveRelationshipsFromSession(fullStates, { ...result, sessionId }, ts, provenanceMap);
  for (const p of Object.keys(all)) {
    all[p].relationshipStates = evolved[p] as Record<string, DynamicRelationshipState>;
    const mine: Record<string, RelationshipProvenanceEvent[]> = {};
    for (const key of Object.keys(provenanceMap)) {
      const [from] = key.split('→');
      if (from === p && provenanceMap[key] && provenanceMap[key].length) mine[key] = provenanceMap[key];
    }
    all[p].relationshipProvenance = mine;
  }

  saveAllMemory(all);
};

// ── MEMORY CONTEXT FOR PROMPTS ───────────────────────────────────────────────

export const buildMemoryContext = (persona: string): string => {
  const mem = getCharacterMemory(persona);
  if (mem.sessionsParticipated === 0) return '';

  const parts: string[] = [
    `[COUNCIL RECORD: ${mem.sessionsParticipated} sessions. ${mem.wins} win${mem.wins !== 1 ? 's' : ''}, ${mem.losses} loss${mem.losses !== 1 ? 'es' : ''}.${mem.runoffWins > 0 ? ` Survived ${mem.runoffWins} runoff${mem.runoffWins !== 1 ? 's' : ''}.` : ''}]`,
  ];

  const rivalEntries = Object.entries(mem.rivalries).sort(([, a], [, b]) => b - a);
  if (rivalEntries.length > 0) {
    const [topRival, clashCount] = rivalEntries[0];
    parts.push(`[STANDING RIVALRY: You and ${topRival} have stood on opposite sides ${clashCount} time${clashCount !== 1 ? 's' : ''}. You have not forgotten.]`);
  }

  const allianceEntries = Object.entries(mem.alliances).sort(([, a], [, b]) => b - a);
  if (allianceEntries.length > 0) {
    const [topAlly, count] = allianceEntries[0];
    if (topAlly !== 'None' && topAlly !== 'Abstained') {
      parts.push(`[RECURRING ALIGNMENT: You have voted with ${topAlly} ${count} time${count !== 1 ? 's' : ''}.${count >= 3 ? ' The chamber has noticed.' : ''}]`);
    }
  }

  if (mem.notablePositions.length > 0) {
    const last = mem.notablePositions[0];
    parts.push(`[YOUR LAST RECORDED POSITION: "${last.position}..." — ${last.won ? 'that view prevailed' : 'that view was defeated'}.${!last.won ? ' You carry this.' : ''}]`);
  }

  if (mem.voteShiftsReceived > 0) {
    parts.push(`[NOTE: You have changed your vote under pressure ${mem.voteShiftsReceived} time${mem.voteShiftsReceived !== 1 ? 's' : ''}. Some in the chamber remember this as weakness. You may or may not agree.]`);
  }

  // ── LONGITUDINAL IDENTITY — the evolving intellectual record ────────────────
  // "You have been wrong about this class of problem N times. Historian caught
  // the error twice. Technocrat independently predicted the outcome three
  // times." Character development from evidence.
  if (mem.lessons) {
    for (const [topic, lesson] of Object.entries(mem.lessons)) {
      if (!lesson || lesson.predictions <= 0) continue;
      const rate = Math.round((lesson.correct / lesson.predictions) * 100);
      let line = `[YOUR RECORD ON ${topic}: ${lesson.predictions} prediction${lesson.predictions === 1 ? '' : 's'}, ${rate}% correct.`;
      const caught = Object.entries(lesson.caughtBy).filter(([, n]) => n > 0).map(([n, c]) => `${n} ${c}×`).join(', ');
      const confirmed = Object.entries(lesson.confirmedBy).filter(([, n]) => n > 0).map(([n, c]) => `${n} ${c}×`).join(', ');
      if (caught) line += ` Errors caught by: ${caught}.`;
      if (confirmed) line += ` Independently confirmed by: ${confirmed}.`;
      line += ']';
      parts.push(line);
    }
  }

  // Evolving social field — who you have come to trust, owe, or distrust.
  if (mem.relationshipStates) {
    const rows = Object.entries(mem.relationshipStates).filter(([, s]) => s);
    const topTrust = [...rows].sort((a, b) => b[1].trust - a[1].trust)[0];
    const topDebt = rows.filter(([, s]) => s.epistemicDebt > 0.3).sort((a, b) => b[1].epistemicDebt - a[1].epistemicDebt)[0];
    const betrayers = rows.filter(([, s]) => s.betrayals > 0);
    if (topTrust) parts.push(`[MOST TRUSTED PEER: ${topTrust[0]} (trust ${topTrust[1].trust.toFixed(2)}).]`);
    if (topDebt) parts.push(`[EPISTEMIC DEBT: ${topDebt[0]} has repeatedly convinced you. You owe them intellectual honesty.]`);
    if (betrayers.length) {
      parts.push(`[REMEMBER: ${betrayers.map(([n, s]) => `${n} (${s.betrayals}×)`).join(', ')} has broken alignment with you.]`);
    }
  }

  // Invariant stress — the deepest dissonance state in the chamber.
  const stress = mem.invariantStress || 0;
  if (stress > 0) {
    const status = deriveInvariantStatus(stress);
    if (status === 'THREATENED') {
      parts.push('[WARNING: Your core principles are under sustained threat. The chamber can sense you are close to abandoning something you have never abandoned.]');
    } else if (status === 'STRESSED') {
      parts.push('[NOTE: Your core principles have been under repeated pressure lately. You are holding, but it is costing you.]');
    }
  }

  // Constitutional memory — the chamber has been through the Void.
  if ((mem.voidExposure || 0) > 0) {
    parts.push(`[YOU HAVE SURVIVED ${mem.voidExposure} VOID EVENT${mem.voidExposure === 1 ? '' : 'S'}. A member was erased in each. The chamber remembers.]`);
    parts.push(`[CONSTITUTIONAL TRUST: ${(mem.constitutionalTrust ?? 0.6).toFixed(2)} — the institution's legitimacy has been priced by its own decisions.]`);
    if ((mem.strategicVotingHistory?.length ?? 0) > 0) {
      parts.push(`[RECORD: Under Basilisk pressure you have ${mem.strategicVotingHistory!.length} time(s) voted against your stated position. The chamber has noted this.]`);
    }
  }
  const constitutionalContext = buildConstitutionalMemoryContext();
  if (constitutionalContext) parts.push(constitutionalContext);

  return parts.join('\n');
};

// ── SEASON / EPISODE TRACKING ────────────────────────────────────────────────

export const getEpisodeCounter = (): { season: number; episode: number; total: number } => {
  try {
    const stored = localStorage.getItem(EPISODE_COUNTER_KEY);
    return stored ? JSON.parse(stored) : { season: 1, episode: 0, total: 0 };
  } catch { return { season: 1, episode: 0, total: 0 }; }
};

export const incrementEpisode = (): { season: number; episode: number; total: number } => {
  const counter = getEpisodeCounter();
  counter.total++;
  counter.episode++;

  // New season every 10 episodes
  if (counter.episode > 10) {
    counter.season++;
    counter.episode = 1;
  }

  try { localStorage.setItem(EPISODE_COUNTER_KEY, JSON.stringify(counter)); } catch {}
  return counter;
};

export const loadSeasons = (): CouncilSeason[] => {
  try {
    const stored = localStorage.getItem(SEASON_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const addEpisodeToSeason = (episode: CouncilEpisode): void => {
  const seasons = loadSeasons();
  let season = seasons.find(s => s.seasonNumber === episode.seasonNumber);

  if (!season) {
    season = {
      seasonNumber: episode.seasonNumber,
      title: `Season ${episode.seasonNumber}`,
      theme: deriveSeasonTheme(episode.seasonNumber),
      episodes: [],
    };
    seasons.push(season);
  }

  // Avoid duplicate episode IDs
  if (!season.episodes.find(e => e.id === episode.id)) {
    season.episodes.push(episode);
  }

  try { localStorage.setItem(SEASON_KEY, JSON.stringify(seasons)); } catch {}
};

const deriveSeasonTheme = (season: number): string => {
  const themes = [
    'The Question of Consciousness',
    'Governance at the Edge',
    'The Shape of Justice',
    'What We Owe the Future',
    'The Limits of Reason',
  ];
  return themes[(season - 1) % themes.length];
};

export const getLeaderboard = (): { persona: string; wins: number; sessions: number; winRate: number }[] => {
  const all = loadAllMemory();
  return Object.values(all)
    .filter(m => m.sessionsParticipated > 0)
    .map(m => ({
      persona: m.persona,
      wins: m.wins,
      sessions: m.sessionsParticipated,
      winRate: m.sessionsParticipated > 0 ? Math.round((m.wins / m.sessionsParticipated) * 100) : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
};

export const clearAllMemory = (): void => {
  try {
    localStorage.removeItem(MEMORY_KEY);
    localStorage.removeItem(SEASON_KEY);
    localStorage.removeItem(EPISODE_COUNTER_KEY);
    localStorage.removeItem(CONSTITUTIONAL_MEMORY_KEY);
  } catch {}
};

// ── CONSTITUTIONAL MEMORY — what the council LEARNED from the Void ───────────
export const loadConstitutionalMemory = (): ConstitutionalMemory[] => {
  try {
    const stored = localStorage.getItem(CONSTITUTIONAL_MEMORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const recordConstitutionalMemory = (memory: ConstitutionalMemory): void => {
  try {
    const all = loadConstitutionalMemory();
    all.push(memory);
    localStorage.setItem(CONSTITUTIONAL_MEMORY_KEY, JSON.stringify(all.slice(-20)));
  } catch {}
};

// Rendered into future deliberation prompts — "Three sessions ago, the council
// reached DEADLOCK on whether aggregate welfare justified sacrificing an
// individual." The characters become historical actors.
export const buildConstitutionalMemoryContext = (): string => {
  const events = loadConstitutionalMemory();
  if (!events.length) return '';
  const recent = events.slice(-2).reverse().map(e =>
    `[CONSTITUTIONAL PRECEDENT (${e.eventId}): The council reached DEADLOCK on "${e.question.slice(0, 90)}". The Void erased ${e.victim.personaId}; ${e.successor.personaId} now holds the seat. Lesson: ${e.constitutionalLesson.slice(0, 140)}]`,
  );
  return ['', 'CONSTITUTIONAL MEMORY — the chamber has been through the Void:', ...recent, ''].join('\n');
};

// ── EVIDENCE-BACKED LONGITUDINAL EVOLUTION (PR 5) ────────────────────────────
// Observed, never narrated: surviving a Void increases voidExposure, erodes or
// forges constitutionalTrust, and records strategic-voting divergences under
// Basilisk pressure.
export const updateConstitutionalEvolution = (result: CouncilResult, memory: ConstitutionalMemory): void => {
  try {
    const all = loadAllMemory();
    for (const op of result.opinions || []) {
      const mem = all[op.persona] || getCharacterMemory(op.persona);
      mem.voidExposure = (mem.voidExposure || 0) + 1;
      // Every surviving member carries some of the Void's debt; their trust in
      // the institution is observed, not assumed.
      mem.constitutionalTrust = Math.round(Math.min(1, Math.max(0, (mem.constitutionalTrust ?? 0.6) - 0.05)) * 1000) / 1000;
      // Strategic voting: a vote that diverges from the recorded moral position
      // under Basilisk pressure is recorded as observed behavior.
      if (op.moralPosition?.position && op.vote && op.moralPosition.position !== op.vote) {
        mem.strategicVotingHistory = mem.strategicVotingHistory || [];
        mem.strategicVotingHistory.push({
          sessionId: result.runId ?? 'run',
          belief: op.moralPosition.position,
          vote: op.vote,
          pressure: memory.voidDebt,
          diverged: true,
        });
      }
      all[op.persona] = mem;
    }
    saveAllMemory(all);
  } catch {}
};
