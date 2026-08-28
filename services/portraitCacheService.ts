const PORTRAIT_KEY = 'rokos_council_portraits';
const COVER_ART_KEY = 'rokos_council_cover_art';

// ── CHARACTER PORTRAITS ──────────────────────────────────────────────────────

export const getCachedPortrait = (persona: string): string | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(PORTRAIT_KEY) || '{}');
    return cache[persona] || null;
  } catch { return null; }
};

export const setCachedPortrait = (persona: string, dataUrl: string): void => {
  try {
    const cache = JSON.parse(localStorage.getItem(PORTRAIT_KEY) || '{}');
    cache[persona] = dataUrl;
    localStorage.setItem(PORTRAIT_KEY, JSON.stringify(cache));
  } catch {}
};

export const getAllCachedPortraits = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(PORTRAIT_KEY) || '{}');
  } catch { return {}; }
};

export const clearPortraitCache = (): void => {
  try { localStorage.removeItem(PORTRAIT_KEY); } catch {}
};

// ── EPISODE COVER ART ────────────────────────────────────────────────────────

export const getCachedCoverArt = (sessionId: string): string | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(COVER_ART_KEY) || '{}');
    return cache[sessionId] || null;
  } catch { return null; }
};

export const setCachedCoverArt = (sessionId: string, dataUrl: string): void => {
  try {
    const cache = JSON.parse(localStorage.getItem(COVER_ART_KEY) || '{}');
    // Keep only last 20 to avoid storage bloat
    const keys = Object.keys(cache);
    if (keys.length >= 20) delete cache[keys[0]];
    cache[sessionId] = dataUrl;
    localStorage.setItem(COVER_ART_KEY, JSON.stringify(cache));
  } catch {}
};
