import React from 'react';
import { ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { Round2Result, DissonanceRecord } from '../types';

interface Props {
  round2Result?: Round2Result | null;
}

const movementTone = (m?: string) =>
  m === 'SHIFTED' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
    : m === 'REINFORCED' ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
    : m === 'WEAKENED' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
    : 'bg-slate-700/40 border-slate-600/40 text-slate-300';

const Chain = ({ label, value, tone }: { label: string; value?: string | number; tone: 'fact' | 'interpretation' }) => (
  <div className="flex items-start gap-2 py-1">
    <div className={`w-16 shrink-0 text-[9px] font-mono uppercase tracking-wider pt-0.5 ${tone === 'fact' ? 'text-emerald-500' : 'text-amber-500'}`}>{label}</div>
    <div className={`text-xs leading-relaxed ${tone === 'fact' ? 'text-slate-200' : 'text-slate-300 italic'}`}>
      {value ?? '—'}
      <span className={`ml-1.5 text-[8px] font-mono uppercase px-1 py-0.5 rounded border ${tone === 'fact' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
        {tone === 'fact' ? 'ledger' : 'reported'}
      </span>
    </div>
  </div>
);

export const DissonanceViewer: React.FC<Props> = ({ round2Result }) => {
  const revisions: DissonanceRecord[] = round2Result?.reassessments || [];
  if (!round2Result || revisions.length === 0) {
    return (
      <div className="border border-slate-800 rounded-xl bg-slate-900/50 p-4 text-xs text-slate-500">
        No Round 2 reassessment records for the selected session. Run a session that required a Round 2 adjudication to see the dissonance ledger.
      </div>
    );
  }
  const movement = round2Result.movementBreakdown || { SHIFTED: 0, REINFORCED: 0, WEAKENED: 0, STABLE: 0 };

  return (
    <div className="space-y-2.5">
      <div className="border border-slate-800 rounded-xl bg-slate-900/70 p-2.5">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-emerald-400" />
          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">Dissonance ledger</span>
          <span className="ml-auto text-[9px] font-mono text-slate-500">
            SHIFTED {movement.SHIFTED} · REINFORCED {movement.REINFORCED} · WEAKENED {movement.WEAKENED} · STABLE {movement.STABLE}
          </span>
        </div>
        <p className="mt-1 text-[9px] font-mono text-slate-600">
          Emerald = derived from the immutable ledger · Amber = model-reported interpretation. The two are never conflated.
        </p>
      </div>

      {revisions.map((r, idx) => (
        <div key={`${r.member}-${idx}`} className="border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/80">
            <span className="font-cinzel font-bold text-xs text-slate-100">{r.member}</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${movementTone(r.movement)}`}>{r.movement || 'STABLE'}</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 pb-1.5">
              <span className="text-xs font-mono text-slate-400 bg-slate-800/70 px-2 py-1 rounded">{r.originalVote}</span>
              <ArrowRight size={12} className="text-slate-500" />
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded">{r.newVote}</span>
            </div>
            <Chain label="Position" value={r.newVote} tone="fact" />
            <Chain label="Conf. before" value={r.confidenceBefore.toFixed(2)} tone="fact" />
            <Chain label="Challenge" value={r.trigger} tone="interpretation" />
            <Chain label="Dissonance" value={typeof r.dissonance === 'number' ? r.dissonance.toFixed(2) : undefined} tone="interpretation" />
            <Chain label="Defense" value={r.defense} tone="interpretation" />
            <Chain label="Resolution" value={r.resolution} tone="interpretation" />
            <Chain label="Conf. after" value={r.confidenceAfter.toFixed(2)} tone="fact" />
            <div className="mt-1.5 border-t border-slate-800 pt-1.5 flex items-start gap-2">
              <div className="w-16 shrink-0 text-[9px] font-mono uppercase tracking-wider text-slate-500 pt-0.5">Argued by</div>
              <div className="text-[10px] font-mono text-slate-400 leading-relaxed flex items-start gap-1">
                <ShieldCheck size={10} className="mt-0.5 text-slate-600 shrink-0" />
                {r.decisiveArgument}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DissonanceViewer;
