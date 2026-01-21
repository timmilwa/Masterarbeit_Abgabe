import React, { useRef, useEffect } from 'react';
import { Message, ReflectionLevel, StagedResponse } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  stagedResponses: StagedResponse[];
  isLoading: boolean;
  onAddStagedResponse: (text: string) => void;
  onCommitStagedResponses: () => void;
  onRemoveStagedResponse: (id: string) => void;
  currentLevel: ReflectionLevel;
  disabled: boolean;
  headerContent?: React.ReactNode;
  hasDraftPin: boolean;
  highlightedMessageId: string | null;
  onAnnotationClick: (annotationId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  stagedResponses,
  isLoading, 
  onAddStagedResponse,
  onCommitStagedResponses,
  onRemoveStagedResponse,
  currentLevel,
  disabled,
  headerContent,
  hasDraftPin,
  highlightedMessageId,
  onAnnotationClick
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [inputText, setInputText] = React.useState('');

  const scrollToBottom = () => {
    if (!highlightedMessageId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (highlightedMessageId && messageRefs.current[highlightedMessageId]) {
      messageRefs.current[highlightedMessageId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
       scrollToBottom();
    }
  }, [messages, isLoading, highlightedMessageId, stagedResponses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !disabled && !isLoading) {
      onAddStagedResponse(inputText);
      setInputText('');
    }
  };

  const getThemeColor = () => {
    switch (currentLevel) {
      case ReflectionLevel.FUNCTIONAL: return "blue";
      case ReflectionLevel.EMOTIONAL: return "rose";
      case ReflectionLevel.SYMBOLIC: return "purple";
      default: return "gray";
    }
  };

  const theme = getThemeColor();

  // Helper to render bold text from markdown-like **syntax**
  const formatMessageText = (text: string) => {
    // Split by the markdown bold syntax
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        {headerContent}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 relative">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center opacity-60">
            <p>Setup abschließen um Analyse zu starten.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isHighlighted = msg.id === highlightedMessageId;
          return (
            <div
              key={msg.id}
              ref={el => messageRefs.current[msg.id] = el}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} ${isHighlighted ? 'ring-4 ring-indigo-100 rounded-lg p-1 transition-all duration-300' : ''}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed relative whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-gray-800 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  }`}
              >
                {formatMessageText(msg.text)}
              </div>
              
              {msg.annotationId && (
                <button
                  onClick={() => onAnnotationClick(msg.annotationId!)}
                  className="mt-1 flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <span>📍</span>
                  <span>Am Bild angepinnt</span>
                </button>
              )}
            </div>
          );
        })}

        {/* Staged Responses Preview (The Draft List) */}
        {stagedResponses.length > 0 && (
          <div className="flex flex-col items-end space-y-2 mt-6">
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mr-1">Deine Antworten (noch nicht gesendet)</div>
            {stagedResponses.map((staged) => (
              <div key={staged.id} className="relative group max-w-[85%]">
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl rounded-br-none px-4 py-2 text-sm shadow-sm flex items-start gap-2">
                  <span>{staged.text}</span>
                  {staged.draftPin && <span className="text-[10px] bg-emerald-200 px-1 rounded mt-0.5">📍</span>}
                </div>
                <button 
                  onClick={() => onRemoveStagedResponse(staged.id)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs border border-red-200 hover:bg-red-200"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm">
              <div className="flex space-x-2">
                <div className={`w-2 h-2 bg-${theme}-400 rounded-full animate-bounce`}></div>
                <div className={`w-2 h-2 bg-${theme}-400 rounded-full animate-bounce delay-75`}></div>
                <div className={`w-2 h-2 bg-${theme}-400 rounded-full animate-bounce delay-150`}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200">
        
        {/* Info Banner for Pinning */}
        {hasDraftPin ? (
           <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg mb-2 text-xs border border-emerald-100">
            <span className="flex items-center gap-1">
              📍 <b>Ort gewählt.</b> Wird zur nächsten Antwort hinzugefügt.
            </span>
          </div>
        ) : (
           stagedResponses.length === 0 && !disabled && (
             <div className="text-[10px] text-gray-400 text-center mb-1">
               Tipp: Klicke zuerst ins Bild, um eine Stelle zu markieren.
             </div>
           )
        )}

        {/* Input Form */}
        <div className="flex flex-col gap-2">
           <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={disabled ? "Erst Setup..." : "Antwort hinzufügen..."}
              disabled={disabled}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all disabled:opacity-50 text-sm"
            />
            <button
              type="submit"
              disabled={disabled || isLoading || !inputText.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              title="Zur Liste hinzufügen"
            >
              + Hinzufügen
            </button>
          </form>

          {/* SEND ALL Button */}
          {stagedResponses.length > 0 && (
            <button
              onClick={onCommitStagedResponses}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-all flex justify-center items-center gap-2
                ${isLoading ? 'bg-gray-400' : `bg-${theme}-600 hover:bg-${theme}-700 hover:shadow-lg`}
              `}
            >
              {isLoading ? (
                <span>Sende...</span>
              ) : (
                <>
                  <span>{stagedResponses.length} Antwort{stagedResponses.length !== 1 ? 'en' : ''} absenden</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;