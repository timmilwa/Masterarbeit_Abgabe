
import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Layout, Settings, Key, Cpu, X } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { MeansEndCanvas } from './components/MeansEndCanvas';
import { analyzeImageElement } from './services/geminiService';
import { MeansEndChain } from './types';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState('');
  const [chains, setChains] = useState<MeansEndChain[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selectedModel') || 'gemini-3-flash-preview');
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('customApiKey') || '');

  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('customApiKey', customApiKey);
  }, [customApiKey]);

  const handleAnalyze = async () => {
    if (!image || !focusArea.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeImageElement(image, focusArea, selectedModel, customApiKey);
      setChains(result.chains);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setImage(null);
    setChains([]);
    setFocusArea('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl leading-tight tracking-tight text-slate-900 uppercase">Meaning Extractor</h1>
          
          <div className="relative">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            >
              <Settings className="w-6 h-6" />
            </button>

            {isSettingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800">Settings</h3>
                    <button onClick={() => setIsSettingsOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Cpu className="w-3 h-3" />
                        AI Model
                      </label>
                      <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro (High Quality)</option>
                        <option value="gemini-2.5-flash-lite-latest">Gemini 2.5 Flash Lite</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Key className="w-3 h-3" />
                        Custom API Key
                      </label>
                      <input 
                        type="password"
                        placeholder="Leave empty for default..."
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-[10px] text-slate-400">Forces app to use your own Google Cloud key.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-800">New Analysis</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">1. Upload Image</label>
                <ImageUploader onImageUpload={setImage} currentImage={image} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">2. Set Focus Context</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    placeholder="e.g. 'Checkout Page' or 'Dashboard'"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-400 italic">
                  The AI will find multiple specific elements to pin based on this context.
                </p>
              </div>

              <button
                disabled={!image || !focusArea || isAnalyzing}
                onClick={handleAnalyze}
                className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  !image || !focusArea || isAnalyzing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Scanning Layout...
                  </>
                ) : (
                  'Generate Insights'
                )}
              </button>
              
              {image && (
                <button
                  onClick={handleClear}
                  className="w-full py-2 text-slate-500 font-medium text-xs hover:text-blue-600 transition-colors"
                >
                  Clear Session
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          {!image ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-400">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Layout className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">No Visual Uploaded</h3>
              <p className="max-w-xs text-sm leading-relaxed">
                Upload a screenshot to see specific UX elements pinned with psychological insights using Means-End Chain theory.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <MeansEndCanvas imageSrc={image} chains={chains} />
              </div>

              {chains.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chains.map((chain) => (
                    <div key={chain.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                          Element Identified
                        </span>
                        <h4 className="font-bold text-slate-800">{chain.label}</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4 italic">
                        {chain.description}
                      </p>
                      <div className="space-y-3">
                        <AnalysisSummary label="Core Attribute" value={chain.attributes[0]} color="bg-blue-500" />
                        <AnalysisSummary label="Key Consequence" value={chain.consequences[0]} color="bg-amber-500" />
                        <AnalysisSummary label="Mapped Value" value={chain.values[0]} color="bg-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const AnalysisSummary = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="flex items-center gap-3">
    <div className={`w-1 h-8 rounded-full ${color}`} />
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-xs font-semibold text-slate-800">{value}</div>
    </div>
  </div>
);
