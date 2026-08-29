import React from 'react';
import { Users, TrendingUp, TrendingDown, History } from 'lucide-react';
import { PERSONA_NAMES } from '../services/personaBible';
import { getRelationshipEdge } from '../services/relationshipGraph';
import { loadAllMemory } from '../services/councilMemoryService';
import { RelationshipArchetype, RelationshipEdge } from '../types';

interface Props {
  persona: string;
}

const ARCHETYPE_COLORS: Record<RelationshipArchetype, string> = {
  Ally: 'text-emerald-300 border-emerald-500/40',
  Mentor: 'text-sky-300 border-sky-500/40',
  Apprentice: 'text-sky-300 border-sky-500/40',
  Counterweight: 'text-cyan-300 border-cyan-500/40',
  Mirror: 'text-violet-300 border-violet-500/40',
  Rival: 'text-amber-300 border-amber-500/40',
  Skeptic: 'text-amber-300 border-amber-500/40',
  Adversary: 'text-red-300 border-red-500/40',
  Wildcard: 'text-fuchsia-300 border-fuchsia-500/40',
};

const Bar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[9px] font-mono text-slate-500 w-[86px] shrink-0 text-right">{label}</span>
    <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
    <span className="text-[9px] font-mono text-slate-400 w-8">{value.toFixed(2)}</span>
  </div>
);

const Delta = ({ current, seed }: { current: number; seed: number }) => {
  const diff = current - seed;
  if (Math.abs(diff) < 0.015) return <span className="text-[9px] font-mono text-slate-600">·</span>;
  return diff > 0
    ? <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5"><TrendingUp size={9} />+{diff.toFixed(2)}</span>
    : <span className="text-[9px] font-mono text-red-400 flex items-center gap-0.5"><TrendingDown size={9} />{diff.toFixed(2)}</span>;
};

export const RelationshipGraphPanel: React.FC<Props> = ({ persona }) => {
  const all = loadAllMemory();
  const myMem = all[persona];
  const states = myMem?.relationshipStates || {};
  const provenance = myMem?.relationshipProvenance || {};
  const peers = PERSONA_NAMES.filter(n => n !== persona);

  return (
    <div className="space-y-2">
      <div className="border border-slate-800 rounded-xl bg-slate-900/70 p-2.5 flex items-center gap-2">
        <Users size={12} className="text-emerald-400" />
        <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">Social field — {persona}'s view of the chamber</span>
        <span className="ml-auto text-[9px] font-mono text-slate-600">{peers.length} edges · dynamic vs static</span>
      </div>

      {peers.map(peer => {
        const edge: RelationshipEdge = getRelationshipEdge(persona, peer);
        const dyn = states[peer];
        const events = provenance[`${persona}→${peer}`] || [];
        const last3 = events.slice(-3).reverse();
        const dynSeed = getRelationshipEdge(persona, peer);
        return (
          <div key={peer} className="border border-slate-800 rounded-xl bg-slate-900/50 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-cinzel font-bold text-xs text-slate-100">{peer}</span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${ARCHETYPE_COLORS[edge.archetype]}`}>{edge.archetype}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Bar label="trust" value={dyn ? dyn.trust : edge.trust} color="bg-emerald-500" />
                {dyn && <Delta current={dyn.trust} seed={dynSeed.trust} />}
              </div>
              <div className="flex items-center gap-1.5">
                <Bar label="respect" value={dyn ? dyn.respect : edge.respect} color="bg-sky-500" />
                {dyn && <Delta current={dyn.respect} seed={dynSeed.respect} />}
              </div>
              <div className="flex items-center gap-1.5">
                <Bar label="agreement" value={dyn ? dyn.agreement : 1 - edge.ideologicalDistance} color="bg-cyan-500" />
              </div>
              <div className="flex items-center gap-1.5">
                <Bar label="status tension" value={dyn ? dyn.irritation : edge.statusTension * 0.5} color="bg-amber-500" />
              </div>
              <div className="flex items-center gap-1.5">
                <Bar label="alliance" value={edge.allianceStrength} color="bg-violet-500" />
              </div>
            </div>
            {dyn && (
              <div className="mt-1.5 flex flex-wrap gap-1 text-[9px] font-mono text-slate-500">
                <span className="bg-slate-800/80 px-1.5 py-0.5 rounded">debt {dyn.epistemicDebt.toFixed(2)}</span>
                <span className="bg-slate-800/80 px-1.5 py-0.5 rounded">challenges {dyn.recentChallenges}</span>
                <span className="bg-slate-800/80 px-1.5 py-0.5 rounded">predictions {dyn.successfulPredictions}</span>
                {dyn.betrayals > 0 && <span className="bg-red-500/10 border border-red-500/30 text-red-300 px-1.5 py-0.5 rounded">betrayals {dyn.betrayals}</span>}
              </div>
            )}
            {last3.length > 0 && (
              <div className="mt-2 border-t border-slate-800 pt-1.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600"><History size={9} /> character history</div>
                {last3.map((e, i) => (
                  <div key={i} className="text-[9px] font-mono text-slate-500">
                    <span className="text-slate-400">S{e.sessionId}</span> · {e.type.replace(/_/g, ' ')} → {e.field} {e.delta >= 0 ? '+' : ''}{e.delta.toFixed(2)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default RelationshipGraphPanel;

