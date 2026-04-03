import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SplashScreen from './components/SplashScreen';
import { Session, ChatMessage, CouncilMode } from './types';
import { buildExportSession, exportToJSON, exportToMarkdown, exportToCSV, exportToScript, exportToSubstack, exportAllAsZip } from './services/exportService';
import { Menu } from 'lucide-react';

const STORAGE_KEY = 'gemini_hub_council_sessions_v1';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Chat Data State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Transient state for new chat presets
  const [initialInput, setInitialInput] = useState('');

  // Load sessions from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = (title: string = 'New Council Session') => {
    const newSession: Session = {
      id: Date.now().toString(),
      title,
      messages: [],
      lastModified: Date.now(),
      preview: 'Start a new conversation...'
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const updateActiveSessionMessages = (messages: ChatMessage[]) => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const lastMsg = messages[messages.length - 1];
        return {
          ...s,
          messages,
          lastModified: Date.now(),
          preview: lastMsg ? (lastMsg.text.slice(0, 50) + (lastMsg.text.length > 50 ? '...' : '')) : s.preview,
          title: s.messages.length === 0 && messages.length > 0 ? (messages[0].text.slice(0, 30) || 'New Session') : s.title
        };
      }
      return s;
    }));
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions.length > 0 ? newSessions[0].id : null);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
  };

  const handleSelectPreset = (preset: { input: string }) => {
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && currentSession.messages.length === 0) {
        setInitialInput(preset.input);
    } else {
        createNewSession();
        setInitialInput(preset.input);
    }
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleExport = (format: 'json' | 'markdown' | 'csv' | 'script' | 'substack' | 'zip') => {
    const msg = activeSession?.messages.find(m => m.councilResult);
    if (!msg?.councilResult) return;
    const result = msg.councilResult;
    const query = msg.text;
    const mode = councilMode;
    const timestamp = Date.now();
    const msgId = msg.id;

    if (format === 'zip') {
      exportAllAsZip(result, query, mode, timestamp, msgId);
      return;
    }

    const exportData = buildExportSession(result, query, mode, timestamp, msgId);
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = exportToJSON(exportData);
        filename = `roko-council-${msgId}.json`;
        mimeType = 'application/json';
        break;
      case 'markdown':
        content = exportToMarkdown(exportData);
        filename = `roko-council-${msgId}.md`;
        mimeType = 'text/markdown';
        break;
      case 'csv':
        content = exportToCSV(exportData);
        filename = `roko-council-${msgId}.csv`;
        mimeType = 'text/csv';
        break;
      case 'script':
        content = exportToScript(exportData);
        filename = `roko-council-script-${msgId}.md`;
        mimeType = 'text/markdown';
        break;
      case 'substack':
        content = exportToSubstack(exportData);
        filename = `roko-council-substack-${msgId}.md`;
        mimeType = 'text/markdown';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const hasArchive = activeSession?.messages.some(m => m.councilResult?.winner) ?? false;
  const [councilMode, setCouncilMode] = useState<CouncilMode>(CouncilMode.STANDARD);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Sidebar 
        onSelectPreset={handleSelectPreset} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => { 
            setActiveSessionId(id); 
            if(window.innerWidth < 1024) setIsSidebarOpen(false);
        }}
        onNewChat={() => createNewSession()}
        onDeleteSession={deleteSession}
        onExport={handleExport}
        hasArchive={hasArchive}
      />
      
      <main className="flex-1 h-full overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-hidden relative">
             <ChatArea 
                key={activeSessionId}
                initialInput={initialInput} 
                messages={activeSession?.messages || []}
                onUpdateMessages={updateActiveSessionMessages}
                onClearInitial={() => setInitialInput('')}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
        </div>
      </main>
    </div>
  );
};

export default App;