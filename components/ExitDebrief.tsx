import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, GitPullRequest, ShieldCheck, Scale, Award } from 'lucide-react';
import { CouncilDebrief } from '../types';

interface ExitDebriefProps {
  debrief: CouncilDebrief;
  winner: string;
  isTie?: boolean;
  decisionMode?: string;
}

const columnConfig = [
  {
    key: 'decided' as const,
    title: 'Decided',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    headerBg: 'bg-emerald-500/10 border-emerald-500/30',
    bg: 'bg-gradient-to-b from-emerald-950/20 to-slate-900/40',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    description: 'Points that survived intense scrutiny',
  },
  {
    key: 'rejected' as const,
    title: 'Rejected',
    icon: XCircle,
    color: 'text-red-400',
    headerBg: 'bg-red-500/10 border-red-500/30',
    bg: 'bg-gradient-to-b from-red-950/20 to-slate-900/40',
    border: 'border-red-500/20',
    dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
    description: 'Arguments dismantled or dismissed',
  },
  {
    key: 'unresolved' as const,
    title: 'Unresolved',
    icon: GitPullRequest,
    color: 'text-amber-400',
    headerBg: 'bg-amber-500/10 border-amber-500/30',
    bg: 'bg-gradient-to-b from-amber-950/20 to-slate-900/40',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    description: 'Questions that remain contested',
  },
];

const ExitDebrief: React.FC<ExitDebriefProps> = ({ debrief, winner, decisionMode }) => {
  if (!debrief || (!debrief.decided?.length && !debrief.rejected?.length && !debrief.unresolved?.length)) {
    return null;
  }

  const subtitle = decisionMode === 'fallback_tiebreak'
    ? `Council Tie — ${winner} selected by engagement metric (no runoff)`
    : decisionMode === 'runoff'
      ? `Gridlock resolved by runoff — ${winner} declared victor`
      : decisionMode === 'plurality'
        ? `${winner} holds a contested plurality — no majority established`
        : decisionMode === 'unresolved'
          ? 'Council outcome unavailable — no valid collective decision'
          : `Winning Vector: ${winner}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10 bg-slate-900/80 border border-slate-800/80 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl relative group"
    >
      {/* Top Hairline Highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-amber-500/50" />

      {/* Header */}
      <div className="p-6 md:p-8 border-b border-slate-800/60 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-slate-950/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-[0.3em]">
              ACT III · VERDICT LOOM
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-cinzel font-bold text-slate-100 tracking-wide">
            Final Session Debrief
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-1">
            {subtitle}
          </p>
        </div>

        {/* Audit Badge */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-emerald-500/30 rounded-xl px-3.5 py-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Audited & Hash-Chained
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              council-audit-v1 · Immutable
            </span>
          </div>
        </div>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-800/40">
        {columnConfig.map((col, colIndex) => {
          const Icon = col.icon;
          const items = debrief[col.key] || [];

          return (
            <motion.div
              key={col.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + colIndex * 0.1 }}
              className={`p-6 md:p-7 ${col.bg} flex flex-col justify-between`}
            >
              <div>
                {/* Column header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${col.headerBg}`}>
                      <Icon className={`w-4 h-4 ${col.color}`} />
                    </div>
                    <h4 className={`text-xs font-mono font-bold uppercase tracking-[0.25em] ${col.color}`}>
                      {col.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                    {items.length} {items.length === 1 ? 'Point' : 'Points'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-5 ml-0.5 font-sans leading-tight">
                  {col.description}
                </p>

                {/* Items */}
                {items.length > 0 ? (
                  <ul className="space-y-3">
                    {items.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 + colIndex * 0.1 + i * 0.05 }}
                        className="flex items-start gap-3 group/item"
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${col.dot}`} />
                        <span className="text-xs text-slate-200 leading-relaxed font-sans group-hover/item:text-white transition-colors">
                          {item}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-6 text-center border border-dashed border-slate-800/80 rounded-xl">
                    <p className="text-xs text-slate-600 font-mono italic">No items recorded in this section</p>
                  </div>
                )}
              </div>

              {/* Bottom accent label */}
              <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span className="uppercase tracking-widest">{col.key} Vector</span>
                <Award className="w-3 h-3 text-slate-600 opacity-60" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ExitDebrief;
