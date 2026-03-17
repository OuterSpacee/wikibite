import React, { useState, useRef, useEffect } from 'react';
import { streamChatResponse, ChatMessage } from '../services/geminiService';

interface WikiChatProps {
    currentTopic: string;
}

const WikiChat: React.FC<WikiChatProps> = ({ currentTopic }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Reset chat when topic changes, or maybe keep it? 
    // For now, let's keep it but add a system note or just let the context switch naturally.
    // Actually, clearing it might be less confusing for a "Wiki" context.
    useEffect(() => {
        setMessages([]);
    }, [currentTopic]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsTyping(true);

        let fullResponse = '';
        setMessages(prev => [...prev, { role: 'model', text: '' }]); // Placeholder

        try {
            for await (const chunk of streamChatResponse(messages, userMessage, currentTopic)) {
                fullResponse += chunk;
                setMessages(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
                    return newHistory;
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
        }}>
            {isOpen && (
                <div style={{
                    width: '350px',
                    height: '500px',
                    backgroundColor: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-color)',
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Wiki Tutor</h3>
                        <button onClick={() => setIsOpen(false)} style={{ fontSize: '1.2rem' }}>×</button>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.8rem',
                    }}>
                        {messages.length === 0 && (
                            <p style={{ color: 'var(--secondary-text-color)', textAlign: 'center', marginTop: '50%' }}>
                                Ask me anything about "{currentTopic}"!
                            </p>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                backgroundColor: msg.role === 'user' ? 'var(--accent-color)' : 'var(--border-color)',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-color)',
                                padding: '0.6rem 1rem',
                                borderRadius: '12px',
                                maxWidth: '80%',
                                wordWrap: 'break-word',
                                fontSize: '0.95rem',
                            }}>
                                {msg.text}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} style={{
                        padding: '1rem',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '0.5rem',
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                borderRadius: '20px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-color)',
                                color: 'var(--text-color)',
                                outline: 'none',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            style={{
                                backgroundColor: 'var(--accent-color)',
                                color: '#fff',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: (!input.trim() || isTyping) ? 0.5 : 1,
                            }}
                        >
                            ↑
                        </button>
                    </form>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: 'var(--accent-color)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '56px',
                    height: '56px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isOpen ? '×' : '?'}
            </button>
        </div>
    );
};

export default WikiChat;
