import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Language {
    code: string;
    name: string;
    nativeName: string;
    rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const savedLang = localStorage.getItem('wikibite-language');
        return SUPPORTED_LANGUAGES.find(l => l.code === savedLang) || SUPPORTED_LANGUAGES[0];
    });

    const setLanguage = useCallback((newLanguage: Language) => {
        setLanguageState(newLanguage);
        localStorage.setItem('wikibite-language', newLanguage.code);
        document.documentElement.setAttribute('dir', newLanguage.rtl ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', newLanguage.code);
    }, []);

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
