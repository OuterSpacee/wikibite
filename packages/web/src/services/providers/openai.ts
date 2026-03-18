import type { AIProvider, WikiMetadata, ChatMessage, AsciiArtData } from './types';

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  readonly description = 'OpenAI GPT models';
  readonly requiresKey = true;
  readonly defaultModel = 'gpt-4o-mini';
  readonly availableModels = ['gpt-4o', 'gpt-4o-mini'];

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
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
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.headers,
      signal,
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
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

Return ONLY the raw JSON object, no additional text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.headers,
      signal,
      body: JSON.stringify({
        model: this.defaultModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let jsonStr = (data.choices?.[0]?.message?.content ?? '').trim();

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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const text = (data.choices?.[0]?.message?.content ?? '').trim();
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
      { role: 'system' as const, content: systemMessage },
      ...history.map(msg => ({
        role: (msg.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.text,
      })),
      { role: 'user' as const, content: newMessage },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.headers,
      signal,
      body: JSON.stringify({
        model: this.defaultModel,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    yield* this.parseSSEStream(response, signal);
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
