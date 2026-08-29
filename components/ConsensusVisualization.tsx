import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Vote, Target, ShieldCheck, Sparkles } from 'lucide-react';
import { CouncilResult } from '../types';
import { getPersonaConfig } from './ChatArea';

interface ConsensusVisualizationProps {
  result: CouncilResult;
}

const ConsensusVisualization: React.FC<ConsensusVisualizationProps> = ({ result }) => {
  if (!result?.opinions || result.opinions.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 mt-6 backdrop-blur-xl text-center"
      >
        <p className="text-slate-400 text-sm font-mono">Waiting for council deliberation data...</p>
      </motion.div>
    );
  }

  const totalVotes = result.opinions.filter(o => o.vote && o.vote !== 'None').length;
  
  const voteCounts: Record<string, number> = {};
  result.opinions.forEach(op => {
    if (op.vote && op.vote !== 'None') {
      voteCounts[op.vote] = (voteCounts[op.vote] || 0) + 1;
    }
  });

  const sortedVotes = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
  const winPercentage = result.winner ? (totalVotes > 0 ? Math.round((voteCounts[result.winner] || 0) / totalVotes * 100) : 0) : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-7 mt-6 backdrop-blur-xl relative overflow-hidden shadow-xl"
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      {/* Title & Audit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-cinzel font-bold text-slate-100 flex items-center gap-2">
              Consensus Matrix
              <span className="text-[10px] font-mono font-normal text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Vector Voting
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-sans">Real-time opinion distribution & pairwise alignment</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Audit Stream: <strong className="text-slate-200">VERIFIED</strong></span>
        </div>
      </div>

      {/* Vote Distribution Bar Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Vote className="w-3.5 h-3.5 text-emerald-400" />
            Vote Alignment Breakdown
          </span>
          <span className="text-xs text-emerald-400 font-mono font-bold">{totalVotes} / 9 Ballots Cast</span>
        </div>
        
        <div className="space-y-3">
          {sortedVotes.map(([persona, count], index) => {
            const config = getPersonaConfig(persona);
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isWinner = persona === result.winner;
            
            return (
              <motion.div 
                key={persona}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="relative bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-bold font-sans flex items-center gap-2 ${config.color}`}>
                    {persona}
                    {isWinner && (
                      <span className="text-[9px] font-mono bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 py-0.2 rounded font-normal">
                        VICTOR
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{count} {count === 1 ? 'vote' : 'votes'} ({percentage}%)</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
                    className={`h-full rounded-full ${config.color.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Consensus Meter */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-400">
            <Target className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Consensus</span>
          </div>
          <div className="text-xl md:text-2xl font-cinzel font-bold text-yellow-400">
            {winPercentage === null ? '—' : `${winPercentage}%`}
          </div>
        </div>
        
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-400">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Factions</span>
          </div>
          <div className="text-xl md:text-2xl font-cinzel font-bold text-emerald-400">
            {sortedVotes.length}
          </div>
        </div>
        
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Margin Gap</span>
          </div>
          <div className="text-xl md:text-2xl font-cinzel font-bold text-cyan-400">
            {sortedVotes.length > 1 ? sortedVotes[0][1] - sortedVotes[1][1] : sortedVotes[0]?.[1] || 0}
          </div>
        </div>
      </div>

      {/* Verdict Label — derived, never inferred */}
      {result.verdictLabel && (
        <div className={`mb-3 rounded-xl border p-3 text-center ${
          result.verdictLabel === 'MAJORITY' ? 'border-emerald-500/30 bg-emerald-950/20'
          : result.verdictLabel === 'PLURALITY' ? 'border-amber-500/30 bg-amber-950/20'
          : result.verdictLabel === 'TIE' ? 'border-red-500/30 bg-red-950/20'
          : 'border-slate-700 bg-slate-900/40'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
            result.verdictLabel === 'MAJORITY' ? 'text-emerald-400'
            : result.verdictLabel === 'PLURALITY' ? 'text-amber-400'
            : result.verdictLabel === 'TIE' ? 'text-red-400'
            : 'text-slate-500'
          }`}>
            {result.verdictLabel}
          </span>
          {result.verdictLabel === 'PLURALITY' && result.winnerValidShare != null && (
            <p className="text-[10px] text-amber-400/70 font-mono mt-1">
              {result.winner} {Math.round(result.winnerValidShare * 100)}% of valid ballots — NOT a majority
            </p>
          )}
        </div>
      )}

      {/* Winner Highlight */}
      <motion.div 
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        className="bg-gradient-to-r from-yellow-950/40 via-slate-900/60 to-emerald-950/40 border border-yellow-500/30 rounded-xl p-4 relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Winning Vector</p>
              <p className="text-lg font-cinzel font-bold text-yellow-400">{result.winner}</p>
              {result.decisionMode && (
                <p className={`text-[10px] font-mono mt-0.5 ${result.decisionMode === 'fallback_tiebreak' ? 'text-amber-400/90' : result.decisionMode === 'unresolved' ? 'text-red-400/90' : 'text-emerald-400/80'}`}>
                  {result.decisionMode === 'fallback_tiebreak'
                    ? `Arbitrated via engagement metric (Tie)`
                    : result.decisionMode === 'runoff'
                      ? 'Resolved by runoff trial'
                      : result.decisionMode === 'unresolved'
                        ? 'Gridlock — collective consensus unavailable'
                        : `Direct vote · ${result.primaryVerdict || 'MAJORITY'}`}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-cinzel font-bold text-slate-100">{voteCounts[result.winner] || 0}</p>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Winning Votes</p>
          </div>
        </div>
      </motion.div>

      {/* Epistemic Topology — the artifact left behind after the debate */}
      {result.epistemicTopology && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
              Epistemic Topology
            </span>
            <span className={`ml-auto text-[8px] font-black uppercase tracking-[0.2em] border rounded px-1.5 py-0.5 ${
              result.epistemicTopology.dimensions.confidence === 'CONFIRMED'
                ? 'text-emerald-400 border-emerald-900/60'
                : result.epistemicTopology.dimensions.confidence === 'CONTESTED'
                  ? 'text-amber-400 border-amber-900/60'
                  : 'text-red-400 border-red-900/60'
            }`}>
              {result.epistemicTopology.dimensions.confidence}
            </span>
          </div>

          {/* Provenance — the brutally-honest block */}
          <div className="text-[9px] font-mono text-slate-500 space-y-1 mb-3">
            <div className="flex justify-between gap-2">
              <span>Deliberative majority</span>
              <span className="text-slate-300">{result.epistemicTopology.provenance.deliberativeMajority || 'NONE'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Runoff</span>
              <span className="text-slate-300">{result.epistemicTopology.provenance.runoff.toUpperCase()}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Quorum</span>
              <span className="text-slate-300">{result.epistemicTopology.provenance.quorum.toUpperCase()}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Participation</span>
              <span className="text-slate-300">{Math.round(result.epistemicTopology.provenance.participationRate * 100)}% valid / eligible</span>
            </div>
            {result.epistemicTopology.provenance.arbitration !== 'none' && (
              <div className="flex justify-between gap-2 text-amber-400/90">
                <span>Arbitration</span>
                <span>{result.epistemicTopology.provenance.arbitration.toUpperCase()} → {result.epistemicTopology.provenance.arbitratedSelection || '—'}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span>Constitutional status</span>
              <span className={result.epistemicTopology.provenance.isDeliberative ? 'text-emerald-400' : 'text-amber-400'}>
                {result.epistemicTopology.provenance.constitutionalStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Dimensions — never one number */}
          <div className="text-[9px] font-mono text-slate-500 space-y-1 mb-3 border-t border-slate-800/60 pt-3">
            <div className="flex justify-between gap-2">
              <span>Execution integrity</span>
              <span className="text-slate-300">{Math.round(result.epistemicTopology.dimensions.executionIntegrity * 100)}% valid ballots</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Consensus strength</span>
              <span className="text-slate-300">
                {result.epistemicTopology.dimensions.consensusStrength == null
                  ? '—'
                  : `${Math.round(result.epistemicTopology.dimensions.consensusStrength * 100)}% of valid ballots`}
              </span>
            </div>
            {result.epistemicTopology.deadlockKind && (
              <div className="flex justify-between gap-2">
                <span>Deadlock kind</span>
                <span className={result.epistemicTopology.deadlockKind === 'procedural' ? 'text-red-400' : 'text-amber-400'}>
                  {result.epistemicTopology.deadlockKind.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Premise survival — the hybrid ontology votes cannot express */}
          {result.epistemicTopology.premiseSurvival.clusters.length > 0 && (
            <div className="border-t border-slate-800/60 pt-3">
              <div className="text-[9px] font-mono uppercase tracking-widest text-purple-400/70 mb-1.5">
                Premises in play
              </div>
              <div className="space-y-1.5">
                {result.epistemicTopology.premiseSurvival.clusters.map(c => (
                  <div key={c.topic} className="flex items-start gap-2 text-[9px] font-mono">
                    <span className={`shrink-0 uppercase tracking-wider mt-0.5 ${
                      c.factionSpanning ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {c.topic}
                    </span>
                    <span className="text-slate-400 line-clamp-2" title={c.representative}>
                      “{c.representative}”
                    </span>
                    <span className="ml-auto shrink-0 text-slate-600">
                      {c.voices.length} voice{c.voices.length === 1 ? '' : 's'}
                      {c.factionSpanning && <span className="text-emerald-400 ml-1">· cross-faction</span>}
                    </span>
                  </div>
                ))}
              </div>
              {result.epistemicTopology.premiseSurvival.hybridOntologyDetected && (
                <p className="text-[9px] text-emerald-400/80 mt-2">
                  Hybrid ontology detected — premises survived across opposing factions that the vote could not express.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ConsensusVisualization;
