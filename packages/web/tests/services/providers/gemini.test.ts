import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '@/services/providers/gemini';

vi.mock('@google/genai', () => {
  const mockModels = {
    generateContentStream: vi.fn().mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { text: 'Hello ' };
        yield { text: 'World' };
      },
    }),
    generateContent: vi.fn().mockResolvedValue({
      text: '{"art": "┌──┐\\n│hi│\\n└──┘"}',
    }),
  };

  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = mockModels;
      constructor() {}
    },
  };
});

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider('test-api-key');
  });

  it('has correct metadata', () => {
    expect(provider.id).toBe('gemini');
    expect(provider.name).toBe('Google Gemini');
    expect(provider.requiresKey).toBe(true);
    expect(provider.availableModels.length).toBeGreaterThan(0);
  });

  it('streams definition chunks', async () => {
    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of provider.streamDefinition('test', 'English', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Hello ', 'World']);
  });

  it('generates ascii art', async () => {
    const controller = new AbortController();
    const art = await provider.generateAsciiArt('test', controller.signal);
    expect(art.art).toContain('┌──┐');
  });

  it('validates key returns boolean', async () => {
    const result = await provider.validateKey('test-key');
    expect(typeof result).toBe('boolean');
  });
});
