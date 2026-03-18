import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '@/services/providers/ollama';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
    vi.restoreAllMocks();
  });

  it('has correct metadata', () => {
    expect(provider.id).toBe('ollama');
    expect(provider.name).toBe('Ollama (Local)');
    expect(provider.requiresKey).toBe(false);
    expect(provider.defaultModel).toBe('llama3.2');
    expect(provider.availableModels).toContain('llama3.2');
    expect(provider.availableModels).toContain('mistral');
    expect(provider.availableModels).toContain('gemma2');
  });

  it('streams definition with NDJSON format', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"model":"llama3.2","response":"Hello "}\n'));
        controller.enqueue(new TextEncoder().encode('{"model":"llama3.2","response":"World"}\n'));
        controller.enqueue(new TextEncoder().encode('{"model":"llama3.2","response":"","done":true}\n'));
        controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const chunks: string[] = [];
    const controller = new AbortController();
    for await (const chunk of provider.streamDefinition('test', 'English', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Hello ', 'World']);
  });

  it('uses /api/generate endpoint for definitions', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"response":"ok","done":true}\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of provider.streamDefinition('test', 'English', controller.signal)) {
      chunks.push(chunk);
    }

    expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:11434/api/generate');
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.model).toBe('llama3.2');
    expect(body.stream).toBe(true);
  });

  it('streams definition with language instruction', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"response":"Bonjour"}\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of provider.streamDefinition('test', 'French', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Bonjour']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.prompt).toContain('French');
  });

  it('generates ascii art with non-streaming request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        response: '{"art": "┌──┐\\n│hi│\\n└──┘"}',
      }))
    );

    const controller = new AbortController();
    const result = await provider.generateAsciiArt('test', controller.signal);
    expect(result.art).toContain('┌──┐');

    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body);
    expect(body.stream).toBe(false);
    expect(body.format).toBe('json');
  });

  it('gets metadata', async () => {
    const metadata = {
      keyFacts: ['Fact 1', 'Fact 2'],
      relatedTopics: ['Topic A', 'Topic B'],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        response: JSON.stringify(metadata),
      }))
    );

    const result = await provider.getMetadata('test', 'English');
    expect(result.keyFacts).toEqual(['Fact 1', 'Fact 2']);
    expect(result.relatedTopics).toEqual(['Topic A', 'Topic B']);
  });

  it('returns empty metadata on error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await provider.getMetadata('test', 'English');
    expect(result).toEqual({ keyFacts: [], relatedTopics: [] });
  });

  it('streams chat using /api/chat endpoint', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"message":{"role":"assistant","content":"Hi "}}\n'));
        controller.enqueue(new TextEncoder().encode('{"message":{"role":"assistant","content":"there"}}\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const chunks: string[] = [];
    const controller = new AbortController();
    for await (const chunk of provider.streamChat([], 'hello', 'Science', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Hi ', 'there']);
    expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:11434/api/chat');
  });

  it('sends correct chat message format', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"message":{"role":"assistant","content":"ok"}}\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const controller = new AbortController();
    const history = [
      { role: 'user' as const, text: 'What is AI?' },
      { role: 'model' as const, text: 'AI is...' },
    ];
    const chunks: string[] = [];
    for await (const chunk of provider.streamChat(history, 'Tell me more', 'AI', controller.signal)) {
      chunks.push(chunk);
    }

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'What is AI?' });
    expect(body.messages[2]).toEqual({ role: 'assistant', content: 'AI is...' });
    expect(body.messages[3]).toEqual({ role: 'user', content: 'Tell me more' });
  });

  it('validates key always returns true', async () => {
    const result = await provider.validateKey('any-key');
    expect(result).toBe(true);
  });

  it('validates key returns true even with empty key', async () => {
    const result = await provider.validateKey('');
    expect(result).toBe(true);
  });

  it('throws on non-ok response during streaming', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));

    const controller = new AbortController();
    await expect(async () => {
      for await (const _ of provider.streamDefinition('test', 'English', controller.signal)) {
        // consume
      }
    }).rejects.toThrow('Ollama API error: 500');
  });

  it('returns early when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const chunks: string[] = [];
    for await (const chunk of provider.streamDefinition('test', 'English', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual([]);
  });

  it('accepts custom base URL', () => {
    const customProvider = new OllamaProvider(undefined, 'http://custom:1234');
    expect(customProvider.id).toBe('ollama');
  });
});
