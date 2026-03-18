import { useEffect, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { decryptKey } from '../lib/encryption';
import { setActiveProvider } from '../services/ai';
import { GeminiProvider } from '../services/providers/gemini';
import { OpenAIProvider } from '../services/providers/openai';
import { ClaudeProvider } from '../services/providers/claude';
import { OllamaProvider } from '../services/providers/ollama';
import { OpenRouterProvider } from '../services/providers/openrouter';
import type { AIProvider } from '../services/providers/types';

const DEVICE_PASSPHRASE = 'wiki-bite-local-encryption-key';

function createProvider(providerId: string, apiKey: string): AIProvider {
  switch (providerId) {
    case 'gemini':
      return new GeminiProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'claude':
      return new ClaudeProvider(apiKey);
    case 'ollama':
      return new OllamaProvider();
    case 'openrouter':
      return new OpenRouterProvider(apiKey);
    default:
      return new GeminiProvider(apiKey);
  }
}

/**
 * Syncs the ConfigContext state to the ai.ts bridge module.
 * Decrypts the API key and creates the correct provider instance.
 * Call this once in the root layout.
 */
export function useProviderSync(): void {
  const { config } = useConfig();
  const lastConfigRef = useRef('');

  useEffect(() => {
    const configKey = `${config.providerId}:${config.encryptedApiKey}`;
    if (configKey === lastConfigRef.current) return;
    lastConfigRef.current = configKey;

    if (!config.isConfigured) return;

    if (config.providerId === 'ollama') {
      setActiveProvider(createProvider('ollama', ''));
      return;
    }

    if (!config.encryptedApiKey) return;

    decryptKey(config.encryptedApiKey, DEVICE_PASSPHRASE)
      .then((rawKey) => {
        const provider = createProvider(config.providerId, rawKey);
        setActiveProvider(provider);
      })
      .catch((err) => {
        console.error('Failed to decrypt API key:', err);
      });
  }, [config.providerId, config.encryptedApiKey, config.isConfigured]);
}
