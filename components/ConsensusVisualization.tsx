import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, PieChart, TrendingUp, Users, Vote, Target } from 'lucide-react';
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
        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mt-6"
      >
        <p className="text-slate-400 text-center">Waiting for voting data...</p>
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
  const maxVotes = sortedVotes[0]?.[1] || 1;

  const winPercentage = totalVotes > 0 ? Math.round((voteCounts[result.winner] || 0) / totalVotes * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mt-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/20 rounded-lg">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-cinzel font-bold text-slate-100">Consensus Matrix</h3>
          <p className="text-xs text-slate-500">Real-time opinion distribution</p>
        </div>
      </div>

      {/* Vote Distribution Bar Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Vote className="w-3 h-3" />
            Vote Distribution
          </span>
          <span className="text-xs text-emerald-400 font-mono">{totalVotes} Total Votes</span>
        </div>
        
        <div className="space-y-2">
          {sortedVotes.map(([persona, count], index) => {
            const config = getPersonaConfig(persona);
            const percentage = Math.round((count / totalVotes) * 100);
            
            return (
              <motion.div 
                key={persona}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${config.color}`}>{persona}</span>
                  <span className="text-xs text-slate-400">{count} votes ({percentage}%)</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`h-full ${config.color.replace('text-', 'bg-')}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Consensus Meter */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-950/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-slate-500 uppercase">Consensus</span>
          </div>
          <div className="text-2xl font-cinzel font-bold text-yellow-400">{winPercentage}%</div>
        </div>
        
        <div className="bg-slate-950/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500 uppercase">Factions</span>
          </div>
          <div className="text-2xl font-cinzel font-bold text-emerald-400">{sortedVotes.length}</div>
        </div>
        
        <div className="bg-slate-950/50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-cyan-500" />
            <span className="text-xs text-slate-500 uppercase">Gap</span>
          </div>
          <div className="text-2xl font-cinzel font-bold text-cyan-400">
            {sortedVotes.length > 1 ? sortedVotes[0][1] - sortedVotes[1][1] : 0}
          </div>
        </div>
      </div>

      {/* Winner Highlight */}
      <motion.div 
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-gradient-to-r from-yellow-900/30 to-emerald-900/30 border border-yellow-500/30 rounded-xl p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Target className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Winning Vector</p>
              <p className="text-lg font-cinzel font-bold text-yellow-400">{result.winner}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-cinzel font-bold text-white">{voteCounts[result.winner] || 0}</p>
            <p className="text-xs text-slate-500">votes</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConsensusVisualization;
