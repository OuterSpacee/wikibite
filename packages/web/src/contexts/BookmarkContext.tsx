import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { openDB, type IDBPDatabase } from 'idb';

export interface BookmarkItem {
  id: string;
  topic: string;
  language: string;
  provider: string;
  model: string;
  createdAt: number;
}

interface BookmarkContextValue {
  bookmarks: BookmarkItem[];
  toggleBookmark: (topic: string, lang: string, provider: string, model: string) => Promise<void>;
  isBookmarked: (topic: string) => boolean;
  getBookmarks: () => BookmarkItem[];
  removeBookmark: (id: string) => Promise<void>;
  loading: boolean;
}

const BOOKMARKS_DB_NAME = 'wiki-bookmarks';
const BOOKMARKS_DB_VERSION = 1;
const STORE_NAME = 'bookmarks';

function makeBookmarkId(topic: string): string {
  return topic.toLowerCase().trim();
}

async function openBookmarksDB(): Promise<IDBPDatabase> {
  return openDB(BOOKMARKS_DB_NAME, BOOKMARKS_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
      }
    },
  });
}

const BookmarkContext = createContext<BookmarkContextValue | undefined>(undefined);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load bookmarks from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await openBookmarksDB();
        const all = await db.getAll(STORE_NAME);
        if (!cancelled) {
          // Sort by createdAt descending (newest first)
          const sorted = (all as BookmarkItem[]).sort((a, b) => b.createdAt - a.createdAt);
          setBookmarks(sorted);
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const isBookmarked = useCallback(
    (topic: string): boolean => {
      const id = makeBookmarkId(topic);
      return bookmarks.some((b) => b.id === id);
    },
    [bookmarks],
  );

  const toggleBookmark = useCallback(
    async (topic: string, lang: string, provider: string, model: string): Promise<void> => {
      const id = makeBookmarkId(topic);
      const db = await openBookmarksDB();

      const existing = await db.get(STORE_NAME, id);
      if (existing) {
        // Remove bookmark
        await db.delete(STORE_NAME, id);
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
      } else {
        // Add bookmark
        const bookmark: BookmarkItem = {
          id,
          topic,
          language: lang,
          provider,
          model,
          createdAt: Date.now(),
        };
        await db.put(STORE_NAME, bookmark);
        setBookmarks((prev) => [bookmark, ...prev]);
      }
    },
    [],
  );

  const removeBookmark = useCallback(async (id: string): Promise<void> => {
    const db = await openBookmarksDB();
    await db.delete(STORE_NAME, id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const getBookmarks = useCallback((): BookmarkItem[] => {
    return bookmarks;
  }, [bookmarks]);

  const value: BookmarkContextValue = {
    bookmarks,
    toggleBookmark,
    isBookmarked,
    getBookmarks,
    removeBookmark,
    loading,
  };

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
};

export function useBookmarks(): BookmarkContextValue {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
}
