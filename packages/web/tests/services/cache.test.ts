import { describe, it, expect, beforeEach } from 'vitest';
import { WikiCache } from '@/services/cache';

describe('WikiCache', () => {
  let cache: WikiCache;

  beforeEach(async () => {
    cache = new WikiCache();
    await cache.clear();
  });

  describe('definitions', () => {
    it('stores and retrieves a definition', async () => {
      await cache.putDefinition({
        topic: 'Quantum',
        language: 'English',
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        content: 'Quantum is...',
        asciiArt: '┌──┐',
        metadata: { keyFacts: ['fact1'], relatedTopics: ['Physics'] },
      });

      const result = await cache.getDefinition('Quantum', 'English', 'gemini', 'gemini-2.5-flash');
      expect(result).toBeDefined();
      expect(result!.content).toBe('Quantum is...');
      expect(result!.metadata.keyFacts).toEqual(['fact1']);
    });

    it('returns undefined for cache miss', async () => {
      const result = await cache.getDefinition('Unknown', 'English', 'gemini', 'flash');
      expect(result).toBeUndefined();
    });

    it('updates accessedAt on read', async () => {
      await cache.putDefinition({
        topic: 'Test',
        language: 'English',
        provider: 'gemini',
        model: 'flash',
        content: 'x',
        asciiArt: '',
        metadata: { keyFacts: [], relatedTopics: [] },
      });

      const first = await cache.getDefinition('Test', 'English', 'gemini', 'flash');
      // Small delay
      await new Promise(r => setTimeout(r, 10));
      const second = await cache.getDefinition('Test', 'English', 'gemini', 'flash');
      expect(second!.accessedAt).toBeGreaterThanOrEqual(first!.accessedAt);
    });
  });

  describe('history', () => {
    it('stores and retrieves history', async () => {
      await cache.addHistory({ topic: 'Quantum', language: 'English', timestamp: Date.now() });
      await cache.addHistory({ topic: 'Physics', language: 'English', timestamp: Date.now() });
      const history = await cache.getHistory(10);
      expect(history).toHaveLength(2);
    });

    it('returns history in reverse chronological order', async () => {
      await cache.addHistory({ topic: 'First', language: 'English', timestamp: 1000 });
      await cache.addHistory({ topic: 'Second', language: 'English', timestamp: 2000 });
      const history = await cache.getHistory(10);
      expect(history[0].topic).toBe('Second');
      expect(history[1].topic).toBe('First');
    });

    it('limits history results', async () => {
      for (let i = 0; i < 5; i++) {
        await cache.addHistory({ topic: `Topic${i}`, language: 'English', timestamp: i });
      }
      const history = await cache.getHistory(3);
      expect(history).toHaveLength(3);
    });
  });

  describe('stats', () => {
    it('gets cache stats', async () => {
      await cache.putDefinition({
        topic: 'Test',
        language: 'English',
        provider: 'gemini',
        model: 'flash',
        content: 'x',
        asciiArt: '',
        metadata: { keyFacts: [], relatedTopics: [] },
      });
      const stats = await cache.getStats();
      expect(stats.definitionCount).toBe(1);
      expect(stats.historyCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('clears all data', async () => {
      await cache.putDefinition({
        topic: 'Test',
        language: 'English',
        provider: 'gemini',
        model: 'flash',
        content: 'x',
        asciiArt: '',
        metadata: { keyFacts: [], relatedTopics: [] },
      });
      await cache.addHistory({ topic: 'Test', language: 'English', timestamp: Date.now() });

      await cache.clear();

      const stats = await cache.getStats();
      expect(stats.definitionCount).toBe(0);
      expect(stats.historyCount).toBe(0);
    });
  });
});
