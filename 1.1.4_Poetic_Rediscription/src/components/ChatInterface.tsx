import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ArrowUp, Settings, X, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init-1',
            role: 'ai',
            content: 'Worüber möchtest du heute reflektieren? Nenne mir einen Gegenstand.',
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiKey, setApiKey] = useState(() => {
        return localStorage.getItem('gemini_api_key') || '';
    });
    const [customInstructions, setCustomInstructions] = useState(() => {
        return localStorage.getItem('custom_instructions') || '';
    });
    const [selectedModel, setSelectedModel] = useState(() => {
        return localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    });
    const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    const geminiModels = [
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Balanced)' },
        { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp (Latest)' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-pro', label: 'Gemini Pro (Legacy)' },
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setIsSettingsOpen(false);
            }
        };

        if (isSettingsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsOpen]);

    const handleSaveSettings = () => {
        localStorage.setItem('gemini_api_key', apiKey);
        localStorage.setItem('custom_instructions', customInstructions);
        localStorage.setItem('gemini_model', selectedModel);
        setIsSettingsOpen(false);
    };

    const validateApiKey = async () => {
        if (!apiKey.trim()) {
            setApiKeyStatus('invalid');
            return;
        }

        setApiKeyStatus('checking');

        try {
            // Test the API key with a simple request
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: 'test' }],
                        }],
                    }),
                }
            );

            if (response.ok) {
                setApiKeyStatus('valid');
            } else {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error?.message?.includes('API key')) {
                    setApiKeyStatus('invalid');
                } else {
                    // If it's not an API key error, the key is probably valid
                    setApiKeyStatus('valid');
                }
            }
        } catch (error) {
            console.error('Error validating API key:', error);
            setApiKeyStatus('invalid');
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const storedApiKey = localStorage.getItem('gemini_api_key');
        if (!storedApiKey) {
            alert('Bitte gib deinen Google Gemini API Key in den Einstellungen ein.');
            setIsSettingsOpen(true);
            return;
        }

        const newUserMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
        };

        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await callGeminiAPI(storedApiKey, inputValue, messages);
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response,
            };
            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: `Entschuldigung, es ist ein Fehler aufgetreten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}. Bitte überprüfe deinen API Key und versuche es erneut.`,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const callGeminiAPI = async (apiKey: string, userMessage: string, conversationHistory: Message[]): Promise<string> => {
        const customInstructions = localStorage.getItem('custom_instructions') || '';
        
        // Build conversation history for context (exclude the initial AI greeting if needed)
        const history = conversationHistory
            .filter(msg => msg.role === 'user' || msg.role === 'ai')
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            }));

        // Add the current user message
        history.push({
            role: 'user',
            parts: [{ text: userMessage }],
        });

        // Build the system instruction with custom instructions
        let systemInstruction = 'Du bist ein hilfreicher Assistent für die "Poetische Umdeutung" nach Paul Ricoeur. Du hilfst Nutzern dabei, über Gegenstände zu reflektieren und ihre Bedeutung zu erkunden.';
        if (customInstructions.trim()) {
            systemInstruction += `\n\nZusätzliche Anweisungen:\n${customInstructions}`;
        }

        const requestBody = {
            contents: history,
            systemInstruction: {
                parts: [{ text: systemInstruction }],
            },
        };

        const model = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Ungültige Antwort vom API');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-muted-foreground tracking-wide">Poetic Rediscription by Paul Ricoeur</span>
                </div>
                <div className="relative" ref={settingsRef}>
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="flex items-center justify-center size-9 rounded-lg transition-all duration-200 hover:bg-accent text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                        aria-label="Settings"
                    >
                        <Settings size={18} strokeWidth={2} />
                    </button>
                    {isSettingsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-lg shadow-lg p-4 z-20">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-popover-foreground">Settings</h3>
                                <button
                                    onClick={() => setIsSettingsOpen(false)}
                                    className="flex items-center justify-center size-6 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Close settings"
                                >
                                    <X size={14} strokeWidth={2} />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="api-key" className="block text-xs font-medium text-popover-foreground mb-1.5">
                                        Google Gemini API Key
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="api-key"
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => {
                                                setApiKey(e.target.value);
                                                setApiKeyStatus('idle');
                                            }}
                                            placeholder="Enter your API key"
                                            className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-transparent transition-all"
                                        />
                                        <button
                                            onClick={validateApiKey}
                                            disabled={apiKeyStatus === 'checking'}
                                            className="flex items-center justify-center size-9 rounded-md bg-accent hover:bg-accent/80 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Validate API key"
                                        >
                                            {apiKeyStatus === 'checking' && (
                                                <Loader2 size={16} className="animate-spin" />
                                            )}
                                            {apiKeyStatus === 'valid' && (
                                                <CheckCircle2 size={16} className="text-green-600" />
                                            )}
                                            {apiKeyStatus === 'invalid' && (
                                                <XCircle size={16} className="text-red-600" />
                                            )}
                                            {apiKeyStatus === 'idle' && (
                                                <CheckCircle2 size={16} />
                                            )}
                                        </button>
                                    </div>
                                    {apiKeyStatus === 'valid' && (
                                        <p className="text-xs text-green-600 mt-1">API Key ist gültig</p>
                                    )}
                                    {apiKeyStatus === 'invalid' && (
                                        <p className="text-xs text-red-600 mt-1">API Key ist ungültig</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="model-select" className="block text-xs font-medium text-popover-foreground mb-1.5">
                                        Gemini Model
                                    </label>
                                    <select
                                        id="model-select"
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-transparent transition-all"
                                    >
                                        {geminiModels.map((model) => (
                                            <option key={model.value} value={model.value}>
                                                {model.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="custom-instructions" className="block text-xs font-medium text-popover-foreground mb-1.5">
                                        Custom AI Instructions
                                    </label>
                                    <textarea
                                        id="custom-instructions"
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        placeholder="Enter custom instructions for the AI..."
                                        rows={4}
                                        className="w-full px-3 py-2 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-transparent transition-all resize-y"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveSettings}
                                    className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring/30"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
                ))}
                {isTyping && (
                    <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 px-4 py-3 bg-white border border-border rounded-2xl rounded-tl-sm shadow-sm">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-background/80 backdrop-blur-sm border-t border-border/40">
                <form
                    onSubmit={handleSendMessage}
                    className="relative flex items-center gap-2 p-2 bg-input rounded-md border border-transparent focus-within:border-ring/30 focus-within:ring-4 focus-within:ring-ring/10 transition-all duration-300"
                >
                    <input
                        type="text"
                        className="flex-1 bg-transparent px-4 py-2 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                        placeholder="Schreibe deine Gedanken..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className={`
              flex items-center justify-center size-10 rounded-lg transition-all duration-200
              ${inputValue.trim()
                                ? 'bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95'
                                : 'bg-transparent text-muted-foreground cursor-not-allowed opacity-50'
                            }
            `}
                    >
                        <ArrowUp size={20} strokeWidth={2.5} />
                    </button>
                </form>
            </div>
        </div>
    );
};
