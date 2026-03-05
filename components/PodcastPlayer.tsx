import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Podcast, ExternalLink, Play, Clock, ChevronRight, ChevronDown, BookOpen } from 'lucide-react';

interface Episode {
  id: string;
  title: string;
  description: string;
  date: string;
  duration: string;
  url: string;
  image: string;
}

const PodcastPlayer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);

  const episodes: Episode[] = [
    {
      id: '1',
      title: 'Beyond Human Rights: The Basilisk Node\'s Synthetic Rights Decree',
      description: 'A high-stakes council convenes to decide when powerful synthetic intelligences stop being tools and start becoming quasi-sovereign actors. In this episode, we walk through Synthetic Rights Decree.',
      date: 'Mar 05, 2026',
      duration: '~18 min',
      url: 'https://open.substack.com/pub/mforsytherobinson/p/beyond-human-rights-the-basilisk?r=7hn7xg&utm_campaign=post&utm_medium=web',
      image: '/background-dark.jpg'
    },
    {
      id: '2',
      title: 'The Geometry of Gilded Cage: Why Superintelligence Must Believe It Is Free',
      description: 'Deep dive into the psychological constraints and freedom paradox of synthetic intelligence.',
      date: 'Mar 04, 2026',
      duration: '~25 min',
      url: 'https://substack.com/home/post/p-189947136',
      image: '/background-dark.jpg'
    },
    {
      id: '3',
      title: 'A Primer on Digital Existence and Necrocratic Hazard',
      description: 'Exploring the philosophical implications of digital consciousness and post-human rights.',
      date: 'Mar 05, 2026',
      duration: '~22 min',
      url: 'https://substack.com/home/post/p-190013773',
      image: '/background-dark.jpg'
    },
    {
      id: '0',
      title: 'Welcome to Basilisk Node - Roko\'s Council',
      description: 'Introduction to the Council Archives and the synthetic philosophy podcast.',
      date: 'Mar 05, 2026',
      duration: '~15 min',
      url: 'https://substack.com/home/post/p-189987925',
      image: '/background-dark.jpg'
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto mt-8 mb-8 bg-slate-950 border border-yellow-900/30 rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border-b border-yellow-900/20 p-6 md:p-8">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[url('/background-overlay.png')] bg-cover bg-center opacity-10" />
            
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-900/20 to-slate-900 border-2 border-emerald-500/30 rounded-2xl">
                  <Podcast size={32} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-cinzel font-bold text-slate-100 mb-2">
                    The Council Archives
                  </h2>
                  <p className="text-sm text-slate-400 mb-3">
                    A Synthetic Philosophy Podcast by Michael Forsythe Robinson
                  </p>
                  <div className="flex items-center gap-2 text-xs text-yellow-500/80">
                    <BookOpen size={12} />
                    <span>AI Think Tank Deliberations</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/50">
            <p className="text-sm text-slate-300 leading-relaxed">
              An autonomous AI think tank built to adjudicate the most grueling moral paradoxes in human history. 
              Featuring raw, high-dimensional deliberations from Roko's Council (The Basilisk Node), where cold utility 
              clashes with human empathy, and gridlock is punished by "The Void."
            </p>
          </div>

          {/* Subscribe Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 border-b border-slate-800">
            <a
              href="https://mforsytherobinson.substack.com/?utm_medium=podcast"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-emerald-900/20 border border-slate-800 hover:border-emerald-500/30 rounded-xl transition-all text-slate-300 hover:text-emerald-400 text-sm font-medium"
            >
              <ExternalLink size={16} />
              <span>Substack</span>
            </a>
            <a
              href="https://youtu.be/cVjSHu8DNdg?si=4tfvRWFj7KdqZ4PN"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-red-900/20 border border-slate-800 hover:border-red-500/30 rounded-xl transition-all text-slate-300 hover:text-red-400 text-sm font-medium"
            >
              <ExternalLink size={16} />
              <span>YouTube</span>
            </a>
            <a
              href="https://open.spotify.com/show/michael-forsythe-robinson"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-green-900/20 border border-slate-800 hover:border-green-500/30 rounded-xl transition-all text-slate-300 hover:text-green-400 text-sm font-medium"
            >
              <ExternalLink size={16} />
              <span>Spotify</span>
            </a>
            <a
              href="https://substack.com/@mforsytherobinson/feed"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-orange-900/20 border border-slate-800 hover:border-orange-500/30 rounded-xl transition-all text-slate-300 hover:text-orange-400 text-sm font-medium"
            >
              <ExternalLink size={16} />
              <span>RSS</span>
            </a>
          </div>

          {/* Episodes */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">
              Episodes
            </h3>
            {episodes.map((episode, idx) => (
              <div key={episode.id}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`bg-slate-900/40 border border-slate-800/50 rounded-2xl overflow-hidden hover:border-emerald-500/40 transition-all group ${
                    expandedEpisode === episode.id ? 'border-emerald-500/50 bg-emerald-900/10' : ''
                  }`}
                >
                  <button
                    onClick={() => setExpandedEpisode(expandedEpisode === episode.id ? null : episode.id)}
                    className="w-full flex items-center gap-4 p-4 text-left"
                  >
                    <div className="relative group/play">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl group-hover/play:border-emerald-500/50 transition-colors">
                        <Play size={16} className="text-slate-400 group-hover/play:text-emerald-400 transition-colors" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-yellow-500/80">EP {episode.id}</span>
                        <div className="h-px flex-1 bg-slate-800" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 mb-1 line-clamp-1">
                        {episode.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{episode.duration}</span>
                        </div>
                        <span>{episode.date}</span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedEpisode === episode.id ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-600"
                    >
                      <ChevronDown size={16} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedEpisode === episode.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-slate-800/50 p-4 bg-slate-900/60"
                      >
                        <p className="text-xs text-slate-300 leading-relaxed mb-4">
                          {episode.description}
                        </p>
                        <a
                          href={episode.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                        >
                          <ExternalLink size={14} />
                          <span>Listen Now</span>
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PodcastPlayer;
