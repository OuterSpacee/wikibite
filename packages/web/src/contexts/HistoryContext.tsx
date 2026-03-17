import React, { createContext, useContext, useState, useCallback } from 'react';

interface HistoryItem {
    topic: string;
    timestamp: number;
}

interface HistoryContextType {
    history: HistoryItem[];
    addToHistory: (topic: string) => void;
    clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const addToHistory = useCallback((topic: string) => {
        setHistory((prev) => {
            // Avoid duplicates at the top of the stack
            if (prev.length > 0 && prev[0].topic.toLowerCase() === topic.toLowerCase()) {
                return prev;
            }
            return [{ topic, timestamp: Date.now() }, ...prev].slice(0, 50); // Keep last 50 items
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    return (
        <HistoryContext.Provider value={{ history, addToHistory, clearHistory }}>
            {children}
        </HistoryContext.Provider>
    );
};

export const useHistory = () => {
    const context = useContext(HistoryContext);
    if (context === undefined) {
        throw new Error('useHistory must be used within a HistoryProvider');
    }
    return context;
};
