import React, { useState } from 'react';
import { ReflectionLevel, Message, ImageFile, Annotation, StagedResponse } from './types';
import { initializeChat, sendMessageToChat, switchLevelInChat, resetAI } from './services/geminiService';
import ChatInterface from './components/ChatInterface';
import ContextSelector from './components/ContextSelector';
import ImagePanel from './components/ImagePanel';
import Settings from './components/Settings';

function App() {
  const [currentLevel, setCurrentLevel] = useState<ReflectionLevel>(ReflectionLevel.FUNCTIONAL);
  const [imageFile, setImageFile] = useState<ImageFile | null>(null);
  const [objectName, setObjectName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatStarted, setIsChatStarted] = useState(false);
  
  // Annotation & Staging State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draftPin, setDraftPin] = useState<{x: number, y: number} | null>(null);
  const [stagedResponses, setStagedResponses] = useState<StagedResponse[]>([]);
  
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    // Reset AI instance when settings are closed (in case API key was changed)
    resetAI();
  };

  const handleStartAnalysis = async () => {
    if (!imageFile || !objectName.trim()) return;

    setIsLoading(true);
    setIsChatStarted(true);
    setMessages([]);
    setAnnotations([]);
    setStagedResponses([]);
    setDraftPin(null);
    resetAI();

    try {
      const responseText = await initializeChat(imageFile, objectName, currentLevel);
      const aiMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages([aiMsg]);
    } catch (error) {
      console.error("Error starting chat:", error);
      setIsChatStarted(false);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      alert(`Fehler beim Starten der Analyse: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Add to Staging List
  const handleAddStagedResponse = (text: string) => {
    const newStaged: StagedResponse = {
      id: Date.now().toString(),
      text: text,
      draftPin: draftPin
    };
    setStagedResponses(prev => [...prev, newStaged]);
    setDraftPin(null); // Clear draft pin after adding
  };

  // 2. Remove from List
  const handleRemoveStagedResponse = (id: string) => {
    setStagedResponses(prev => prev.filter(r => r.id !== id));
  };

  // 3. Commit (Send) All Staged Responses
  const handleCommitStagedResponses = async () => {
    if (stagedResponses.length === 0) return;

    setIsLoading(true);

    // Convert staged items to messages and annotations
    const newMessages: Message[] = [];
    const newAnnotations: Annotation[] = [];

    stagedResponses.forEach(staged => {
      let annotationId: string | undefined = undefined;
      
      if (staged.draftPin) {
        annotationId = `ann-${staged.id}`;
        newAnnotations.push({
          id: annotationId,
          x: staged.draftPin.x,
          y: staged.draftPin.y,
          messageId: staged.id,
          level: currentLevel // Save the color context based on current level
        });
      }

      newMessages.push({
        id: staged.id,
        role: 'user',
        text: staged.text,
        timestamp: new Date(),
        annotationId: annotationId
      });
    });

    // Update UI State immediately
    setMessages(prev => [...prev, ...newMessages]);
    setAnnotations(prev => [...prev, ...newAnnotations]);
    setStagedResponses([]); // Clear staging area

    // Build combined prompt for AI
    const combinedPrompt = stagedResponses.map(s => `- ${s.text}`).join('\n');

    try {
      const responseText = await sendMessageToChat(combinedPrompt);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: Message = {
         id: (Date.now() + 1).toString(),
         role: 'model',
         text: "⚠️ Verbindungsfehler. Bitte versuche es noch einmal.",
         timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = async (level: ReflectionLevel) => {
    if (level === currentLevel) return;
    setCurrentLevel(level);

    if (isChatStarted) {
      // Clear any pending responses on level switch
      setStagedResponses([]);
      setDraftPin(null);

      const switchMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: `Wechsel zur Ebene "${level}"`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, switchMsg]);

      setIsLoading(true);
      try {
        const responseText = await switchLevelInChat(level);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: responseText,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
      } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Fehler beim Wechseln.', timestamp: new Date()}]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleImageClick = (x: number, y: number) => {
    if (isChatStarted && !isLoading) {
      setDraftPin({ x, y });
      setHighlightedAnnotationId(null);
      setHighlightedMessageId(null);
    }
  };

  const handlePinClick = (annotationId: string) => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (annotation) {
      setHighlightedAnnotationId(annotationId);
      setHighlightedMessageId(annotation.messageId);
    }
  };

  const handleAnnotationBadgeClick = (annotationId: string) => {
    setHighlightedAnnotationId(annotationId);
    setTimeout(() => setHighlightedAnnotationId(null), 2000);
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      
      <div className="absolute top-4 right-4 z-50">
         <button 
          onClick={handleSettingsOpen}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          title="Einstellungen"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <Settings isOpen={isSettingsOpen} onClose={handleSettingsClose} />

      <div className="w-full max-w-[1600px] h-full flex flex-col md:flex-row gap-4">
        
        <div className="flex-1 min-h-[40vh] md:min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
           <ImagePanel 
             imageFile={imageFile} 
             onImageUpload={setImageFile}
             isChatActive={isChatStarted}
             annotations={annotations}
             stagedResponses={stagedResponses}
             draftPin={draftPin}
             onImageClick={handleImageClick}
             onPinClick={handlePinClick}
             highlightedAnnotationId={highlightedAnnotationId}
           />
        </div>

        <div className="h-[50vh] md:h-full w-full md:w-[400px] lg:w-[450px] flex flex-col min-w-0">
          
          <ChatInterface 
            messages={messages}
            stagedResponses={stagedResponses} 
            isLoading={isLoading} 
            onAddStagedResponse={handleAddStagedResponse}
            onCommitStagedResponses={handleCommitStagedResponses}
            onRemoveStagedResponse={handleRemoveStagedResponse}
            currentLevel={currentLevel}
            disabled={!isChatStarted}
            hasDraftPin={!!draftPin}
            highlightedMessageId={highlightedMessageId}
            onAnnotationClick={handleAnnotationBadgeClick}
            headerContent={
              <div className="flex flex-col gap-4">
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Fokus-Objekt
                    </label>
                    <input
                      type="text"
                      value={objectName}
                      onChange={(e) => setObjectName(e.target.value)}
                      placeholder="Was analysieren wir?"
                      disabled={isChatStarted}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                 </div>

                 <ContextSelector 
                    currentLevel={currentLevel} 
                    onSelect={handleLevelChange} 
                    disabled={isLoading}
                 />

                 {!isChatStarted && (
                   <button
                     onClick={handleStartAnalysis}
                     disabled={!imageFile || !objectName.trim() || isLoading}
                     className={`w-full py-3 rounded-lg font-bold text-sm shadow-sm transition-all
                       ${!imageFile || !objectName.trim() 
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                         : 'bg-indigo-600 text-white hover:bg-indigo-700'
                       }
                     `}
                   >
                     {isLoading ? 'Analysiere...' : 'Analyse Starten'}
                   </button>
                 )}
              </div>
            }
          />
        </div>

      </div>
    </div>
  );
}

export default App;