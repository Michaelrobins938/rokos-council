import React, { useState } from 'react';
import { Video, Film, Download, Upload, Loader2, PlayCircle } from 'lucide-react';
import { generateVideo } from '../services/geminiService';

const VideoStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null); // For Image-to-Video

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setVideoUrl(null);
    try {
      const url = await generateVideo(prompt, aspectRatio, resolution, inputImage || undefined);
      if (url) {
        setVideoUrl(url);
      } else {
        alert("No video URI returned.");
      }
    } catch (e) {
      console.error(e);
      alert("Video generation failed. Ensure you have selected a Paid API Key (Veo requires it).");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-900 overflow-hidden">
      {/* Controls */}
      <div className="w-full md:w-80 border-r border-slate-800 p-6 overflow-y-auto bg-slate-900/50">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Film className="text-pink-400" />
          <span>Veo Video Studio</span>
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Source Image (Optional)</label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-pink-500/50 transition-colors">
              {inputImage ? (
                <div className="relative group">
                  <img src={inputImage} alt="Input" className="w-full h-32 object-cover rounded-lg" />
                  <button 
                    onClick={() => setInputImage(null)}
                    className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                    <Upload className="mx-auto text-slate-500 mb-2" size={24} />
                    <span className="text-sm text-slate-400">Animate an image</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Upload an image to use "Image-to-Video" mode.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Settings</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
               <button 
                 onClick={() => setAspectRatio('16:9')}
                 className={`py-2 rounded border text-xs ${aspectRatio === '16:9' ? 'bg-pink-600/20 border-pink-500 text-pink-300' : 'border-slate-700 text-slate-400'}`}
               >
                 Landscape (16:9)
               </button>
               <button 
                 onClick={() => setAspectRatio('9:16')}
                 className={`py-2 rounded border text-xs ${aspectRatio === '9:16' ? 'bg-pink-600/20 border-pink-500 text-pink-300' : 'border-slate-700 text-slate-400'}`}
               >
                 Portrait (9:16)
               </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={() => setResolution('720p')}
                 className={`py-2 rounded border text-xs ${resolution === '720p' ? 'bg-pink-600/20 border-pink-500 text-pink-300' : 'border-slate-700 text-slate-400'}`}
               >
                 720p
               </button>
               <button 
                 onClick={() => setResolution('1080p')}
                 className={`py-2 rounded border text-xs ${resolution === '1080p' ? 'bg-pink-600/20 border-pink-500 text-pink-300' : 'border-slate-700 text-slate-400'}`}
               >
                 1080p
               </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A neon hologram of a cat driving at top speed..."
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white font-medium py-3 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-pink-900/20"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Video size={18} />}
            <span>Generate Video</span>
          </button>
          
          {isLoading && <p className="text-center text-xs text-slate-400 animate-pulse">This may take a minute...</p>}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 p-8 flex items-center justify-center bg-slate-950 relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none"></div>
         
         {videoUrl ? (
           <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full rounded-lg shadow-2xl shadow-pink-900/20 border border-slate-800"
              />
              <a 
                href={videoUrl} 
                download 
                className="flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors"
              >
                <Download size={16} />
                <span>Download MP4</span>
              </a>
           </div>
         ) : (
           <div className="text-center text-slate-600">
             <PlayCircle size={48} className="mx-auto mb-4 opacity-20" />
             <p>Generated video will appear here</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default VideoStudio;
