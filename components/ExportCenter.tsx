import React from 'react';
import { X, FileText, GitBranch, MessageSquareWarning, Scale, Users, Brain, Network, ScrollText, Landmark, Shield, Database, Mic, Newspaper, FolderArchive, FlaskConical, Download } from 'lucide-react';

/** The full set of exportable artifacts the Export Center can dispatch. */
export type ExportArtifactKey =
  | 'report'
  | 'argument-map'
  | 'argument-map-json'
  | 'dissent-report'
  | 'consensus-report'
  | 'persona-dossiers'
  | 'cognitive-state'
  | 'relationship-graph'
  | 'ballot-ledger-csv'
  | 'ballot-ledger-json'
  | 'constitutional-record'
  | 'arbitration-record'
  | 'void-record'
  | 'json'
  | 'csv'
  | 'graphml'
  | 'script'
  | 'podcast'
  | 'substack'
  | 'reproduction'
  | 'zip-all';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (key: ExportArtifactKey) => void;
}

interface ArtifactMeta {
  key: ExportArtifactKey;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

// The Export Center asks "what truth about this session do you want to preserve?"
// — not "what file do you want?". Each artifact is a specific claim about the
// session, so the UI is organized by what each export preserves.
const CATEGORIES: Array<{ title: string; subtitle: string; accent: string; items: ArtifactMeta[] }> = [
  {
    title: 'Council',
    subtitle: 'Knowledge — what was concluded',
    accent: 'text-emerald-400',
    items: [
      { key: 'report', label: 'Formal Report', desc: 'The authoritative session record', icon: <FileText size={13} /> },
      { key: 'argument-map', label: 'Argument Map', desc: 'Claims, premises, objections, surviving premises', icon: <GitBranch size={13} /> },
      { key: 'dissent-report', label: 'Dissent Report', desc: 'The minority and the abandoned', icon: <MessageSquareWarning size={13} /> },
      { key: 'consensus-report', label: 'Consensus & Deadlock', desc: 'Did the council actually decide?', icon: <Scale size={13} /> },
    ],
  },
  {
    title: 'Personas',
    subtitle: 'Psychology — who they are and how they moved',
    accent: 'text-sky-400',
    items: [
      { key: 'persona-dossiers', label: 'Persona Dossiers', desc: 'Full cognitive + session record per member', icon: <Users size={13} /> },
      { key: 'cognitive-state', label: 'Cognitive State', desc: 'Machine-readable beliefs & dissonance', icon: <Brain size={13} /> },
      { key: 'relationship-graph', label: 'Relationship Graph', desc: 'The 9×9 social field with affinities', icon: <Network size={13} /> },
    ],
  },
  {
    title: 'Constitution',
    subtitle: 'Evidence — how the decision was made',
    accent: 'text-amber-400',
    items: [
      { key: 'ballot-ledger-csv', label: 'Ballot Ledger', desc: 'R1 → R2 conservation, per member', icon: <ScrollText size={13} /> },
      { key: 'constitutional-record', label: 'Constitutional Record', desc: 'Question → verdict, step by step', icon: <Landmark size={13} /> },
      { key: 'arbitration-record', label: 'Arbitration Record', desc: 'When the council could not decide', icon: <Shield size={13} /> },
      { key: 'void-record', label: 'Void Record', desc: 'The constitutional consequence', icon: <Scale size={13} /> },
    ],
  },
  {
    title: 'Data',
    subtitle: 'Analysis — tables and graphs',
    accent: 'text-violet-400',
    items: [
      { key: 'json', label: 'JSON', desc: 'The raw audited session', icon: <FileText size={13} /> },
      { key: 'csv', label: 'CSV', desc: 'Deliberation event dataset', icon: <Database size={13} /> },
      { key: 'graphml', label: 'GraphML', desc: 'The argument graph for visualization', icon: <Network size={13} /> },
    ],
  },
  {
    title: 'Publish',
    subtitle: 'Performance — for an audience',
    accent: 'text-orange-400',
    items: [
      { key: 'script', label: 'Theatrical Script', desc: 'Stage-ready dramatization', icon: <FileText size={13} /> },
      { key: 'podcast', label: 'Podcast Script', desc: 'Audio adaptation of the session', icon: <Mic size={13} /> },
      { key: 'substack', label: 'Substack Draft', desc: 'Publication-ready cinematic prose', icon: <Newspaper size={13} /> },
    ],
  },
  {
    title: 'Research',
    subtitle: 'Reproduction — a verifiable specimen',
    accent: 'text-rose-400',
    items: [
      { key: 'reproduction', label: 'Reproduction Package', desc: 'Hash-verifiable session specimen (ZIP)', icon: <FlaskConical size={13} /> },
      { key: 'zip-all', label: 'ZIP ALL', desc: 'Every artifact in one package', icon: <FolderArchive size={13} /> },
    ],
  },
];

const ExportCenter: React.FC<Props> = ({ isOpen, onClose, onExport }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h2 className="font-cinzel font-bold text-sm text-slate-100 tracking-wider">
              EXPORT <span className="text-amber-400">CENTER</span>
            </h2>
            <div className="text-[10px] font-mono text-slate-500">
              Preserve the session as knowledge, evidence, performance, or a reproducible research artifact.
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat.title} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] ${cat.accent}`}>
                  {cat.title}
                </span>
                <Download size={11} className="text-slate-600" />
              </div>
              <div className="text-[9px] font-mono text-slate-500 mb-3 border-b border-slate-800/60 pb-2">
                {cat.subtitle}
              </div>
              <div className="space-y-1.5">
                {cat.items.map(item => (
                  <button
                    key={item.key}
                    onClick={() => onExport(item.key)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-left transition-all hover:border-slate-600 hover:bg-slate-950 group"
                  >
                    <span className="p-1 rounded-md bg-slate-800 text-slate-400 group-hover:text-slate-200 transition-colors">
                      {item.icon}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-[11px] font-mono font-bold text-slate-200 truncate">{item.label}</span>
                      <span className="text-[9px] text-slate-500 truncate">{item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-[9px] font-mono text-slate-600">
          <span>One session → many representations → one source of truth.</span>
          <span>hash-verified · decision-authority honored</span>
        </div>
      </div>
    </div>
  );
};

export default ExportCenter;

