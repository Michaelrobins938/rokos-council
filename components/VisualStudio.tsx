import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Loader2, ImageIcon, RefreshCw, X, Trophy, Flame, Swords, BookOpen, Star, Sparkles } from 'lucide-react';
import { generateVerdictSigil, generateSessionMood, PERSONALITIES } from '../services/geminiService';
import { getCachedPortrait, setCachedPortrait, getCachedCoverArt, setCachedCoverArt } from '../services/portraitCacheService';
import { getCharacterMemory, getLeaderboard } from '../services/councilMemoryService';
import { CouncilResult } from '../types';
import { getPersonaConfig } from './ChatArea';

// ── HELPERS ──────────────────────────────────────────────────────────────────

const extractBase64 = (res: any): string | null => {
  const part = res?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  const data = part?.inlineData?.data;
  if (!data) return null;
  return `data:image/png;base64,${data}`;
};

const downloadImage = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ── VERDICT SIGIL ────────────────────────────────────────────────────────────

interface VerdictSigilProps {
  winner: string;
  question: string;
  sessionId: string;
}

export const VerdictSigil: React.FC<VerdictSigilProps> = ({ winner, question, sessionId }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const config = getPersonaConfig(winner);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await generateVerdictSigil(winner, question);
      const url = extractBase64(res);
      if (url) { setImageUrl(url); setRevealed(true); }
    } catch { /* silent fail */ }
    finally { setLoading(false); }
  }, [winner, question]);

  return (
    <div className="flex flex-col items-center my-6">
      <AnimatePresence mode="wait">
        {imageUrl && revealed ? (
          <motion.div
            key="sigil"
            initial={{ scale: 0, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative group"
          >
            <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 ${config.color.replace('text-', 'bg-')}`} />
            <img
              src={imageUrl}
              alt={`${winner} sigil`}
              className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-2 border-slate-700 shadow-2xl relative"
            />
            <button
              onClick={() => downloadImage(imageUrl, `roko-sigil-${winner.toLowerCase()}-${sessionId}.png`)}
              className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Download size={16} className="text-white" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="generate"
            onClick={generate}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-dashed ${config.color.replace('text-', 'border-')} opacity-40 hover:opacity-70 flex flex-col items-center justify-center gap-1 transition-opacity`}
            title="Generate verdict sigil"
          >
            {loading
              ? <Loader2 size={18} className="animate-spin text-slate-400" />
              : <>
                  <Star size={16} className={config.color} />
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Sigil</span>
                </>
            }
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── SESSION MOOD BANNER ───────────────────────────────────────────────────────

interface SessionMoodBannerProps {
  question: string;
  sessionId: string;
}

export const SessionMoodBanner: React.FC<SessionMoodBannerProps> = ({ question, sessionId }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (attempted) return;
    setAttempted(true);
    setLoading(true);
    generateSessionMood(question)
      .then(res => {
        const url = extractBase64(res);
        if (url) setImageUrl(url);
      })
      .catch(() => { /* silent — mood is optional */ })
      .finally(() => setLoading(false));
  }, [question, attempted]);

  if (loading) {
    return (
      <div className="w-full h-16 rounded-xl bg-slate-950 border border-slate-800/40 flex items-center justify-center mb-4">
        <Loader2 size={14} className="animate-spin text-slate-700" />
      </div>
    );
  }

  if (!imageUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="w-full h-24 md:h-32 rounded-2xl overflow-hidden mb-4 relative border border-slate-800/40 group"
    >
      <img src={imageUrl} alt="Session atmosphere" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/90" />
      <button
        onClick={() => downloadImage(imageUrl, `roko-mood-${sessionId}.png`)}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 border border-white/10 text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Download size={11} />
      </button>
    </motion.div>
  );
};

// ── CHARACTER DOSSIER MODAL ───────────────────────────────────────────────────

interface CharacterDossierProps {
  personaName: string;
  onClose: () => void;
}

export const CharacterDossier: React.FC<CharacterDossierProps> = ({ personaName, onClose }) => {
  const [portrait, setPortrait] = useState<string | null>(getCachedPortrait(personaName));
  const config = getPersonaConfig(personaName) as any;
  const persona = PERSONALITIES.find(p => p.name === personaName);
  const memory = getCharacterMemory(personaName);
  const leaderboard = getLeaderboard();
  const rank = leaderboard.findIndex(e => e.persona === personaName) + 1;
  const topRival = Object.entries(memory.rivalries || {}).sort(([, a], [, b]) => (b as number) - (a as number))[0];
  const topAlly = Object.entries(memory.alliances || {})
    .filter(([k]) => k !== 'None' && k !== 'Abstained')
    .sort(([, a], [, b]) => (b as number) - (a as number))[0];

  const colorBg = config.color.replace('text-', 'bg-');
  const colorBorder = config.color.replace('text-', 'border-');
  const colorFrom = config.color.replace('text-', 'from-');

  const sections = [
    config.backstory && { id: 'origin', label: 'Origin', icon: <BookOpen size={12} />, content: config.backstory, style: 'prose' },
    config.weapon && { id: 'weapon', label: 'Rhetorical Weapon', icon: <Flame size={12} />, content: config.weapon, style: 'accent' },
    config.weakness && { id: 'weakness', label: 'Structural Weakness', icon: <Sparkles size={12} />, content: config.weakness, style: 'muted' },
    config.fears && { id: 'fears', label: 'What It Fears', icon: <Star size={12} />, content: config.fears, style: 'warning' },
    config.appearance && { id: 'appearance', label: 'Appearance', icon: <Sparkles size={12} />, content: config.appearance, style: 'italic' },
    config.speakingStyle && { id: 'voice', label: 'Voice Pattern', icon: <BookOpen size={12} />, content: config.speakingStyle, style: 'muted' },
  ].filter(Boolean) as { id: string; label: string; icon: React.ReactNode; content: string; style: string }[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-slate-950 rounded-[2rem] overflow-hidden max-w-4xl w-full shadow-[0_0_120px_rgba(0,0,0,0.9)] max-h-[92vh] flex flex-col"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Ambient top glow matching character color */}
        <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent ${colorBg} to-transparent opacity-80`} />
        <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-64 blur-[120px] opacity-15 ${colorBg} pointer-events-none`} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-900/80 text-slate-500 hover:text-white border border-slate-800/60 transition-colors backdrop-blur-sm"
        >
          <X size={14} />
        </button>

        {/* Layout: hero header + scrollable body */}
        <div className="flex flex-col overflow-hidden">

          {/* ── HERO HEADER ── */}
          <div className={`relative flex flex-col md:flex-row items-center md:items-end gap-6 px-8 pt-8 pb-6 border-b border-slate-800/40 overflow-hidden`}>
            {/* BG atmosphere */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorFrom}/5 to-transparent pointer-events-none`} />

            {/* Character orb */}
            <div className="relative shrink-0">
              <div className={`absolute inset-0 ${colorBg} blur-2xl opacity-20 rounded-full`} />
              {portrait ? (
                <img
                  src={portrait}
                  alt={personaName}
                  className={`relative w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-2 ${colorBorder}/40 shadow-2xl`}
                />
              ) : (
                <motion.div
                  animate={{ boxShadow: [`0 0 20px rgba(0,0,0,0)`, `0 0 40px rgba(0,0,0,0.4)`, `0 0 20px rgba(0,0,0,0)`] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className={`relative w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 ${colorBorder}/40 flex items-center justify-center shadow-2xl`}
                >
                  <div className={`${config.color} scale-[2.5]`}>{config.icon}</div>
                </motion.div>
              )}
              {/* Rank badge */}
              {rank > 0 && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center shadow-lg">
                  <span className="text-[9px] font-black text-slate-950">#{rank}</span>
                </div>
              )}
            </div>

            {/* Identity block */}
            <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${config.color} opacity-70`}>Council Member</span>
                <div className={`h-px w-8 ${colorBg} opacity-40`} />
              </div>
              <h2 className={`text-4xl md:text-5xl font-cinzel font-black ${config.color} leading-none mb-2`} style={{ letterSpacing: '0.1em' }}>
                {personaName.toUpperCase()}
              </h2>
              <p className="text-base text-slate-400 font-light tracking-[0.2em] uppercase mb-3">{config.tagline}</p>

              {/* Stats strip */}
              <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
                {config.voice && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border ${colorBorder}/30 text-[10px] font-mono ${config.color}`}>
                    <span className="opacity-60">voice:</span> {config.voice}
                  </div>
                )}
                {memory.sessionsParticipated > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/20 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                      <Trophy size={8} /> {memory.wins}W
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-900/20 border border-red-500/20 text-[10px] font-mono text-red-400">
                      {memory.losses}L
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── SCROLLABLE BODY ── */}
          <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-4 custom-scrollbar">

            {/* Character sections grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {sections.map((sec, i) => (
                <motion.div
                  key={sec.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`p-4 rounded-2xl border relative overflow-hidden ${
                    sec.style === 'accent'
                      ? `${colorBorder}/30 bg-slate-900/60`
                      : sec.style === 'warning'
                      ? 'border-red-500/20 bg-red-950/10'
                      : 'border-slate-800/50 bg-slate-900/40'
                  } ${sec.id === 'origin' ? 'md:col-span-2' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`${sec.style === 'accent' ? config.color : sec.style === 'warning' ? 'text-red-400' : 'text-slate-500'}`}>{sec.icon}</div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${sec.style === 'accent' ? config.color : sec.style === 'warning' ? 'text-red-400' : 'text-slate-500'}`}>{sec.label}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    sec.style === 'italic' ? 'italic text-slate-300' :
                    sec.style === 'accent' ? `text-slate-200` :
                    sec.style === 'warning' ? 'text-slate-300' :
                    'text-slate-400'
                  }`}>
                    {sec.content}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Voice examples */}
            {persona?.voiceExamples && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`p-4 rounded-2xl border ${colorBorder}/20 bg-slate-900/30`}
              >
                <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${config.color} opacity-70 mb-3`}>In Its Own Words</p>
                <div className="space-y-3">
                  <div className={`pl-4 border-l-2 ${colorBorder}/60`}>
                    <p className="text-sm text-slate-200 italic leading-relaxed">"{persona.voiceExamples.opening}"</p>
                    <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase tracking-widest">Opening</p>
                  </div>
                  <div className={`pl-4 border-l-2 ${colorBorder}/30`}>
                    <p className="text-sm text-slate-400 italic leading-relaxed">"{persona.voiceExamples.closing}"</p>
                    <p className="text-[9px] text-slate-600 mt-1 font-mono uppercase tracking-widest">Closing</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Council Record */}
            {memory.sessionsParticipated > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-4 rounded-2xl border border-slate-800/50 bg-slate-900/30"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Council Record</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Sessions', value: memory.sessionsParticipated, color: 'text-slate-200' },
                    { label: 'Victories', value: memory.wins, color: 'text-emerald-400' },
                    { label: 'Defeats', value: memory.losses, color: 'text-red-400' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-3 rounded-xl bg-slate-950/50 border border-slate-800/40">
                      <p className={`text-2xl font-cinzel font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {topRival && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Swords size={10} className="text-red-400 shrink-0" />
                      <span className="text-slate-600">Standing rival:</span>
                      <span className={`font-bold ${getPersonaConfig(topRival[0]).color}`}>{topRival[0]}</span>
                      <span className="text-slate-700 text-[10px]">{topRival[1]} clashes</span>
                    </div>
                  )}
                  {topAlly && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Star size={10} className="text-amber-400 shrink-0" />
                      <span className="text-slate-600">Recurring ally:</span>
                      <span className={`font-bold ${getPersonaConfig(topAlly[0]).color}`}>{topAlly[0]}</span>
                      <span className="text-slate-700 text-[10px]">{topAlly[1]} agreements</span>
                    </div>
                  )}
                </div>
                {memory.notablePositions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/40">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Last Recorded Position</p>
                    <p className="text-xs text-slate-400 italic leading-relaxed">
                      "{memory.notablePositions[0].position}…"
                    </p>
                    <span className={`text-[9px] font-bold ${memory.notablePositions[0].won ? 'text-emerald-500' : 'text-red-500'} uppercase tracking-widest`}>
                      {memory.notablePositions[0].won ? '↑ Prevailed' : '↓ Defeated'}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- DUMMY COMPONENT TO PREVENT CRASHES & 429 ERRORS ---
export const CoverArtPanel: React.FC<{ result: any, sessionId: string, query: string }> = () => {
    // Cover art generation disabled to save API quota
    return null;
};
