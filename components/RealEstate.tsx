import React, { useState } from 'react';
import { Building, Upload, ClipboardCheck, Loader2, Home, BarChart3, AlertCircle, MapPin } from 'lucide-react';
import { analyzeContent, sendMessage } from '../services/geminiService';
import { Capability } from '../types';
import ReactMarkdown from 'react-markdown';

const RealEstate: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LISTING' | 'ANALYSIS'>('LISTING');
  const [images, setImages] = useState<string[]>([]);
  const [details, setDetails] = useState({ address: '', price: '', specs: '', features: '' });
  const [errors, setErrors] = useState({ address: '', price: '', specs: '', features: '' });
  const [analysisData, setAnalysisData] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { address: '', price: '', specs: '', features: '' };

    if (!details.address.trim()) {
      newErrors.address = 'Address is required to fetch Maps data.';
      isValid = false;
    }

    if (!details.price.trim()) {
      newErrors.price = 'Price is required';
      isValid = false;
    } else {
      // Regex to allow digits, k, m, ., , and currency symbols. 
      // Examples: $450k, 500,000, 1.2M, 500000
      const priceRegex = /^[\$\€\£]?\s*[\d,.]+\s*[kKmM]?\s*$/;
      if (!priceRegex.test(details.price.trim())) {
        newErrors.price = 'Invalid format. Try: $450k, 500,000, or 1.2M';
        isValid = false;
      }
    }

    if (!details.specs.trim()) {
      newErrors.specs = 'Specs are required (e.g. 3bd/2ba)';
      isValid = false;
    }

    if (!details.features.trim()) {
      newErrors.features = 'Key features are required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const generateListing = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setOutput('');
    
    try {
      let locationContext = "";

      // Step 1: Maps Grounding (gemini-2.5-flash with googleMaps)
      setLoadingStatus("Analyzing neighborhood with Google Maps...");
      try {
         const mapsPrompt = `Describe the neighborhood specifically around ${details.address}. 
         List 3 nearby highly-rated restaurants or cafes, the nearest parks, and schools. 
         Describe the general 'vibe' of the location based on the map data.`;
         
         const mapsRes = await sendMessage(mapsPrompt, Capability.MAPS);
         locationContext = mapsRes.text || "Location data unavailable.";
      } catch (err) {
         console.warn("Maps lookup failed:", err);
         locationContext = "Could not fetch real-time map data. Proceeding with provided details only.";
      }

      // Step 2: Listing Generation (Reasoning / Multimodal)
      setLoadingStatus("Drafting professional listing with Gemini Reasoning...");
      
      const prompt = `
        Act as a top-tier Real Estate Agent and Copywriter.
        Create a compelling, professional MLS listing description for the following property.
        
        Property Details:
        - Address: ${details.address}
        - Price: ${details.price}
        - Specs: ${details.specs}
        - Key Features: ${details.features}
        
        Location Intelligence (Verified):
        ${locationContext}
        
        Requirements:
        1. Catchy Headline.
        2. Integrate the location intelligence naturally into the narrative (mentioning specific nearby spots found in the map data).
        3. Engaging narrative flow emphasizing lifestyle.
        4. STRICT COMPLIANCE: Do not use any language that violates Fair Housing laws.
        5. Strong Call to action.
      `;

      let res;
      if (images.length > 0) {
        // Use multimodal with the first image
        res = await analyzeContent(prompt, images[0], 'image/jpeg');
      } else {
        // Text only reasoning
        res = await sendMessage(prompt, Capability.REASONING);
      }
      
      setOutput(res.text || "No description generated.");

    } catch (e) {
      console.error(e);
      setOutput("Error generating listing. Please check your API key and inputs.");
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const analyzeMarketData = async () => {
    if (!analysisData) return;
    setIsLoading(true);
    setLoadingStatus("Analyzing market data...");
    try {
      const prompt = `
        Analyze the following Real Estate Data / Scraping Report.
        Identify key opportunities, potential data sources, and strategic recommendations for a Real Estate Tech integration.
        Structure the response as a formal "Strategic Opportunity Report".
        
        Data:
        ${analysisData}
      `;
      const res = await sendMessage(prompt, Capability.REASONING);
      setOutput(res.text || "No analysis generated.");
    } catch (e) {
      console.error(e);
      setOutput("Error analyzing data.");
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-900 overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-full md:w-96 border-r border-slate-800 p-6 overflow-y-auto bg-slate-900/50 flex flex-col">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Building className="text-emerald-400" />
          <span>Real Estate Studio</span>
        </h2>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800 p-1 rounded-lg mb-6 shrink-0">
          <button
            onClick={() => { setActiveTab('LISTING'); setOutput(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'LISTING' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Listing Gen
          </button>
          <button
            onClick={() => { setActiveTab('ANALYSIS'); setOutput(''); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'ANALYSIS' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Data Analyst
          </button>
        </div>

        {activeTab === 'LISTING' && (
          <div className="space-y-4 flex-1">
             <div className="space-y-2">
               <label className="text-xs font-semibold text-slate-400">Property Photos</label>
               <div className="flex gap-2 overflow-x-auto pb-2">
                 {images.map((img, i) => (
                   <img key={i} src={img} alt="thumb" className="w-16 h-16 object-cover rounded-lg border border-slate-700" />
                 ))}
                 <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-emerald-500/50 hover:bg-slate-800 transition-all shrink-0">
                   <Upload size={20} className="text-slate-500" />
                   <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </label>
               </div>
             </div>

             <div className="space-y-3">
               <div>
                 <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Address <span className="text-red-400">*</span>
                 </label>
                 <div className="relative">
                    <input 
                      className={`w-full bg-slate-900 border rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 ${errors.address ? 'border-red-500' : 'border-slate-700'}`}
                      placeholder="e.g. 123 Maple Dr, Seattle, WA"
                      value={details.address}
                      onChange={e => {
                        setDetails({...details, address: e.target.value});
                        if (errors.address) setErrors({...errors, address: ''});
                      }}
                    />
                    <MapPin size={14} className="absolute left-3 top-3 text-slate-500" />
                 </div>
                 {errors.address && <p className="text-xs text-red-400 mt-1">{errors.address}</p>}
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Price <span className="text-red-400">*</span>
                    </label>
                    <input 
                      className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 ${errors.price ? 'border-red-500' : 'border-slate-700'}`}
                      placeholder="e.g. $450k"
                      value={details.price}
                      onChange={e => {
                        setDetails({...details, price: e.target.value});
                        if (errors.price) setErrors({...errors, price: ''});
                      }}
                    />
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Specs <span className="text-red-400">*</span>
                    </label>
                    <input 
                      className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 ${errors.specs ? 'border-red-500' : 'border-slate-700'}`}
                      placeholder="e.g. 3bd/2ba"
                      value={details.specs}
                      onChange={e => {
                        setDetails({...details, specs: e.target.value});
                        if (errors.specs) setErrors({...errors, specs: ''});
                      }}
                    />
                 </div>
               </div>
               {(errors.price || errors.specs) && (
                  <p className="text-xs text-red-400 -mt-1">{errors.price || errors.specs}</p>
               )}

               <div>
                 <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Key Features <span className="text-red-400">*</span>
                 </label>
                 <textarea 
                   className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-32 resize-none ${errors.features ? 'border-red-500' : 'border-slate-700'}`}
                   placeholder="e.g. Hardwood floors, new roof, near schools..."
                   value={details.features}
                   onChange={e => {
                     setDetails({...details, features: e.target.value});
                     if (errors.features) setErrors({...errors, features: ''});
                   }}
                 />
                 {errors.features && <p className="text-xs text-red-400 mt-1">{errors.features}</p>}
               </div>
             </div>

             <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-lg p-3 space-y-2">
               <div className="flex items-start gap-2">
                 <MapPin size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                 <p className="text-[10px] text-emerald-200/70">
                   <strong>Maps Grounding:</strong> We will check Google Maps for nearby schools & amenities.
                 </p>
               </div>
               <div className="flex items-start gap-2">
                 <AlertCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                 <p className="text-[10px] text-emerald-200/70">
                   <strong>Fair Housing:</strong> Gemini Reasoning will ensure compliance.
                 </p>
               </div>
             </div>

             <button
              onClick={generateListing}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-900/20"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Home size={18} />}
              <span>{isLoading ? 'Processing...' : 'Generate with Maps & AI'}</span>
            </button>
            {isLoading && <p className="text-center text-xs text-emerald-400 animate-pulse">{loadingStatus}</p>}
          </div>
        )}

        {activeTab === 'ANALYSIS' && (
          <div className="space-y-4 flex-1">
             <div className="space-y-2">
               <label className="text-xs font-semibold text-slate-400">Raw Data / Report</label>
               <textarea 
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500 h-[400px] resize-none"
                 placeholder="Paste your JSON data, Python script output, or market report here..."
                 value={analysisData}
                 onChange={e => setAnalysisData(e.target.value)}
               />
             </div>
             
             <button
              onClick={analyzeMarketData}
              disabled={isLoading || !analysisData}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <BarChart3 size={18} />}
              <span>Analyze Data Opportunities</span>
            </button>
          </div>
        )}
      </div>

      {/* Output Area */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-950">
        {output ? (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl animate-fadeIn">
             <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
               <div className="flex items-center gap-2 text-emerald-400">
                 <ClipboardCheck size={20} />
                 <span className="font-semibold">Generated Result</span>
               </div>
               <button 
                 onClick={() => navigator.clipboard.writeText(output)}
                 className="text-xs text-slate-500 hover:text-white transition-colors"
               >
                 Copy to Clipboard
               </button>
             </div>
             <div className="prose prose-invert prose-emerald max-w-none">
               <ReactMarkdown>{output}</ReactMarkdown>
             </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-60">
            {activeTab === 'LISTING' ? <Home size={64} className="mb-4" /> : <BarChart3 size={64} className="mb-4" />}
            <p className="text-lg font-medium">
              {activeTab === 'LISTING' ? "Ready to create your listing" : "Waiting for data input"}
            </p>
            <p className="text-sm">
              {activeTab === 'LISTING' ? "Enter details to fetch Maps info and generate description" : "Paste market data to uncover insights"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealEstate;