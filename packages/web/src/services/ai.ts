/**
 * Bridge module — wraps the provider system as standalone functions.
 * Uses setActiveProvider() to receive the configured provider from React.
 */

import type { AIProvider } from './providers/types';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';
import { OllamaProvider } from './providers/ollama';
import { OpenRouterProvider } from './providers/openrouter';

export type { WikiMetadata, AsciiArtData, ChatMessage } from './providers/types';

let activeProvider: AIProvider | null = null;

/**
 * Set the active provider instance. Called by useProviderSync() in root layout
 * whenever the config changes.
 */
export function setActiveProvider(provider: AIProvider): void {
  activeProvider = provider;
}

function createProviderById(providerId: string, apiKey: string): AIProvider {
  switch (providerId) {
    case 'openai': return new OpenAIProvider(apiKey);
    case 'claude': return new ClaudeProvider(apiKey);
    case 'ollama': return new OllamaProvider();
    case 'openrouter': return new OpenRouterProvider(apiKey);
    case 'gemini':
    default:
      return new GeminiProvider(apiKey);
  }
}

function getProvider(): AIProvider {
  if (activeProvider) return activeProvider;

  // Synchronous fallback: read from sessionStorage + localStorage
  // This handles the window before useProviderSync finishes async decryption
  try {
    const rawKey = sessionStorage.getItem('wiki-bite-raw-key') ?? '';
    const configStr = localStorage.getItem('wiki-bite-config');
    if (configStr && rawKey) {
      const config = JSON.parse(configStr);
      if (config.isConfigured && config.providerId) {
        const provider = createProviderById(config.providerId, rawKey);
        activeProvider = provider;
        return provider;
      }
    }
  } catch {
    // ignore parse errors
  }

  // Last resort: env var fallback for local dev
  const key = import.meta.env.VITE_GEMINI_API_KEY ?? import.meta.env.VITE_AI_KEY ?? '';
  if (key) return new GeminiProvider(key);
  throw new Error('API key is missing. Please configure a provider in Settings.');
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
