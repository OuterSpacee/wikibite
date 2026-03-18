import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface CachedDefinition {
  id: string;
  topic: string;
  language: string;
  provider: string;
  model: string;
  content: string;
  asciiArt: string;
  metadata: { keyFacts: string[]; relatedTopics: string[] };
  createdAt: number;
  accessedAt: number;
}

export interface HistoryItem {
  topic: string;
  language: string;
  timestamp: number;
}

export interface CacheStats {
  definitionCount: number;
  historyCount: number;
}

interface WikiCacheDB extends DBSchema {
  definitions: {
    key: string;
    value: CachedDefinition;
  };
  history: {
    key: number;
    value: HistoryItem;
    indexes: { 'by-timestamp': number };
  };
}

function makeKey(topic: string, language: string, provider: string, model: string): string {
  return `${topic.toLowerCase()}:${language}:${provider}:${model}`;
}

const DB_NAME = 'wiki-cache';
const DB_VERSION = 1;

export class WikiCache {
  private dbPromise: Promise<IDBPDatabase<WikiCacheDB>>;

  constructor() {
    this.dbPromise = openDB<WikiCacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('definitions')) {
          db.createObjectStore('definitions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', {
            autoIncrement: true,
          });
          historyStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  async putDefinition(input: {
    topic: string;
    language: string;
    provider: string;
    model: string;
    content: string;
    asciiArt: string;
    metadata: { keyFacts: string[]; relatedTopics: string[] };
  }): Promise<CachedDefinition> {
    const db = await this.dbPromise;
    const now = Date.now();
    const id = makeKey(input.topic, input.language, input.provider, input.model);

    const definition: CachedDefinition = {
      id,
      topic: input.topic,
      language: input.language,
      provider: input.provider,
      model: input.model,
      content: input.content,
      asciiArt: input.asciiArt,
      metadata: input.metadata,
      createdAt: now,
      accessedAt: now,
    };

    await db.put('definitions', definition);
    return definition;
  }

  async getDefinition(
    topic: string,
    language: string,
    provider: string,
    model: string,
  ): Promise<CachedDefinition | undefined> {
    const db = await this.dbPromise;
    const id = makeKey(topic, language, provider, model);
    const definition = await db.get('definitions', id);

    if (!definition) {
      return undefined;
    }

    // Update accessedAt on read (LRU tracking)
    definition.accessedAt = Date.now();
    await db.put('definitions', definition);

    return definition;
  }

  async addHistory(item: HistoryItem): Promise<void> {
    const db = await this.dbPromise;
    await db.add('history', item);
  }

  async getHistory(limit: number): Promise<HistoryItem[]> {
    const db = await this.dbPromise;
    const tx = db.transaction('history', 'readonly');
    const index = tx.store.index('by-timestamp');

    const items: HistoryItem[] = [];
    let cursor = await index.openCursor(null, 'prev');

    while (cursor && items.length < limit) {
      items.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return items;
  }

  async getStats(): Promise<CacheStats> {
    const db = await this.dbPromise;
    const [definitionCount, historyCount] = await Promise.all([
      db.count('definitions'),
      db.count('history'),
    ]);
    return { definitionCount, historyCount };
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['definitions', 'history'], 'readwrite');
    await Promise.all([
      tx.objectStore('definitions').clear(),
      tx.objectStore('history').clear(),
      tx.done,
    ]);
  }

  async exportAll(): Promise<CachedDefinition[]> {
    const db = await this.dbPromise;
    return db.getAll('definitions');
  }

  async importAll(definitions: CachedDefinition[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('definitions', 'readwrite');
    await Promise.all([
      ...definitions.map((def) => tx.store.put(def)),
      tx.done,
    ]);
  }
}
