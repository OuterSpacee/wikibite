import React, { useState } from 'react';
import { useHistory } from '../contexts/HistoryContext';

interface HistorySidebarProps {
    onSelectTopic: (topic: string) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ onSelectTopic }) => {
    const { history, clearHistory } = useHistory();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    top: '2rem',
                    left: '2rem',
                    zIndex: 1000,
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-color)',
                    opacity: 0.7,
                    transition: 'opacity 0.2s',
                }}
                aria-label="Toggle History"
            >
                {isOpen ? '✕' : '☰'}
            </button>

            {/* Sidebar Drawer */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '250px',
                backgroundColor: 'var(--bg-color)',
                borderRight: '1px solid var(--border-color)',
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease-in-out',
                zIndex: 999,
                padding: '5rem 1rem 2rem 1rem',
                boxShadow: isOpen ? '2px 0 10px rgba(0,0,0,0.1)' : 'none',
                overflowY: 'auto',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>History</h3>
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            style={{ fontSize: '0.8rem', color: 'var(--error-color)', textDecoration: 'underline' }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <p style={{ color: 'var(--secondary-text-color)', fontSize: '0.9rem' }}>No history yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {history.map((item, index) => (
                            <li key={index} style={{ marginBottom: '0.8rem' }}>
                                <button
                                    onClick={() => {
                                        onSelectTopic(item.topic);
                                        setIsOpen(false); // Auto-close on selection on mobile/desktop for cleaner feel
                                    }}
                                    style={{
                                        textAlign: 'left',
                                        width: '100%',
                                        color: 'var(--text-color)',
                                        fontSize: '0.95rem',
                                        padding: '0.3rem 0',
                                        borderBottom: '1px solid transparent',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.color = 'var(--accent-color)';
                                        e.currentTarget.style.paddingLeft = '5px';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.color = 'var(--text-color)';
                                        e.currentTarget.style.paddingLeft = '0';
                                    }}
                                >
                                    {item.topic}
                                </button>
                                <span style={{ fontSize: '0.75rem', color: 'var(--secondary-text-color)', display: 'block' }}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Overlay to close when clicking outside */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        zIndex: 998
                    }}
                />
            )}
        </>
    );
};

export default HistorySidebar;
