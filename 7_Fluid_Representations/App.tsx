
import React, { useState, useEffect, useRef } from 'react';
import { AppState, MediaType, AppConfig, DEFAULT_CONFIG } from './types';
import { ImageView } from './components/ImageView';
import { TextView } from './components/TextView';
import { NotesView } from './components/NotesView';
import { Loader } from './components/Loader';
import * as aiService from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    image: null,
    text: '',
    notes: [],
    focusObject: '',
    activeTab: 'image',
    loading: false,
    status: '',
    error: null,
    config: DEFAULT_CONFIG
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem('fluid-rep-config');
    if (savedConfig) {
      try {
        setState(prev => ({ ...prev, config: JSON.parse(savedConfig) }));
      } catch (e) {
        console.error("Failed to load config", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setState(prev => {
      const updated = { ...prev.config, ...newConfig };
      localStorage.setItem('fluid-rep-config', JSON.stringify(updated));
      return { ...prev, config: updated, error: null }; // Clear error on config change
    });
  };

  const handleTabChange = async (newTab: MediaType) => {
    if (newTab === state.activeTab) return;
    const sourceTab = state.activeTab;
    setState(prev => ({ ...prev, activeTab: newTab, error: null }));

    let needsUpdate = false;
    if (newTab === 'text' && !state.text) needsUpdate = true;
    if (newTab === 'image' && !state.image) needsUpdate = true;
    if (newTab === 'notes' && state.notes.length === 0) needsUpdate = true;

    if (needsUpdate) {
      performTranslation(sourceTab, newTab);
    }
  };

  const performTranslation = async (from: MediaType, to: MediaType) => {
    setState(prev => ({ ...prev, loading: true, status: `Converting ${from} to ${to}`, error: null }));
    try {
      if (from === 'image' && state.image) {
        if (to === 'text') {
          const text = await aiService.imageToText(state.image, state.config, state.focusObject);
          setState(prev => ({ ...prev, text, loading: false }));
        } else if (to === 'notes') {
          const notes = await aiService.imageToNotes(state.image, state.config, state.focusObject);
          setState(prev => ({ ...prev, notes, loading: false }));
        }
      } else if (from === 'text' && state.text) {
        if (to === 'image') {
          const image = await aiService.textToImage(state.text, state.config);
          setState(prev => ({ ...prev, image, loading: false }));
        } else if (to === 'notes') {
          const notes = await aiService.textToNotes(state.text, state.config);
          setState(prev => ({ ...prev, notes, loading: false }));
        }
      } else if (from === 'notes' && state.notes.length > 0) {
        if (to === 'text') {
          const text = await aiService.notesToText(state.notes, state.config);
          setState(prev => ({ ...prev, text, loading: false }));
        } else if (to === 'image') {
          const image = await aiService.notesToImage(state.notes, state.config);
          setState(prev => ({ ...prev, image, loading: false }));
        }
      } else {
        setState(prev => ({ ...prev, loading: false, status: '' }));
      }
    } catch (error: any) {
      console.error("Translation error:", error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        status: '', 
        error: error.message || "An unexpected error occurred during translation."
      }));
    }
  };

  const handleImageUpload = (base64: string) => {
    setState(prev => ({ 
      ...prev, 
      image: base64,
      text: '', 
      notes: [],
      focusObject: '', // Reset focus on new upload
      error: null
    }));
  };

  const handleFocusChange = (focus: string) => {
    setState(prev => ({ ...prev, focusObject: focus }));
  };

  return (
    <div className="min-h-screen pb-20">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900 tracking-tight">Fluid Representations</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex space-x-1 p-1 bg-gray-100 rounded-xl">
                <TabButton active={state.activeTab === 'image'} onClick={() => handleTabChange('image')} label="Image" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                <TabButton active={state.activeTab === 'text'} onClick={() => handleTabChange('text')} label="Text" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                <TabButton active={state.activeTab === 'notes'} onClick={() => handleTabChange('notes')} label="Sticky Notes" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
              </div>

              <div className="relative" ref={settingsRef}>
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${isSettingsOpen ? 'bg-gray-100 text-blue-600' : 'text-gray-500'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-gray-50 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">AI Configuration</h3></div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Google API Key</label>
                        <input 
                          type="password"
                          placeholder="AI_..."
                          value={state.config.apiKey}
                          onChange={(e) => updateConfig({ apiKey: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Model</label>
                        <select 
                          value={state.config.model}
                          onChange={(e) => updateConfig({ model: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                        >
                          <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                          <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50/50">
                      <button onClick={() => setIsSettingsOpen(false)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md">Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {state.error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-700 animate-fade-in shadow-sm">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="flex-1">
              <h4 className="font-bold text-sm">Action Required</h4>
              <p className="text-sm opacity-90">{state.error}</p>
              <button 
                onClick={() => setState(s => ({ ...s, error: null }))}
                className="mt-2 text-xs font-bold underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {state.loading ? (
          <Loader status={state.status} />
        ) : (
          <div className="transition-all duration-300">
            {state.activeTab === 'image' && (
              <ImageView 
                image={state.image} 
                focusObject={state.focusObject}
                onUpload={handleImageUpload} 
                onFocusChange={handleFocusChange}
              />
            )}
            {state.activeTab === 'text' && <TextView text={state.text} onChange={(t) => setState(prev => ({ ...prev, text: t }))} />}
            {state.activeTab === 'notes' && <NotesView notes={state.notes} onUpdate={(n) => setState(prev => ({ ...prev, notes: n }))} />}
          </div>
        )}
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-200 px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-6 z-40">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-gray-400">Sync Status</span>
          <div className="flex items-center space-x-3">
             <StatusIndicator active={!!state.image} label="Image" />
             <StatusIndicator active={!!state.text} label="Text" />
             <StatusIndicator active={state.notes.length > 0} label="Notes" />
          </div>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <button 
          onClick={() => {
            const current = state.activeTab;
            const others = (['image', 'text', 'notes'] as MediaType[]).filter(t => t !== current);
            others.forEach(target => performTranslation(current, target));
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-2xl transition-all shadow-lg active:scale-95"
        >
          Translate All
        </button>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-all ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>{icon}<span>{label}</span></button>
);

const StatusIndicator: React.FC<{ active: boolean, label: string }> = ({ active, label }) => (
  <div className="flex items-center space-x-1">
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
    <span className={`text-xs font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
  </div>
);

export default App;
