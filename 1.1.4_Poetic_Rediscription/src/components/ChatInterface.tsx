import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ArrowUp } from 'lucide-react';

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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        // Demo Logic: Simulate AI delay and response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: generateDemoResponse(newUserMessage.content),
            };
            setMessages((prev) => [...prev, aiResponse]);
            setIsTyping(false);
        }, 1500); // 1.5s delay for "thinking"
    };

    // Simple mock logic for Poetic Rediscription
    const generateDemoResponse = (userInput: string) => {
        // In a real app, this would call Gemini.
        // For now, we simulate the first step of "Function, Emotion, Values".
        return `Das ist ein interessantes Objekt: "${userInput}". \n\nLass uns tiefer blicken. Welche Funktion erfüllt dieses Objekt für dich im Alltag, und wie würdest du es jemandem beschreiben, der es noch nie gesehen hat?`;
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-muted-foreground tracking-wide">Poetic Rediscription</span>
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
                    className="relative flex items-center gap-2 p-2 bg-input rounded-xl border border-transparent focus-within:border-ring/30 focus-within:ring-4 focus-within:ring-ring/10 transition-all duration-300"
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
