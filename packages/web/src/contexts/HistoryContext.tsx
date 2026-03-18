import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { WikiCache, type HistoryItem as CacheHistoryItem } from '../services/cache';

export interface HistoryItem {
    topic: string;
    timestamp: number;
}

interface HistoryContextType {
    history: HistoryItem[];
    addToHistory: (topic: string) => void;
    clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

const HISTORY_LIMIT = 500;

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const cacheRef = useRef<WikiCache | null>(null);

    // Initialize cache and load persisted history on mount
    useEffect(() => {
        const cache = new WikiCache();
        cacheRef.current = cache;

        cache.getHistory(HISTORY_LIMIT).then((items) => {
            setHistory(items.map((item) => ({
                topic: item.topic,
                timestamp: item.timestamp,
            })));
        }).catch((err) => {
            console.error('Failed to load history from IndexedDB:', err);
        });
    }, []);

    const addToHistory = useCallback((topic: string) => {
        const now = Date.now();

        setHistory((prev) => {
            // Avoid duplicates at the top of the stack
            if (prev.length > 0 && prev[0].topic.toLowerCase() === topic.toLowerCase()) {
                return prev;
            }
            return [{ topic, timestamp: now }, ...prev].slice(0, HISTORY_LIMIT);
        });

        // Persist to IndexedDB (fire-and-forget)
        if (cacheRef.current) {
            const item: CacheHistoryItem = { topic, language: '', timestamp: now };
            cacheRef.current.addHistory(item).catch((err) => {
                console.error('Failed to persist history item:', err);
            });
        }
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        if (cacheRef.current) {
            cacheRef.current.clear().catch((err) => {
                console.error('Failed to clear history from IndexedDB:', err);
            });
        }
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
