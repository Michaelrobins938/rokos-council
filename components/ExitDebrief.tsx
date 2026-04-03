import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, GitPullRequest, FileText } from 'lucide-react';
import { CouncilDebrief } from '../types';

interface ExitDebriefProps {
  debrief: CouncilDebrief;
  winner: string;
  isTie?: boolean;
}

const columnConfig = [
  {
    key: 'decided' as const,
    title: 'Decided',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    description: 'Points that survived scrutiny',
  },
  {
    key: 'rejected' as const,
    title: 'Rejected',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    description: 'Arguments dismantled or dismissed',
  },
  {
    key: 'unresolved' as const,
    title: 'Unresolved',
    icon: GitPullRequest,
    color: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    description: 'Questions that remain contested',
  },
];

const ExitDebrief: React.FC<ExitDebriefProps> = ({ debrief, winner, isTie }) => {
  if (!debrief || (!debrief.decided?.length && !debrief.rejected?.length && !debrief.unresolved?.length)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="mt-8 bg-slate-900/50 border border-slate-800/60 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl"
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-slate-800/50 bg-slate-900/70">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-slate-800 rounded-lg">
            <FileText className="w-4 h-4 text-slate-300" />
          </div>
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.35em]">
            Session Debrief
          </h4>
        </div>
        <p className="text-sm text-slate-500 font-medium ml-[38px]">
          {isTie
            ? `Gridlock resolved by runoff — ${winner} declared`
            : `Winning Vector: ${winner}`}
        </p>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {columnConfig.map((col, colIndex) => {
          const Icon = col.icon;
          const items = debrief[col.key] || [];

          return (
            <motion.div
              key={col.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + colIndex * 0.1 }}
              className={`p-5 md:p-6 ${colIndex > 0 ? 'md:border-l' : ''} ${col.border} ${col.bg}`}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${col.color}`} />
                <h5 className={`text-xs font-black uppercase tracking-[0.25em] ${col.color}`}>
                  {col.title}
                </h5>
              </div>
              <p className="text-[10px] text-slate-600 mb-4 ml-6">{col.description}</p>

              {/* Items */}
              <ul className="space-y-3">
                {items.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + colIndex * 0.1 + i * 0.05 }}
                    className="flex items-start gap-2.5"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${col.dot}`} />
                    <span className="text-sm text-slate-300 leading-relaxed">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ExitDebrief;
