import React, { useState, useEffect } from 'react';
import { X, BookOpen, Network, Activity } from 'lucide-react';
import { PERSONA_NAMES } from '../services/personaBible';
import { loadAllMemory } from '../services/councilMemoryService';
import { Round2Result } from '../types';
import PersonaBibleInspector from './PersonaBibleInspector';
import RelationshipGraphPanel from './RelationshipGraphPanel';
import DissonanceViewer from './DissonanceViewer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'personas' | 'relationships' | 'dissonance';

const SESSIONS_KEY = 'gemini_hub_council_sessions_v1';

const loadLatestRound2 = (): Round2Result | null => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return null;
    const sessions: Array<{ messages?: Array<{ councilResult?: { round2Result?: Round2Result } }> }> = JSON.parse(raw);
    for (const session of sessions) {
      for (const msg of session.messages || []) {
        if (msg.councilResult?.round2Result?.reassessments?.length) {
          return msg.councilResult.round2Result;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const CouncilLab: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<Tab>('personas');
  const [persona, setPersona] = useState<string>('Oracle');
  const [round2, setRound2] = useState<Round2Result | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRound2(loadLatestRound2());
      // Re-read on every open so freshly-run sessions appear.
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const all = loadAllMemory();
  const memoryExists = Object.keys(all).some(p => (all[p].sessionsParticipated || 0) > 0);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <div>
            <h2 className="font-cinzel font-bold text-sm text-slate-100 tracking-wider">COUNCIL <span className="text-emerald-400">LABORATORY</span></h2>
            <div className="text-[9px] font-mono text-slate-500">Observe the ecology, not the labels.</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800 bg-slate-950/80">
          {([
            { id: 'personas', label: 'Personas', icon: <BookOpen size={12} /> },
            { id: 'relationships', label: 'Relationships', icon: <Network size={12} /> },
            { id: 'dissonance', label: 'Dissonance', icon: <Activity size={12} /> },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${tab === t.id ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-1.5 flex-wrap">
          {PERSONA_NAMES.map(name => (
            <button
              key={name}
              onClick={() => setPersona(name)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-colors ${persona === name ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
            >
              {name}
            </button>
          ))}
          <span className="ml-auto text-[9px] font-mono text-slate-600">{memoryExists ? 'memory: live' : 'memory: empty'}</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {tab === 'personas' && <PersonaBibleInspector persona={persona} />}
          {tab === 'relationships' && <RelationshipGraphPanel persona={persona} />}
          {tab === 'dissonance' && <DissonanceViewer round2Result={round2} />}
        </div>
      </div>
    </div>
  );
};

export default CouncilLab;
