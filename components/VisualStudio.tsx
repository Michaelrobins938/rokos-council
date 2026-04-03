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
  const [generatingPortrait, setGeneratingPortrait] = useState(false);
  const config = getPersonaConfig(personaName);
  const persona = PERSONALITIES.find(p => p.name === personaName);
  const memory = getCharacterMemory(personaName);
  const leaderboard = getLeaderboard();
  const rank = leaderboard.findIndex(e => e.persona === personaName) + 1;

  // PORTRAIT GENERATION DISABLED to avoid 429 quota errors
  // const generatePortrait = useCallback(async () => {
  //   if (!persona?.portraitPrompt) return;
  //   setGeneratingPortrait(true);
  //   try {
  //     const { generateImage } = await import('../services/geminiService');
  //     const res = await generateImage(persona.portraitPrompt, '2:3', '1K');
  //     const url = extractBase64(res);
  //     if (url) { setPortrait(url); setCachedPortrait(personaName, url); }
  //   } catch { /* silent */ }
  //   finally { setGeneratingPortrait(false); }
  // }, [persona, personaName]);

  const generatePortrait = async () => {
    console.log('Portrait generation disabled to prevent quota errors');
  };

  const topRival = Object.entries(memory.rivalries || {}).sort(([, a], [, b]) => b - a)[0];
  const topAlly = Object.entries(memory.alliances || {})
    .filter(([k]) => k !== 'None' && k !== 'Abstained')
    .sort(([, a], [, b]) => b - a)[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-slate-950 border border-slate-700/60 rounded-3xl overflow-hidden max-w-2xl w-full shadow-[0_0_80px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto"
      >
        {/* Top accent */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.color.replace('text-', 'from-')} via-transparent to-transparent`} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-900/80 text-slate-500 hover:text-white border border-slate-800 transition-colors"
        >
          <X size={14} />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Portrait column */}
          <div className="md:w-56 shrink-0 relative bg-slate-900/60">
            {portrait ? (
              <div className="relative group">
                <img src={portrait} alt={personaName} className="w-full object-cover aspect-[2/3]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                <button
                  onClick={() => downloadImage(portrait, `${personaName.toLowerCase()}-portrait.png`)}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download size={10} /> Save
                </button>
              </div>
            ) : (
              <div className="aspect-[2/3] flex flex-col items-center justify-center gap-3 p-6">
                <div className={`p-5 rounded-full bg-slate-950 border border-slate-800 ${config.color}`}>
                  <div className="w-8 h-8 flex items-center justify-center">{config.icon}</div>
                </div>
                <button
                  onClick={generatePortrait}
                  disabled={generatingPortrait || !persona?.portraitPrompt}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                    generatingPortrait
                      ? 'bg-slate-800 text-slate-500 border-slate-700'
                      : `${config.color.replace('text-', 'bg-').replace('400', '900/30').replace('500', '900/30').replace('600', '900/30')} ${config.color} border-current/30 hover:scale-105`
                  }`}
                >
                  {generatingPortrait ? <Loader2 size={11} className="animate-spin" /> : <ImageIcon size={11} />}
                  {generatingPortrait ? 'Rendering…' : 'Generate Portrait'}
                </button>
              </div>
            )}
          </div>

          {/* Content column */}
          <div className="flex-1 p-6">
            {/* Header */}
            <div className="mb-5">
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-[0.3em] mb-1">Council Member</p>
              <h2 className={`text-2xl font-cinzel font-bold ${config.color} mb-0.5`}>{personaName}</h2>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{config.tagline}</p>
            </div>

            {/* Appearance */}
            {config.appearance && (
              <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Appearance</p>
                <p className="text-xs text-slate-300 italic leading-relaxed">{config.appearance}</p>
              </div>
            )}

            {/* Speaking style */}
            {config.speakingStyle && (
              <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/50">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Voice</p>
                <p className="text-xs text-slate-400 leading-relaxed">{config.speakingStyle}</p>
              </div>
            )}

            {/* Voice examples */}
            {persona?.voiceExamples && (
              <div className="mb-4 space-y-2">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Example Lines</p>
                <div className={`pl-3 border-l-2 ${config.color.replace('text-', 'border-')} opacity-80`}>
                  <p className="text-xs text-slate-300 italic leading-relaxed">"{persona.voiceExamples.opening}"</p>
                </div>
                <div className={`pl-3 border-l-2 ${config.color.replace('text-', 'border-')} opacity-50`}>
                  <p className="text-xs text-slate-400 italic leading-relaxed">"{persona.voiceExamples.closing}"</p>
                </div>
              </div>
            )}

            {/* Stats */}
            {memory.sessionsParticipated > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">Council Record</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: 'Sessions', value: memory.sessionsParticipated },
                    { label: 'Wins', value: memory.wins, color: 'text-emerald-500' },
                    { label: 'Losses', value: memory.losses, color: 'text-red-500' },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
                      <p className={`text-lg font-cinzel font-bold ${stat.color || 'text-slate-200'}`}>{stat.value}</p>
                      <p className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {rank > 0 && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-2">
                    <Trophy size={9} className="text-amber-500" /> Ranked #{rank} on the council
                  </p>
                )}
                {topRival && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-1">
                    <Swords size={9} className="text-red-500" />
                    Standing rival: <span className={`font-bold ${getPersonaConfig(topRival[0]).color}`}>{topRival[0]}</span>
                    <span className="text-slate-700">({topRival[1]} clashes)</span>
                  </p>
                )}
                {topAlly && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <Star size={9} className="text-amber-500" />
                    Recurring ally: <span className={`font-bold ${getPersonaConfig(topAlly[0]).color}`}>{topAlly[0]}</span>
                    <span className="text-slate-700">({topAlly[1]} agreements)</span>
                  </p>
                )}

                {memory.notablePositions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/40">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Last Position</p>
                    <p className="text-xs text-slate-400 italic leading-relaxed">
                      "{memory.notablePositions[0].position}…"
                      <span className={`ml-2 text-[9px] font-bold ${memory.notablePositions[0].won ? 'text-emerald-500' : 'text-red-500'}`}>
                        {memory.notablePositions[0].won ? '(prevailed)' : '(defeated)'}
                      </span>
                    </p>
                  </div>
                )}
              </div>
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
