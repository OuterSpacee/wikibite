import type { AIProvider, WikiMetadata, ChatMessage, AsciiArtData } from './types';

export class OllamaProvider implements AIProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  readonly description = 'Local Ollama models';
  readonly requiresKey = false;
  readonly defaultModel = 'llama3.2';
  readonly availableModels = ['llama3.2', 'mistral', 'gemma2'];

  private baseUrl: string;

  constructor(_apiKey?: string, baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  private async *parseNDJSONStream(
    response: Response,
    signal: AbortSignal,
    field: 'response' | 'message'
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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            if (field === 'response' && parsed.response) {
              yield parsed.response;
            } else if (field === 'message' && parsed.message?.content) {
              yield parsed.message.content;
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

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        prompt,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    yield* this.parseNDJSONStream(response, signal, 'response');
  }

  async generateAsciiArt(topic: string, signal: AbortSignal): Promise<AsciiArtData> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    const prompt = `For "${topic}", create a JSON object with one key: "art".
1. "art": meta ASCII visualization of the word "${topic}":
  - Palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|
  - Shape mirrors concept - make the visual form embody the word's essence
  - Return as single string with \\n for line breaks

Return ONLY the raw JSON object, no additional text. The response must start with "{" and end with "}" and contain only the art property.`;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: this.defaultModel,
        prompt,
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    let jsonStr = (data.response ?? '').trim();

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
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt,
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      const text = (data.response ?? '').trim();
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

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model: this.defaultModel,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    yield* this.parseNDJSONStream(response, signal, 'message');
  }

  async validateKey(_key: string): Promise<boolean> {
    return true;
  }
}
