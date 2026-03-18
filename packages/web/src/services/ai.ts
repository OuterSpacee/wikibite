/**
 * Bridge module — wraps the provider system as standalone functions.
 * Uses setActiveProvider() to receive the configured provider from React.
 */

import type { AIProvider } from './providers/types';
import { GeminiProvider } from './providers/gemini';

export type { WikiMetadata, AsciiArtData, ChatMessage } from './providers/types';

let activeProvider: AIProvider | null = null;

/**
 * Set the active provider instance. Called by useProviderSync() in root layout
 * whenever the config changes.
 */
export function setActiveProvider(provider: AIProvider): void {
  activeProvider = provider;
}

function getProvider(): AIProvider {
  if (activeProvider) return activeProvider;
  // Fallback for dev: use env var if no provider configured yet
  const key = import.meta.env.VITE_GEMINI_API_KEY ?? import.meta.env.VITE_AI_KEY ?? '';
  if (key) return new GeminiProvider(key);
  throw new Error('API key is missing. Please provide a valid API key.');
}

export async function* streamDefinition(
  topic: string,
  language: string = 'English',
): AsyncGenerator<string, void, undefined> {
  const provider = getProvider();
  const controller = new AbortController();
  try {
    yield* provider.streamDefinition(topic, language, controller.signal);
  } catch (error) {
    console.error('Error streaming definition:', error);
    const msg = error instanceof Error ? error.message : 'An unknown error occurred.';
    yield `Error: Could not generate content for "${topic}". ${msg}`;
  }
}

export async function generateAsciiArt(topic: string): Promise<import('./providers/types').AsciiArtData> {
  const provider = getProvider();
  const controller = new AbortController();
  return provider.generateAsciiArt(topic, controller.signal);
}

export async function getWikiMetadata(
  topic: string,
  language: string = 'English',
): Promise<import('./providers/types').WikiMetadata> {
  const provider = getProvider();
  return provider.getMetadata(topic, language);
}

export async function* streamChatResponse(
  history: import('./providers/types').ChatMessage[],
  newMessage: string,
  currentTopic: string,
): AsyncGenerator<string, void, undefined> {
  const provider = getProvider();
  const controller = new AbortController();
  try {
    yield* provider.streamChat(history, newMessage, currentTopic, controller.signal);
  } catch (error) {
    console.error('Error streaming chat:', error);
    yield 'Error: Could not generate response.';
  }
}
