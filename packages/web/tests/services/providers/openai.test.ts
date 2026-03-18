import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '@/services/providers/openai';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider('test-key');
    vi.restoreAllMocks();
  });

  it('has correct metadata', () => {
    expect(provider.id).toBe('openai');
    expect(provider.name).toBe('OpenAI');
    expect(provider.requiresKey).toBe(true);
    expect(provider.defaultModel).toBe('gpt-4o-mini');
    expect(provider.availableModels).toContain('gpt-4o');
    expect(provider.availableModels).toContain('gpt-4o-mini');
  });

  it('streams definition', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"World"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
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

  it('streams definition with language instruction', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Bonjour"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const chunks: string[] = [];
    const controller = new AbortController();
    for await (const chunk of provider.streamDefinition('test', 'French', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Bonjour']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.messages[0].content).toContain('French');
  });

  it('generates ascii art using JSON mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: '{"art": "┌──┐\\n│hi│\\n└──┘"}' } }],
      }))
    );

    const controller = new AbortController();
    const result = await provider.generateAsciiArt('test', controller.signal);
    expect(result.art).toContain('┌──┐');

    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('gets metadata', async () => {
    const metadata = {
      keyFacts: ['Fact 1', 'Fact 2'],
      relatedTopics: ['Topic A', 'Topic B'],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(metadata) } }],
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

  it('streams chat', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hi "}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"there"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const chunks: string[] = [];
    const controller = new AbortController();
    for await (const chunk of provider.streamChat([], 'hello', 'Science', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Hi ', 'there']);
  });

  it('sends correct chat history format', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
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

  it('validates key successfully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const result = await provider.validateKey('valid-key');
    expect(result).toBe(true);
  });

  it('validates key returns false on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const result = await provider.validateKey('bad-key');
    expect(result).toBe(false);
  });

  it('validates key returns false on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await provider.validateKey('any-key');
    expect(result).toBe(false);
  });

  it('throws on non-ok response during streaming', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));

    const controller = new AbortController();
    await expect(async () => {
      for await (const _ of provider.streamDefinition('test', 'English', controller.signal)) {
        // consume
      }
    }).rejects.toThrow('OpenAI API error: 500');
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
});
