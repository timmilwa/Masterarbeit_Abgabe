import React from 'react';
import { User, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
    role: 'user' | 'ai';
    content: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
    const isUser = role === 'user';

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 items-end ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar / Icon */}
                <div className={`
          flex items-center justify-center shrink-0 size-8 rounded-full border shadow-sm
          ${isUser ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-black border-border'}
        `}>
                    {isUser ? <User size={14} /> : <Sparkles size={14} />}
                </div>

                {/* Bubble */}
                <div className={`
          relative px-5 py-3.5 rounded-2xl shadow-sm text-base leading-relaxed border
          ${isUser
                        ? 'bg-primary text-primary-foreground border-primary rounded-tr-sm'
                        : 'bg-white text-foreground border-border rounded-tl-sm'
                    }
        `}>
                    {content}
                </div>
            </div>
        </div>
    );
};
