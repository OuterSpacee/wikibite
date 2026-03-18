import type { AIProvider, WikiMetadata, ChatMessage, AsciiArtData } from './types';

export class ClaudeProvider implements AIProvider {
  readonly id = 'claude';
  readonly name = 'Anthropic Claude';
  readonly description = 'Anthropic Claude AI models';
  readonly requiresKey = true;
  readonly defaultModel = 'claude-sonnet-4-6';
  readonly availableModels = ['claude-sonnet-4-6', 'claude-haiku-4-5'];

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders(key?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': key ?? this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  private async *parseSSEStream(
    response: Response,
    signal: AbortSignal
  ): AsyncGenerator<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (signal.aborted) return;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (signal.aborted) return;
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *streamDefinition(
    topic: string,
    lang: string,
    signal: AbortSignal,
    model?: string
  ): AsyncGenerator<string> {
    if (signal.aborted) return;

    const languageInstruction = lang !== 'English' ? ` Respond in ${lang}.` : '';
    const prompt = `Provide a concise, single-paragraph encyclopedia-style definition for the term: "${topic}".${languageInstruction} Be informative and neutral. Do not use markdown, titles, or any special formatting. Respond with only the text of the definition itself.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      signal,
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    yield* this.parseSSEStream(response, signal);
  }

  async generateAsciiArt(topic: string, signal: AbortSignal): Promise<AsciiArtData> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    const prompt = `For "${topic}", create a JSON object with one key: "art".
1. "art": meta ASCII visualization of the word "${topic}":
  - Palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|
  - Shape mirrors concept - make the visual form embody the word's essence
  - Return as single string with \\n for line breaks

Return ONLY the raw JSON object, no additional text. The response must start with "{" and end with "}" and contain only the art property.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      signal,
      body: JSON.stringify({
        model: this.defaultModel,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let jsonStr = (data.content?.[0]?.text ?? '').trim();

    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as AsciiArtData;
    return { art: parsed.art };
  }

  async getMetadata(topic: string, lang: string): Promise<WikiMetadata> {
    const languageInstruction = lang !== 'English' ? ` Respond in ${lang}.` : '';
    const prompt = `For the topic "${topic}", provide:
  1. "keyFacts": A list of 3-5 interesting, brief facts.
  2. "relatedTopics": A list of 3-5 related concepts or terms that would make good wiki links.
  ${languageInstruction}
  Return ONLY the raw JSON object.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const text = (data.content?.[0]?.text ?? '').trim();
      const jsonStr = text.replace(/^```json\s*|\s*```$/g, '');
      return JSON.parse(jsonStr) as WikiMetadata;
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return { keyFacts: [], relatedTopics: [] };
    }
  }

  async *streamChat(
    history: ChatMessage[],
    newMessage: string,
    currentTopic: string,
    signal: AbortSignal
  ): AsyncGenerator<string> {
    if (signal.aborted) return;

    const systemMessage = `You are the "Infinite Wiki" assistant.
  The user is currently reading about "${currentTopic}".
  Answer their questions concisely and helpfully.
  If they ask about a new topic, suggest they search for it.
  Keep a helpful, neutral, encyclopedia-like tone, but be conversational.`;

    const messages = [
      ...history.map(msg => ({
        role: (msg.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.text,
      })),
      { role: 'user' as const, content: newMessage },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.getHeaders(),
      signal,
      body: JSON.stringify({
        model: this.defaultModel,
        max_tokens: 1024,
        system: systemMessage,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    yield* this.parseSSEStream(response, signal);
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: this.getHeaders(key),
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
