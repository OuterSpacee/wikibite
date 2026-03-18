import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeProvider } from '@/services/providers/claude';

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider('test-key');
    vi.restoreAllMocks();
  });

  it('has correct metadata', () => {
    expect(provider.id).toBe('claude');
    expect(provider.name).toBe('Anthropic Claude');
    expect(provider.requiresKey).toBe(true);
    expect(provider.defaultModel).toBe('claude-sonnet-4-6');
    expect(provider.availableModels).toContain('claude-sonnet-4-6');
    expect(provider.availableModels).toContain('claude-haiku-4-5');
  });

  it('streams definition with Claude SSE format', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello "}}\n\n'));
        controller.enqueue(new TextEncoder().encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"World"}}\n\n'));
        controller.enqueue(new TextEncoder().encode('event: message_stop\ndata: {"type":"message_stop"}\n\n'));
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

  it('sends correct headers including anthropic-version', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: message_stop\ndata: {"type":"message_stop"}\n\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of provider.streamDefinition('test', 'English', controller.signal)) {
      chunks.push(chunk);
    }

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
  });

  it('streams definition with language instruction', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"text":"Hola"}}\n\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of provider.streamDefinition('test', 'Spanish', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Hola']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.messages[0].content).toContain('Spanish');
    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(1024);
  });

  it('generates ascii art', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        content: [{ text: '{"art": "┌──┐\\n│hi│\\n└──┘"}' }],
      }))
    );

    const controller = new AbortController();
    const result = await provider.generateAsciiArt('test', controller.signal);
    expect(result.art).toContain('┌──┐');
  });

  it('gets metadata', async () => {
    const metadata = {
      keyFacts: ['Fact 1', 'Fact 2'],
      relatedTopics: ['Topic A', 'Topic B'],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        content: [{ text: JSON.stringify(metadata) }],
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

  it('streams chat with system message', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"text":"Hi there"}}\n\n'));
        controller.close();
      },
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockStream));

    const controller = new AbortController();
    const chunks: string[] = [];
    for await (const chunk of provider.streamChat([], 'hello', 'Science', controller.signal)) {
      chunks.push(chunk);
    }
    expect(chunks).toEqual(['Hi there']);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.system).toContain('Science');
    expect(body.messages[0]).toEqual({ role: 'user', content: 'hello' });
  });

  it('converts model role to assistant in chat history', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","delta":{"text":"ok"}}\n\n'));
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
    expect(body.messages[0]).toEqual({ role: 'user', content: 'What is AI?' });
    expect(body.messages[1]).toEqual({ role: 'assistant', content: 'AI is...' });
    expect(body.messages[2]).toEqual({ role: 'user', content: 'Tell me more' });
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
    }).rejects.toThrow('Claude API error: 500');
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
