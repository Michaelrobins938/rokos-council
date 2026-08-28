import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, Download, Upload, Loader2, Maximize } from 'lucide-react';
import { generateImage, editImage } from '../services/geminiService';
import { AspectRatio } from '../types';

enum Mode {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT'
}

const ImageStudio: React.FC = () => {
  const [mode, setMode] = useState<Mode>(Mode.GENERATE);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);

  const ratios: AspectRatio[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setResultImage(null);
    try {
      const res = await generateImage(prompt, aspectRatio, imageSize);
      // Look for image in parts
      const parts = res.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            setResultImage(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert("Generation failed. Make sure you have selected a Paid API Key (for 2K/4K/Pro).");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!prompt || !inputImage) return;
    setIsLoading(true);
    setResultImage(null);
    try {
      const res = await editImage(prompt, inputImage);
      const parts = res.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            setResultImage(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      alert("Edit failed.");
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
          <ImageIcon className="text-purple-400" />
          <span>Image Studio</span>
        </h2>

        {/* Mode Toggle */}
        <div className="flex bg-slate-800 p-1 rounded-lg mb-6">
          <button
            onClick={() => setMode(Mode.GENERATE)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === Mode.GENERATE ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Generate (Pro)
          </button>
          <button
            onClick={() => setMode(Mode.EDIT)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === Mode.EDIT ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Edit (Flash)
          </button>
        </div>

        <div className="space-y-6">
          {mode === Mode.GENERATE && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-2">
                  {ratios.map(r => (
                    <button
                      key={r}
                      onClick={() => setAspectRatio(r)}
                      className={`px-2 py-1.5 text-xs rounded border ${
                        aspectRatio === r 
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resolution</label>
                <div className="flex gap-2">
                  {['1K', '2K', '4K'].map((s: any) => (
                    <button
                      key={s}
                      onClick={() => setImageSize(s)}
                      className={`flex-1 py-2 text-sm rounded border ${
                         imageSize === s
                         ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                         : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === Mode.EDIT && (
             <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Source Image</label>
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-purple-500/50 transition-colors">
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
                       <span className="text-sm text-slate-400">Click to upload</span>
                       <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
             </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === Mode.GENERATE ? "A cyberpunk city in neon rain..." : "Add a retro sunset filter..."}
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <button
            onClick={mode === Mode.GENERATE ? handleGenerate : handleEdit}
            disabled={isLoading || (mode === Mode.EDIT && !inputImage)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-900/20"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
            <span>{mode === Mode.GENERATE ? 'Generate Image' : 'Edit Image'}</span>
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 p-8 flex items-center justify-center bg-slate-950 relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none"></div>
         
         {resultImage ? (
           <div className="relative group max-w-full max-h-full">
             <img src={resultImage} alt="Generated" className="max-w-full max-h-[80vh] rounded-lg shadow-2xl shadow-black/50 border border-slate-800" />
             <div className="absolute bottom-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={resultImage} download={`gemini-gen-${Date.now()}.png`} className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90">
                  <Download size={20} />
                </a>
             </div>
           </div>
         ) : (
           <div className="text-center text-slate-600">
             <Maximize size={48} className="mx-auto mb-4 opacity-20" />
             <p>Generated artwork will appear here</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default ImageStudio;
