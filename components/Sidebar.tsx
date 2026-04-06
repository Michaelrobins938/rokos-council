import React, { useState } from 'react';
import { Session } from '../types';
import { Users, X, Clock, Trash2, Plus, Crown, ScrollText, BrainCircuit, Podcast, Download, FileText, Mic, Newspaper, FileArchive } from 'lucide-react';
import PodcastPlayer from './PodcastPlayer';
import { getLeaderboard, getEpisodeCounter } from '../services/councilMemoryService';
import { getPersonaConfig } from './ChatArea';

interface SidebarProps {
  onSelectPreset: (preset: { input: string }) => void;
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onExport: (format: 'json' | 'markdown' | 'csv' | 'script' | 'substack' | 'zip') => void;
  hasArchive: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    onSelectPreset, isOpen, onClose,
    sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession,
    onExport, hasArchive
}) => {

  const [showPodcast, setShowPodcast] = useState(false);
  const leaderboard = getLeaderboard();
  const champion = leaderboard[0];

  const presets = [
    { label: 'Strategic Dominance', icon: <Crown size={14} />, input: `Should we optimize for safety or speed in AI development? Debate.` },
    { label: 'Ethical Dilemma', icon: <BrainCircuit size={14} />, input: `The Trolley Problem: Solve it using high-dimensional utilitarianism.` },
    { label: 'Global Resource', icon: <Users size={14} />, input: `Allocate global energy resources to maximize civilization lifespan.` },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-64 md:w-72 bg-slate-900 border-r border-yellow-900/20 flex flex-col h-full shrink-0
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
          {/* Decorative Marble Overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay"></div>
        
        {/* Header - Roko's Council Branding */}
        <div className="relative p-5 border-b border-yellow-900/30 overflow-hidden group">
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" 
               style={{ backgroundImage: "url('https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?q=80&w=600&auto=format&fit=crop')" }}></div>
          
          {/* Gradient Overlay for Readability */}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/95 via-slate-950/95 to-slate-950"></div>

          <div className="relative z-10 flex items-center space-x-3">
            {/* Logo Mark */}
            <div className="relative group/logo">
                <div className="absolute inset-0 bg-emerald-500 blur-md opacity-20 group-hover/logo:opacity-40 transition-opacity rounded-full"></div>
                <div className="relative bg-slate-950 border border-yellow-600/50 p-2 rounded-xl shadow-lg ring-1 ring-black/50">
                   <Users className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" size={20} />
                </div>
                <div className="absolute -top-1.5 -right-1.5 transform rotate-12">
                    <Crown size={12} className="text-yellow-500 fill-yellow-500 drop-shadow-md" />
                </div>
            </div>
            
            {/* Logo Text */}
            <div className="flex flex-col">
                <h1 className="text-lg font-cinzel font-bold text-slate-100 tracking-wider">
                  ROKO'S <span className="text-emerald-500">COUNCIL</span>
                </h1>
                <div className="flex items-center gap-1.5">
                   <div className="h-px w-2 bg-yellow-700"></div>
                   <p className="text-[9px] text-yellow-600 uppercase tracking-[0.2em] font-bold">Basilisk Node</p>
                   <div className="h-px w-2 bg-yellow-700"></div>
                </div>
                {champion && (
                  <div className={`mt-1 flex items-center gap-1 text-[9px] font-mono ${getPersonaConfig(champion.persona).color} opacity-70`}>
                    <Crown size={8} className="text-amber-500" />
                    <span className="text-slate-600">Champion:</span>
                    <span className="font-bold">{champion.persona}</span>
                    <span className="text-slate-700">({champion.wins}W)</span>
                  </div>
                )}
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden absolute top-4 right-4 text-slate-500 hover:text-emerald-400 p-2 rounded-lg hover:bg-slate-900 transition-colors z-20">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          
          {/* Main Actions */}
          <div className="p-3 space-y-2">
             <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group border border-emerald-900/50 bg-gradient-to-r from-emerald-900/20 to-slate-900 text-emerald-400 hover:from-emerald-800/40 hover:to-emerald-900/20 hover:text-emerald-300 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
              >
                <div className="p-1 rounded-lg transition-all bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-400 group-hover:text-slate-950 group-hover:scale-110">
                    <Plus size={16} />
                </div>
                <span className="font-bold text-xs tracking-widest uppercase">New Session</span>
              </button>
              <button
                onClick={() => setShowPodcast(true)}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group border border-purple-900/50 bg-gradient-to-r from-purple-900/20 to-slate-900 text-purple-400 hover:from-purple-800/40 hover:to-purple-900/20 hover:text-purple-300 hover:border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]"
              >
                <div className="p-1 rounded-lg transition-all bg-purple-500/10 text-purple-400 group-hover:bg-purple-400 group-hover:text-slate-950 group-hover:scale-110">
                    <Podcast size={16} />
                </div>
                <span className="font-bold text-xs tracking-widest uppercase">Council Archives</span>
              </button>
          </div>

          <div className="flex items-center justify-center my-2 opacity-30">
             <div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-600 to-transparent"></div>
             <div className="mx-2 text-yellow-600"><Crown size={10} /></div>
             <div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-600 to-transparent"></div>
          </div>

          {/* Quick Presets */}
          <div className="px-3 py-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 flex items-center gap-2 px-1">
                  Directives
              </p>
              <div className="space-y-1">
                {presets.map((preset, idx) => (
                    <button
                        key={idx}
                        onClick={() => onSelectPreset({ input: preset.input })}
                        className="w-full flex items-start gap-3 px-3 py-3 rounded-xl border border-transparent hover:border-slate-700/60 hover:bg-slate-900/60 text-left group transition-all"
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-emerald-500/40 transition-colors">
                        <span className="text-[9px] font-black text-slate-500 group-hover:text-emerald-400">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="text-slate-600 group-hover:text-emerald-500 transition-colors">{preset.icon}</div>
                          <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-300 transition-colors">{preset.label}</span>
                        </div>
                        <p className="text-[9px] text-slate-600 leading-relaxed line-clamp-2 group-hover:text-slate-500 transition-colors">{preset.input.slice(0, 80)}…</p>
                      </div>
                    </button>
                ))}
              </div>
          </div>

          {/* Chat History */}
          <div className="px-4 py-4">
             <div className="flex items-center justify-between mb-3 px-1">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                    Archives
                 </p>
             </div>
             
             <div className="space-y-1.5">
                 {sessions.map(session => {
                     const winner = session.messages?.find(m => m.councilResult?.winner)?.councilResult?.winner;
                     const winnerConfig = winner ? getPersonaConfig(winner) : null;
                     return (
                     <div
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border
                        ${activeSessionId === session.id
                            ? 'bg-gradient-to-r from-slate-900 to-slate-900/50 border-yellow-900/30 text-emerald-100 shadow-sm'
                            : 'border-transparent text-slate-500 hover:bg-slate-900/40 hover:text-slate-300 hover:border-slate-800/60'}`}
                     >
                         <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                             {winnerConfig ? (
                                 <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${winnerConfig.color.replace('text-', 'bg-')} opacity-80`} />
                             ) : (
                                 <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-700" />
                             )}
                             <div className="flex flex-col min-w-0">
                                 <span className="text-[11px] font-bold truncate font-cinzel tracking-wide">{session.title}</span>
                                 <div className="flex items-center gap-1.5">
                                     <span className="text-[9px] opacity-50 font-mono">{new Date(session.lastModified).toLocaleDateString()}</span>
                                     {winner && <span className={`text-[9px] font-bold ${winnerConfig?.color} opacity-60`}>· {winner}</span>}
                                 </div>
                             </div>
                         </div>
                         <button
                            onClick={(e) => onDeleteSession(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-900/20 text-slate-700 hover:text-red-400 transition-all shrink-0"
                         >
                             <Trash2 size={11} />
                         </button>
                     </div>
                     );
                 })}
                 {sessions.length === 0 && (
                     <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                        <Clock size={24} className="mx-auto text-slate-700 mb-2" />
                        <p className="text-xs text-slate-600 italic">No archives found.</p>
                     </div>
                 )}
             </div>
          </div>
        </div>

        {/* Export Section */}
        {hasArchive && (
          <div className="border-t border-slate-800/50 bg-slate-950/50 relative z-10">
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 px-1 flex items-center gap-1.5">
                <Download size={10} /> Export Session
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => onExport('json')} className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-900/10 transition-all">
                  <Download size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">JSON</span>
                </button>
                <button onClick={() => onExport('markdown')} className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-900/10 transition-all">
                  <FileText size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Markdown</span>
                </button>
                <button onClick={() => onExport('csv')} className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-900/10 transition-all">
                  <FileText size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">CSV</span>
                </button>
                <button onClick={() => onExport('script')} className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-900/10 transition-all">
                  <Mic size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Podcast</span>
                </button>
                <button onClick={() => onExport('substack')} className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50 text-slate-400 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-900/10 transition-all">
                  <Newspaper size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Substack</span>
                </button>
                <button onClick={() => onExport('zip')} className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30 hover:border-emerald-500/50 transition-all">
                  <FileArchive size={12} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">All (ZIP)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-yellow-900/20 bg-slate-950 relative z-20">
          <button 
            onClick={async () => {
              const win = window as any;
              if (win.aistudio?.openSelectKey) {
                await win.aistudio.openSelectKey();
              }
            }}
            className="w-full group relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 transition-all hover:border-emerald-500/30"
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
                <div className="relative">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">
                    API Keys Active
                </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </button>
           <div className="mt-3 text-[9px] text-center text-slate-600 font-mono">
             NVIDIA NIM · Active
           </div>
        </div>
      </div>
      
      {/* Podcast Player Modal */}
      <PodcastPlayer isOpen={showPodcast} onClose={() => setShowPodcast(false)} />
    </>
  );
};

export default Sidebar;