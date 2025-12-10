import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const ChatInterface = ({ messages, input, setInput, onSend, isTyping }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div style={containerStyle}>
            <div style={messagesListStyle}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            ...messageRowStyle,
                            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div
                            style={{
                                ...bubbleStyle,
                                backgroundColor: msg.sender === 'user' ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                                color: msg.sender === 'user' ? '#FFFFFF' : 'var(--color-text-primary)',
                            }}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div style={{ ...messageRowStyle, justifyContent: 'flex-start' }}>
                        <div style={{ ...bubbleStyle, backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}>
                            Schreibt...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={inputAreaStyle}>
                <div style={inputWrapperStyle}>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Deine Antwort..."
                        rows={1}
                        style={textareaStyle}
                    />
                    <button
                        onClick={onSend}
                        disabled={!input.trim()}
                        style={{
                            ...sendButtonStyle,
                            opacity: !input.trim() ? 0.5 : 1
                        }}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const containerStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative'
};

const messagesListStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: 'var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)'
};

const messageRowStyle = {
    display: 'flex',
    width: '100%'
};

const bubbleStyle = {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: 'var(--font-size-body)',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap'
};

const inputAreaStyle = {
    padding: 'var(--spacing-md) var(--spacing-lg)',
    backgroundColor: 'var(--color-bg-primary)',
    borderTop: '1px solid var(--color-border)'
};

const inputWrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-secondary)',
    borderRadius: '24px',
    padding: '4px 8px 4px 16px',
    border: '1px solid transparent',
    transition: 'border-color 0.2s'
};

const textareaStyle = {
    flex: 1,
    border: 'none',
    background: 'transparent',
    resize: 'none',
    padding: '10px 0',
    outline: 'none',
    fontSize: 'var(--font-size-body)',
    maxHeight: '100px',
    minHeight: '24px'
};

const sendButtonStyle = {
    padding: '8px',
    color: 'var(--color-accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s'
};

export default ChatInterface;
