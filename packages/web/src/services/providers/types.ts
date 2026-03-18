export interface WikiMetadata {
  keyFacts: string[];
  relatedTopics: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AsciiArtData {
  art: string;
  text?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  requiresKey: boolean;
  defaultModel: string;
  availableModels: string[];

  streamDefinition(
    topic: string,
    lang: string,
    signal: AbortSignal,
    model?: string
  ): AsyncGenerator<string>;

  generateAsciiArt(
    topic: string,
    signal: AbortSignal
  ): Promise<AsciiArtData>;

  getMetadata(
    topic: string,
    lang: string
  ): Promise<WikiMetadata>;

  streamChat(
    history: ChatMessage[],
    newMessage: string,
    currentTopic: string,
    signal: AbortSignal
  ): AsyncGenerator<string>;

  validateKey(key: string): Promise<boolean>;
}

export interface ProviderConfig {
  providerId: string;
  apiKey?: string;
  model?: string;
}
