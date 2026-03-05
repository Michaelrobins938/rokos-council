import React, { useState } from 'react';
import { FileSearch, Upload, Loader2, FileText } from 'lucide-react';
import { analyzeContent } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const Analyzer: React.FC = () => {
  const [file, setFile] = useState<{data: string, type: string, name: string} | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFile({
          data: reader.result as string,
          type: f.type,
          name: f.name
        });
      };
      reader.readAsDataURL(f);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const p = prompt || "Analyze this file and describe what you see in detail.";
      const res = await analyzeContent(p, file.data, file.type);
      setResult(res.text || "No analysis returned.");
    } catch (e) {
      console.error(e);
      setResult("Error analyzing file. Note: Large videos may need to be shorter for this demo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-900 max-w-5xl mx-auto">
       <div className="mb-8 text-center">
         <h2 className="text-2xl font-bold text-white mb-2">Multimodal Analysis</h2>
         <p className="text-slate-400">Upload images or short videos to analyze them with Gemini 3 Pro.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
         <div className="flex flex-col space-y-4">
            <div className="border-2 border-dashed border-slate-700 rounded-2xl h-64 flex flex-col items-center justify-center hover:border-blue-500/50 transition-colors bg-slate-900/30">
               {file ? (
                 <div className="text-center p-4">
                    {file.type.startsWith('image') ? (
                      <img src={file.data} alt="Preview" className="h-40 object-contain mx-auto mb-2 rounded" />
                    ) : (
                      <FileText size={48} className="mx-auto text-blue-400 mb-2" />
                    )}
                    <p className="text-sm text-slate-300 font-medium truncate max-w-[200px]">{file.name}</p>
                    <button onClick={() => setFile(null)} className="text-xs text-red-400 mt-2 hover:underline">Remove</button>
                 </div>
               ) : (
                 <label className="cursor-pointer text-center p-8 w-full h-full flex flex-col items-center justify-center">
                    <Upload className="text-slate-500 mb-3" size={32} />
                    <span className="text-slate-300 font-medium">Drop a file here</span>
                    <span className="text-xs text-slate-500 mt-1">Images, Videos (Short)</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,video/*,application/pdf" />
                 </label>
               )}
            </div>

            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a question about the file (e.g., 'What is happening in this video?', 'Transcribe the text')..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
            />

            <button
              onClick={handleAnalyze}
              disabled={!file || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={18} />}
              <span>Analyze Content</span>
            </button>
         </div>

         <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 overflow-y-auto">
            {result ? (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <FileSearch size={48} className="mb-4 opacity-20" />
                <p>Analysis results will appear here</p>
              </div>
            )}
         </div>
       </div>
    </div>
  );
};

export default Analyzer;
