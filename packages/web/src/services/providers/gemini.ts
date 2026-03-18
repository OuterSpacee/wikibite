import { GoogleGenAI } from '@google/genai';
import type { AIProvider, WikiMetadata, ChatMessage, AsciiArtData } from './types';

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  readonly description = 'Google Gemini AI models';
  readonly requiresKey = true;
  readonly defaultModel = 'gemini-2.5-flash-lite';
  readonly availableModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

  private ai: InstanceType<typeof GoogleGenAI>;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
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

    const response = await this.ai.models.generateContentStream({
      model: model ?? this.defaultModel,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of response) {
      if (signal.aborted) return;
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  async generateAsciiArt(topic: string, signal: AbortSignal): Promise<AsciiArtData> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

    const prompt = `For "${topic}", create a JSON object with one key: "art".
1. "art": meta ASCII visualization of the word "${topic}":
  - Palette: │─┌┐└┘├┤┬┴┼►◄▲▼○●◐◑░▒▓█▀▄■□▪▫★☆♦♠♣♥⟨⟩/\\_|
  - Shape mirrors concept - make the visual form embody the word's essence
  - Examples:
    * "explosion" → radiating lines from center
    * "hierarchy" → pyramid structure
    * "flow" → curved directional lines
  - Return as single string with \\n for line breaks

Return ONLY the raw JSON object, no additional text. The response must start with "{" and end with "}" and contain only the art property.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    let jsonStr = (response.text ?? '').trim();

    // Remove any markdown code fences if present
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    const parsedData = JSON.parse(jsonStr) as AsciiArtData;
    return { art: parsedData.art };
  }

  async getMetadata(topic: string, lang: string): Promise<WikiMetadata> {
    const languageInstruction = lang !== 'English' ? ` Respond in ${lang}.` : '';
    const prompt = `For the topic "${topic}", provide:
  1. "keyFacts": A list of 3-5 interesting, brief facts.
  2. "relatedTopics": A list of 3-5 related concepts or terms that would make good wiki links.
  ${languageInstruction}
  Return ONLY the raw JSON object.`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.defaultModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const text = (response.text ?? '').trim();
      // Clean up potential markdown fences
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

    const systemInstruction = `You are the "Infinite Wiki" assistant.
  The user is currently reading about "${currentTopic}".
  Answer their questions concisely and helpfully.
  If they ask about a new topic, suggest they search for it.
  Keep a helpful, neutral, encyclopedia-like tone, but be conversational.`;

    // Convert history to Gemini format
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    // Add new message
    contents.push({
      role: 'user' as const,
      parts: [{ text: newMessage }],
    });

    const response = await this.ai.models.generateContentStream({
      model: this.defaultModel,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of response) {
      if (signal.aborted) return;
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const testAi = new GoogleGenAI({ apiKey: key });
      await testAi.models.generateContent({
        model: this.defaultModel,
        contents: 'Hello',
        config: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
