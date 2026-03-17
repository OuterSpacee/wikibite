import React, { useState } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
                <span>{language.nativeName}</span>
                <span style={{ fontSize: '0.7rem' }}>▼</span>
            </button>

            {isOpen && (
                <>
                    <div
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 100
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        backgroundColor: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        minWidth: '180px',
                        zIndex: 101,
                    }}>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang);
                                    setIsOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem 1rem',
                                    textAlign: 'left',
                                    backgroundColor: lang.code === language.code ? 'var(--border-color)' : 'transparent',
                                    color: 'var(--text-color)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
                                onMouseLeave={e => {
                                    if (lang.code !== language.code) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                {lang.nativeName}
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--secondary-text-color)' }}>
                                    {lang.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default LanguageSelector;
