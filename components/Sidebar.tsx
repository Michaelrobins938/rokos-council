import React, { useState, useMemo } from 'react';
import { Session } from '../types';
import { Users, X, Clock, Trash2, Plus, Crown, Podcast, Download, FileText, Mic, Newspaper, FileArchive, Search, Share2, ShieldCheck, Sparkles, Check, PanelLeftClose, PanelLeftOpen, FlaskConical } from 'lucide-react';
import PodcastPlayer from './PodcastPlayer';
import CouncilLab from './CouncilLab';
import { getLeaderboard } from '../services/councilMemoryService';
import { getPersonaConfig } from './ChatArea';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onExport: (format: 'json' | 'markdown' | 'csv' | 'script' | 'substack' | 'zip') => void;
  hasArchive: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen, onClose,
    sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession,
    onExport, hasArchive, isCollapsed = false, onToggleCollapse
}) => {
  const [showPodcast, setShowPodcast] = useState(false);
  const [showLab, setShowLab] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'decided' | 'runoff'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const leaderboard = getLeaderboard();
  const champion = leaderboard[0];

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const winner = session.messages?.find(m => m.councilResult?.winner)?.councilResult?.winner || '';
      const mode = session.messages?.find(m => m.councilResult?.decisionMode)?.councilResult?.decisionMode || '';
      const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            winner.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterTab === 'decided') return Boolean(winner);
      if (filterTab === 'runoff') return mode === 'runoff' || mode === 'fallback_tiebreak';
      return true;
    });
  }, [sessions, searchQuery, filterTab]);

  const handleShareLink = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    const resultMsg = session.messages.find(m => m.councilResult);
    if (!resultMsg?.councilResult) return;
    try {
      const payload = { session: { id: session.id, petitionerQuery: session.title, timestamp: session.lastModified }, result: resultMsg.councilResult };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?session=${encoded}`);
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) { console.error('Failed to create share link', err); }
  };

  // COLLAPSED VIEW
  if (isCollapsed) {
    return (
      <>
        {isOpen && <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 lg:hidden" onClick={onClose} />}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-16 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center h-full shrink-0 transform transition-all duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-emerald-500/40 via-amber-500/40 to-transparent" />

          <div className="p-3 border-b border-slate-800/80 w-full flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-xl blur-sm" />
              <div className="relative bg-slate-950 border border-emerald-500/40 p-2 rounded-xl">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <Crown className="w-3 h-3 text-amber-400 absolute -top-1 -right-1" />
            </div>
            {onToggleCollapse && (
              <button onClick={onToggleCollapse} title="Expand sidebar" className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-900 transition-colors">
                <PanelLeftOpen size={15} />
              </button>
            )}
          </div>

          <div className="p-2 border-b border-slate-800/60 w-full flex flex-col items-center gap-2">
            <button onClick={onNewChat} title="Convene New Session" className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-500/70 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <Plus size={16} />
            </button>
            <button onClick={() => setShowPodcast(true)} title="Council Archives" className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-400 hover:bg-amber-900/40 hover:border-amber-500/60 transition-all">
              <Podcast size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-1.5 py-3 px-2 custom-scrollbar">
            {sessions.map(session => {
              const winner = session.messages?.find(m => m.councilResult?.winner)?.councilResult?.winner;
              const winnerConfig = winner ? getPersonaConfig(winner) : null;
              const isActive = activeSessionId === session.id;
              return (
                <button key={session.id} onClick={() => onSelectSession(session.id)} title={session.title || 'Untitled'} className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative ${isActive ? 'bg-slate-900 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700/60 hover:bg-slate-900/70'}`}>
                  {winnerConfig ? <span className={`w-2.5 h-2.5 rounded-full ${winnerConfig.color.replace('text-', 'bg-')} ${isActive ? '' : 'opacity-60'}`} /> : <Clock size={12} className="text-slate-600" />}
                  {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r-full" />}
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-slate-800/80 w-full flex flex-col items-center gap-1.5">
            {hasArchive && (
              <button onClick={() => onExport('zip')} title="Export ZIP" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/40 transition-all">
                <FileArchive size={14} />
              </button>
            )}
            <button onClick={() => setShowLab(true)} title="Council Laboratory" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/40 transition-all">
              <FlaskConical size={14} />
            </button>
            <button onClick={async () => { const win = window as any; if (win.aistudio?.openSelectKey) await win.aistudio.openSelectKey(); }} title="API Keys" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/40 transition-all relative">
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <ShieldCheck size={14} />
            </button>
          </div>
        </aside>
        <PodcastPlayer isOpen={showPodcast} onClose={() => setShowPodcast(false)} />
        <CouncilLab isOpen={showLab} onClose={() => setShowLab(false)} />
      </>
    );
  }

  // EXPANDED VIEW
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 lg:hidden" onClick={onClose} />}

      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 md:w-80 bg-slate-950 border-r border-slate-800/80 flex flex-col h-full shrink-0 transform transition-all duration-300 ease-in-out lg:translate-x-0 shadow-2xl lg:shadow-none font-sans overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-emerald-500/40 via-amber-500/40 to-transparent" />

        <div className="relative p-4 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative group/logo">
                <div className="absolute -inset-1 bg-emerald-500/30 rounded-xl blur-sm group-hover/logo:bg-emerald-400/50 transition-all" />
                <div className="relative bg-slate-950 border border-emerald-500/40 p-2 rounded-xl shadow-lg">
                  <Users className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                </div>
                <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5 drop-shadow" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-cinzel font-bold text-slate-100 tracking-wider">ROKO'S <span className="text-emerald-400">COUNCIL</span></h1>
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-400/90 font-bold uppercase tracking-[0.25em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Basilisk Node
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button onClick={onToggleCollapse} title="Collapse sidebar" className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-colors">
                  <PanelLeftClose size={18} />
                </button>
              )}
              <button onClick={onClose} aria-label="Close" className="lg:hidden text-slate-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-900 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          {champion && (
            <div className="mt-3 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-mono text-slate-400">Chamber Victor:</span>
                <span className={`text-[10px] font-mono font-bold ${getPersonaConfig(champion.persona).color}`}>{champion.persona}</span>
              </div>
              <span className="text-[9px] font-mono text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">{champion.wins} Wins</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-2 border-b border-slate-800/60 bg-slate-950/60">
          <button onClick={onNewChat} className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 text-emerald-300 hover:border-emerald-500/70 hover:from-emerald-900/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)]">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-400 group-hover:text-slate-950 transition-colors"><Plus size={16} /></div>
              <span className="font-mono font-bold text-xs tracking-widest uppercase">Convene New Session</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400/60 border border-emerald-500/20 px-1.5 py-0.5 rounded">NEW</span>
          </button>
          <button onClick={() => setShowPodcast(true)} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 group border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 text-amber-400 hover:border-amber-500/60 hover:from-amber-900/30 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors"><Podcast size={14} /></div>
              <span className="font-mono font-bold text-xs tracking-widest uppercase">Council Archives</span>
            </div>
            <Sparkles size={12} className="text-amber-400/60 group-hover:rotate-12 transition-transform" />
          </button>
        </div>

        <div className="px-4 pt-4 pb-2 space-y-2 border-b border-slate-800/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by query or winner…" className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors font-sans" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X size={12} /></button>}
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-800/80 rounded-lg text-[9px] font-mono">
            {(['all', 'decided', 'runoff'] as const).map(tab => (
              <button key={tab} onClick={() => setFilterTab(tab)} className={`flex-1 py-1 text-center rounded-md font-bold transition-all ${filterTab === tab ? (tab === 'runoff' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'bg-slate-800 text-emerald-400 shadow-sm') : 'text-slate-500 hover:text-slate-300'}`}>
                {tab === 'all' ? `All (${sessions.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1.5">
          {filteredSessions.map(session => {
            const result = session.messages?.find(m => m.councilResult?.winner)?.councilResult;
            const winner = result?.winner;
            const winnerConfig = winner ? getPersonaConfig(winner) : null;
            const decisionMode = result?.decisionMode;
            const isActive = activeSessionId === session.id;
            return (
              <div key={session.id} role="button" tabIndex={0} aria-label={`Open: ${session.title}`} onClick={() => onSelectSession(session.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSession(session.id); } }} className={`group relative flex flex-col p-3 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/30 border-emerald-500/50 shadow-md text-slate-100' : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700/60 text-slate-400 hover:text-slate-200'}`}>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                <div className="flex items-start justify-between gap-2 mb-1.5 pl-1">
                  <span className="text-[11px] font-cinzel font-bold leading-tight line-clamp-1 flex-1">{session.title || 'Untitled Deliberation'}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {result && <button onClick={(e) => handleShareLink(session, e)} title="Copy link" className="p-1 rounded bg-slate-800 hover:bg-emerald-900/40 text-slate-400 hover:text-emerald-300 transition-colors">{copiedId === session.id ? <Check size={11} className="text-emerald-400" /> : <Share2 size={11} />}</button>}
                    <button onClick={(e) => onDeleteSession(session.id, e)} title="Delete" className="p-1 rounded bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pl-1 mt-1 border-t border-slate-800/40 pt-1.5">
                  <span className="flex items-center gap-1"><Clock size={10} className="text-slate-600" />{new Date(session.lastModified).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  {winnerConfig ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${winnerConfig.color.replace('text-', 'bg-')}`} />
                      <span className={`font-bold ${winnerConfig.color}`}>{winner}</span>
                      {decisionMode === 'runoff' && <span className="text-[8px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1 rounded">RUNOFF</span>}
                    </div>
                  ) : <span className="italic text-slate-600">Pending</span>}
                </div>
              </div>
            );
          })}
          {filteredSessions.length === 0 && (
            <div className="text-center py-8 px-4 border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40">
              <Clock size={20} className="mx-auto text-slate-700 mb-2" />
              <p className="text-xs text-slate-500 font-mono">No matching archives found.</p>
              {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-2 text-[10px] font-mono text-emerald-400 hover:underline">Clear search</button>}
            </div>
          )}
        </div>

        {hasArchive && (
          <div className="border-t border-slate-800/80 bg-gradient-to-b from-slate-950/90 to-slate-900/90 p-3.5 relative z-10">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><Download size={11} /> Export Center</span>
              <span className="text-[9px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">AUDITED</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { format: 'json', icon: 'dl', label: 'JSON', cls: 'hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-950/20' },
                { format: 'markdown', icon: 'ft', label: 'MD', cls: 'hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-950/20' },
                { format: 'csv', icon: 'ft', label: 'CSV', cls: 'hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-950/20' },
                { format: 'script', icon: 'mic', label: 'Podcast', cls: 'hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-950/20' },
                { format: 'substack', icon: 'news', label: 'Substack', cls: 'hover:text-orange-400 hover:border-orange-500/40 hover:bg-orange-950/20' },
                { format: 'zip', icon: 'arch', label: 'ZIP ALL', cls: 'hover:bg-emerald-900/50 hover:border-emerald-500/70 bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
              ] as const).map(({ format, icon, label, cls }) => (
                <button key={format} onClick={() => onExport(format as any)} title={`Export as ${label}`} className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 transition-all group ${cls}`}>
                  <span className="group-hover:scale-110 transition-transform">
                    {icon === 'dl' && <Download size={12} />}
                    {icon === 'ft' && <FileText size={12} />}
                    {icon === 'mic' && <Mic size={12} />}
                    {icon === 'news' && <Newspaper size={12} />}
                    {icon === 'arch' && <FileArchive size={12} />}
                  </span>
                  <span className="text-[9px] font-mono font-bold tracking-wider">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950 relative z-20">
          <button onClick={() => setShowLab(true)} className="w-full group relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 transition-all hover:border-emerald-500/40 mb-2">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">Council Laboratory</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">ECOLOGY</span>
            </div>
          </button>
          <button onClick={async () => { const win = window as any; if (win.aistudio?.openSelectKey) await win.aistudio.openSelectKey(); }} className="w-full group relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 px-3.5 py-2.5 transition-all hover:border-emerald-500/40">
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">Telemetry & Keys</span>
              </div>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </button>
          <div className="mt-2.5 flex items-center justify-between text-[9px] text-slate-600 font-mono">
            <span>NVIDIA NIM · OpenRouter</span><span>v1.4.0 · Audited</span>
          </div>
        </div>
      </aside>

      <PodcastPlayer isOpen={showPodcast} onClose={() => setShowPodcast(false)} />
      <CouncilLab isOpen={showLab} onClose={() => setShowLab(false)} />
    </>
  );
};

export default Sidebar;
