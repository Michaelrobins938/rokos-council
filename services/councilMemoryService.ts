import { CharacterMemory, CouncilEpisode, CouncilResult, CouncilSeason } from '../types';

const MEMORY_KEY = 'rokos_council_character_memory';
const SEASON_KEY = 'rokos_council_seasons';
const EPISODE_COUNTER_KEY = 'rokos_council_episode_counter';

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

export const updateMemoryAfterSession = (result: CouncilResult, sessionId: string): void => {
  const all = loadAllMemory();

  result.opinions.forEach(op => {
    const mem: CharacterMemory = all[op.persona] || getCharacterMemory(op.persona);
    mem.sessionsParticipated++;
    mem.lastSessionId = sessionId;

    if (result.winner === op.persona) {
      mem.wins++;
    } else {
      mem.losses++;
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
        { topic: sessionId, position, sessionId, won: result.winner === op.persona },
        ...mem.notablePositions,
      ].slice(0, 5);
    }

    all[op.persona] = mem;
  });

  // Track vote shifts in runoff
  if (result.runoffResult) {
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
  } catch {}
};
