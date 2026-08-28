import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ExternalLink, X, Globe, Sparkles } from 'lucide-react';
import { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  onSelect: (query: string) => void;
  onClose: () => void;
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, isLoading, onSelect, onClose, query }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-auto"
    >
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-200">
            {isLoading ? 'Searching...' : `Web Results for "${query}"`}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span>Scanning the neural web...</span>
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="divide-y divide-slate-800">
          {results.map((result, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(result.snippet)}
              className="w-full p-4 text-left hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-emerald-500/20 transition-colors mt-1">
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                    {result.title}
                  </h4>
                  <p className="text-xs text-emerald-500/70 mb-1">{result.source}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {result.snippet}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No results found</p>
        </div>
      )}
    </motion.div>
  );
};

export default SearchResults;
