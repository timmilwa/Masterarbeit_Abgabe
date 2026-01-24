import React, { useState, useEffect } from 'react';
import {
  Music,
  Languages,
  Users,
  Brain,
  Building2,
  Telescope,
  Leaf,
  Drama,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Loader2,
  Eye,
  Settings,
  X,
  Save
} from 'lucide-react';

// --- KONFIGURATION & DATEN ---

// LocalStorage Key für API Key
const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Experten-Konfiguration
const EXPERTS = [
  {
    id: 'anthropologist',
    title: 'Anthropologin',
    description: 'Untersucht Rituale, soziale Muster und kulturelle Bedeutungen.',
    roleForPrompt: 'Anthropologin',
    icon: Users,
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  {
    id: 'musician',
    title: 'Musikerin',
    description: 'Achtet auf Rhythmus, Klangfarben, Resonanz und akustische Räume.',
    roleForPrompt: 'Musikerin',
    icon: Music,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    id: 'linguist',
    title: 'Linguistin',
    description: 'Analysiert Sprache, Semiotik, Begriffe und kommunikative Codes.',
    roleForPrompt: 'Linguistin',
    icon: Languages,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    id: 'psychologist',
    title: 'Psychologin',
    description: 'Fokussiert auf Emotionen, unterbewusste Assoziationen und Verhalten.',
    roleForPrompt: 'Psychologin',
    icon: Brain,
    color: 'bg-rose-100 text-rose-700 border-rose-200'
  },
  {
    id: 'architect',
    title: 'Architekt',
    description: 'Betrachtet Struktur, Raumwirkung, Materialität und Funktionalität.',
    roleForPrompt: 'Architekt',
    icon: Building2,
    color: 'bg-stone-100 text-stone-700 border-stone-200'
  },
  {
    id: 'futurist',
    title: 'Zukunftsforscherin',
    description: 'Denkt in Szenarien, Trends, Transformationen und Utopien.',
    roleForPrompt: 'Zukunftsforscherin',
    icon: Telescope,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  },
  {
    id: 'ecologist',
    title: 'Ökologin',
    description: 'Untersucht Kreisläufe, Ressourcen, Nachhaltigkeit und Systeme.',
    roleForPrompt: 'Ökologin',
    icon: Leaf,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  {
    id: 'dramaturg',
    title: 'Dramaturg',
    description: 'Sucht nach Konflikten, Inszenierung, Narrativen und Heldenreisen.',
    roleForPrompt: 'Dramaturg',
    icon: Drama,
    color: 'bg-red-100 text-red-700 border-red-200'
  }
];

export default function App() {
  const [objectInput, setObjectInput] = useState('');
  const [loadingExpertId, setLoadingExpertId] = useState(null);
  const [generatedFrames, setGeneratedFrames] = useState([]);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [settingsApiKey, setSettingsApiKey] = useState('');

  // Lade API Key nur aus localStorage beim Start (kein Fallback auf Umgebungsvariable)
  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    setApiKey(storedKey);
    setSettingsApiKey(storedKey);
    
    // Öffne Settings-Modal automatisch, wenn kein API-Key vorhanden ist
    if (!storedKey.trim()) {
      setShowSettings(true);
    }
  }, []);

  // --- LLM INTERAKTION ---

  // Speichere API Key
  const saveApiKey = () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, settingsApiKey);
    setApiKey(settingsApiKey);
    setShowSettings(false);
  };

  const generatePerspective = async (expert) => {
    if (!objectInput.trim()) {
      setError("Bitte gib zuerst ein Alltagsobjekt ein.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Bitte gib zuerst einen API-Key in den Einstellungen ein.");
      setShowSettings(true);
      return;
    }
    setError(null);
    setLoadingExpertId(expert.id);

    // Prompt Template angepasst: Weniger Szenario, mehr "Haltung/Brille"
    const prompt = `
      Du bist ein Coach für kreatives Denken.

      Aufgabe: Formuliere einen sehr kurzen, prägnanten Wahrnehmungs-Impuls (max. 1-2 Sätze).
      Ziel: Beschreibe, mit welcher *Haltung* oder welchem *methodischen Blick* eine/ein ‹${expert.roleForPrompt}› das Objekt ‹${objectInput}› betrachtet.

      Wichtig:
      1. Keine konkreten Alltagssituationen oder Geschichten ("Du stehst in der Küche..."). Das lenkt ab.
      2. Beschreibe den *Filter*: Worauf zoomt diese Person sofort rein? Was blendet sie aus? (z.B. "Du ignorierst den Zweck und siehst nur die Statik").
      3. Sei abstrakt genug, damit der Nutzer die Details selbst füllen muss.
      4. Sprich den Nutzer direkt an ("Achte auf...", "Betrachte es als...").

      Stil: Minimalistisch, fokussiert, anregend.
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Fehler: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        const newFrame = {
          id: Date.now(),
          expert: expert,
          objectName: objectInput,
          text: generatedText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setGeneratedFrames(prev => [newFrame, ...prev]);
      }
    } catch (err) {
      console.error("Fehler beim Generieren:", err);
      setError("Es gab ein Problem bei der Kommunikation mit der KI. Bitte versuche es erneut.");
    } finally {
      setLoadingExpertId(null);
    }
  };

  // --- UI COMPONENTS ---

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800 selection:bg-orange-100">

      {/* HEADER & INPUT SECTION */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Settings Button oben rechts */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowSettings(true)}
              className={`relative p-2 rounded-lg transition-colors ${
                !apiKey.trim()
                  ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
              }`}
              title={!apiKey.trim() ? "API-Key fehlt - Klicke hier zum Einstellen" : "Einstellungen"}
            >
              <Settings className="w-5 h-5" />
              {!apiKey.trim() && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2 text-stone-900">
              <Eye className="w-6 h-6 text-orange-500" />
              Perspektiven-Generator
            </h1>
            <p className="text-stone-500 mt-1">
              Setze eine neue Brille auf. Wie verändert sich dein Blick auf das Objekt?
            </p>
          </div>

          <div className="relative max-w-lg mx-auto group">
            <input
              type="text"
              value={objectInput}
              onChange={(e) => {
                setObjectInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Welches Objekt möchtest du untersuchen?"
              className="w-full pl-6 pr-12 py-4 text-lg bg-stone-100 border-2 border-stone-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all placeholder:text-stone-400 text-center shadow-inner font-medium"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-orange-500 transition-colors">
              <Lightbulb className="w-5 h-5" />
            </div>
          </div>

          {error && (
            <div className="text-center mt-3 text-red-500 text-sm font-medium animate-pulse">
              {error}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* EXPERTEN GRID (LINKS/OBEN) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              1. Wähle deine Brille
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPERTS.map((expert) => {
              const Icon = expert.icon;
              const isLoading = loadingExpertId === expert.id;
              const isBlocked = loadingExpertId !== null && !isLoading;

              return (
                <button
                  key={expert.id}
                  className={`
                    relative text-left group p-5 rounded-xl border-2 transition-all duration-200
                    ${expert.color} bg-opacity-40 border-opacity-40 hover:bg-opacity-60 hover:border-opacity-100 hover:shadow-md hover:-translate-y-0.5
                    ${isBlocked ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}
                    ${isLoading ? 'ring-2 ring-offset-1 ring-stone-400 scale-[0.98]' : ''}
                  `}
                  onClick={() => !loadingExpertId && generatePerspective(expert)}
                  disabled={!!loadingExpertId}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-white bg-opacity-60 rounded-lg backdrop-blur-sm shadow-sm">
                      <Icon className="w-5 h-5 opacity-90" />
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-stone-600" />}
                  </div>

                  <h3 className="font-bold text-lg mb-1">{expert.title}</h3>
                  <p className="text-xs font-medium opacity-70 leading-relaxed min-h-[2.5em]">
                    {expert.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-black border-opacity-5">
                    <span className="text-[10px] uppercase font-bold opacity-50 tracking-wider">Haltung einnehmen</span>
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center bg-white bg-opacity-50
                      group-hover:bg-white group-hover:scale-110 transition-all shadow-sm
                    `}>
                      <ArrowRight className="w-4 h-4 opacity-60" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* GENERIERTE IMPULSE (RECHTS/UNTEN) */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-stone-200 pt-8 lg:pt-0 lg:pl-8">
           <div className="flex items-center justify-between mb-6 sticky top-28 bg-stone-50 py-2 z-10 backdrop-blur-md bg-opacity-90">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              2. Deine neue Perspektive
            </h2>
            <span className="text-xs bg-stone-200 text-stone-600 px-2.5 py-1 rounded-full font-mono">
              {generatedFrames.length}
            </span>
          </div>

          <div className="space-y-6 pb-10">
            {generatedFrames.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 bg-stone-100/50">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Warte auf Fokus...</p>
                <p className="text-sm mt-2 max-w-xs mx-auto leading-relaxed opacity-70">
                  Wähle links eine Experten-Rolle, um den "Filter" dieser Person für dein Objekt zu erhalten.
                </p>
              </div>
            ) : (
              generatedFrames.map((frame) => (
                <FrameCard key={frame.id} frame={frame} />
              ))
            )}
          </div>
        </div>

      </main>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                Einstellungen
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {!apiKey.trim() && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-800">
                    ⚠️ Ein API-Key ist erforderlich, um die KI-Funktionalität zu nutzen. Bitte gib deinen eigenen Google Gemini API-Key ein.
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-stone-700 mb-2">
                  Google Gemini API-Key {!apiKey.trim() && <span className="text-orange-500">*</span>}
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={settingsApiKey}
                  onChange={(e) => setSettingsApiKey(e.target.value)}
                  placeholder="Gib deinen API-Key ein..."
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-orange-400 transition-colors font-mono text-sm ${
                    !apiKey.trim() ? 'border-orange-300 bg-orange-50' : 'border-stone-200'
                  }`}
                />
                <p className="mt-2 text-xs text-stone-500">
                  Dein API-Key wird lokal in deinem Browser gespeichert und nur von dir verwendet. Du kannst einen API-Key bei{' '}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-600 underline"
                  >
                    Google AI Studio
                  </a>{' '}
                  erstellen.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveApiKey}
                  disabled={!settingsApiKey.trim()}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    settingsApiKey.trim()
                      ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  Speichern
                </button>
                <button
                  onClick={() => {
                    setSettingsApiKey(apiKey);
                    setShowSettings(false);
                  }}
                  className="px-4 py-2 border-2 border-stone-200 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENT: FRAME CARD (Der Impuls) ---

function FrameCard({ frame }) {
  const Icon = frame.expert.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden group hover:shadow-md transition-shadow">

      {/* Header des Frames */}
      <div className={`px-5 py-4 flex items-center gap-3 border-b border-stone-100 ${frame.expert.color} bg-opacity-10`}>
        <div className={`p-2 rounded-full bg-white shadow-sm`}>
          <Icon className="w-4 h-4 text-stone-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
             <div className="text-xs font-bold uppercase tracking-wide text-stone-500 truncate">
              {frame.expert.title}-Blick
            </div>
             <div className="text-[10px] text-stone-400 font-mono ml-2">
              {frame.timestamp}
            </div>
          </div>
          <div className="text-sm font-bold text-stone-800 truncate">
            auf: {frame.objectName}
          </div>
        </div>
      </div>

      {/* Inhalt des Frames - Der Prompt für den User */}
      <div className="p-6">
        <div className="prose prose-stone prose-p:text-stone-700 prose-p:font-medium prose-p:text-lg prose-p:leading-snug">
          <p className="">
            {frame.text}
          </p>
        </div>

        {/* Call to Action für den User */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex gap-3 items-start">
           <div className="mt-1 w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
           <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
             Was entdeckst du durch diesen Filter?
           </p>
        </div>
      </div>
    </div>
  );
}