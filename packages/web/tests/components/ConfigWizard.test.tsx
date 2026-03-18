import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ConfigProvider, useConfig } from '@/contexts/ConfigContext';
import ConfigWizard from '@/components/ConfigWizard';

// Mock all provider modules so we don't pull in real SDK dependencies
vi.mock('@/services/providers/gemini', () => ({
  GeminiProvider: class {
    id = 'gemini';
    name = 'Google Gemini';
    description = 'Google Gemini AI models';
    requiresKey = true;
    defaultModel = 'gemini-2.5-flash-lite';
    availableModels = ['gemini-2.5-flash'];
    async validateKey(key: string) {
      return key === 'valid-gemini-key';
    }
  },
}));

vi.mock('@/services/providers/openai', () => ({
  OpenAIProvider: class {
    id = 'openai';
    name = 'OpenAI';
    description = 'OpenAI GPT models';
    requiresKey = true;
    defaultModel = 'gpt-4o-mini';
    availableModels = ['gpt-4o-mini'];
    async validateKey(key: string) {
      return key === 'valid-openai-key';
    }
  },
}));

vi.mock('@/services/providers/claude', () => ({
  ClaudeProvider: class {
    id = 'claude';
    name = 'Anthropic Claude';
    description = 'Anthropic Claude AI models';
    requiresKey = true;
    defaultModel = 'claude-sonnet-4-6';
    availableModels = ['claude-sonnet-4-6'];
    async validateKey(key: string) {
      return key === 'valid-claude-key';
    }
  },
}));

vi.mock('@/services/providers/ollama', () => ({
  OllamaProvider: class {
    id = 'ollama';
    name = 'Ollama (Local)';
    description = 'Local Ollama models';
    requiresKey = false;
    defaultModel = 'llama3.2';
    availableModels = ['llama3.2'];
    async validateKey() {
      return true;
    }
  },
}));

vi.mock('@/services/providers/openrouter', () => ({
  OpenRouterProvider: class {
    id = 'openrouter';
    name = 'OpenRouter';
    description = 'OpenRouter multi-model gateway';
    requiresKey = true;
    defaultModel = 'meta-llama/llama-3.1-8b-instruct:free';
    availableModels = ['meta-llama/llama-3.1-8b-instruct:free'];
    async validateKey(key: string) {
      return key === 'valid-openrouter-key';
    }
  },
}));

// Helper to read final config state after wizard completes
function ConfigReader({ onConfig }: { onConfig: (cfg: ReturnType<typeof useConfig>) => void }) {
  const ctx = useConfig();
  React.useEffect(() => {
    onConfig(ctx);
  });
  return null;
}

function renderWizard(onConfig?: (cfg: ReturnType<typeof useConfig>) => void) {
  return render(
    <ConfigProvider>
      <ConfigWizard />
      {onConfig && <ConfigReader onConfig={onConfig} />}
    </ConfigProvider>,
  );
}

describe('ConfigWizard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders when not configured', () => {
    renderWizard();
    expect(screen.getByTestId('config-wizard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Wiki Bite')).toBeInTheDocument();
  });

  it('does not render when already configured', () => {
    localStorage.setItem(
      'wiki-bite-config',
      JSON.stringify({
        providerId: 'gemini',
        model: '',
        encryptedApiKey: '',
        language: 'en',
        theme: 'system',
        isConfigured: true,
      }),
    );
    renderWizard();
    expect(screen.queryByTestId('config-wizard')).not.toBeInTheDocument();
  });

  it('progresses from Welcome to Provider step', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByText('Choose Your AI Provider')).toBeInTheDocument();
  });

  it('shows all provider cards with expected details', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));

    expect(screen.getByTestId('provider-card-ollama')).toBeInTheDocument();
    expect(screen.getByTestId('provider-card-gemini')).toBeInTheDocument();
    expect(screen.getByTestId('provider-card-openai')).toBeInTheDocument();
    expect(screen.getByTestId('provider-card-claude')).toBeInTheDocument();
    expect(screen.getByTestId('provider-card-openrouter')).toBeInTheDocument();
  });

  it('shows "Recommended" badge on Ollama', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    const ollamaCard = screen.getByTestId('provider-card-ollama');
    expect(ollamaCard).toHaveTextContent('Recommended');
  });

  it('cannot proceed from provider step without selecting a provider', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next')); // go to provider step
    const nextBtn = screen.getByTestId('wizard-next');
    expect(nextBtn).toBeDisabled();
  });

  it('skips API key step when Ollama is selected', () => {
    renderWizard();
    // Welcome -> Provider
    fireEvent.click(screen.getByTestId('wizard-next'));
    // Select Ollama
    fireEvent.click(screen.getByTestId('provider-card-ollama'));
    // Provider -> should skip apikey -> Preferences
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });

  it('shows API key step when a key-requiring provider is selected', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next')); // Welcome -> Provider
    fireEvent.click(screen.getByTestId('provider-card-gemini'));
    fireEvent.click(screen.getByTestId('wizard-next')); // Provider -> API Key
    expect(screen.getByText('Enter API Key')).toBeInTheDocument();
  });

  it('validates API key and shows success indicator', async () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('provider-card-gemini'));
    fireEvent.click(screen.getByTestId('wizard-next'));

    const input = screen.getByTestId('api-key-input');
    fireEvent.change(input, { target: { value: 'valid-gemini-key' } });
    fireEvent.click(screen.getByTestId('validate-key-button'));

    await waitFor(() => {
      expect(screen.getByTestId('key-valid')).toBeInTheDocument();
    });
  });

  it('validates API key and shows error on invalid key', async () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('provider-card-gemini'));
    fireEvent.click(screen.getByTestId('wizard-next'));

    const input = screen.getByTestId('api-key-input');
    fireEvent.change(input, { target: { value: 'bad-key' } });
    fireEvent.click(screen.getByTestId('validate-key-button'));

    await waitFor(() => {
      expect(screen.getByTestId('key-invalid')).toBeInTheDocument();
    });
  });

  it('cannot proceed past API key step without valid key', async () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('provider-card-gemini'));
    fireEvent.click(screen.getByTestId('wizard-next'));

    // Next should be disabled before validation
    const nextBtn = screen.getByTestId('wizard-next');
    expect(nextBtn).toBeDisabled();
  });

  it('can navigate back from provider step', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByText('Choose Your AI Provider')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-back'));
    expect(screen.getByText('Welcome to Wiki Bite')).toBeInTheDocument();
  });

  it('completes full wizard flow with Ollama (no key) and sets isConfigured', async () => {
    let latestConfig: ReturnType<typeof useConfig> | null = null;
    renderWizard((cfg) => {
      latestConfig = cfg;
    });

    // Welcome -> Provider
    fireEvent.click(screen.getByTestId('wizard-next'));
    // Select Ollama
    fireEvent.click(screen.getByTestId('provider-card-ollama'));
    // Provider -> Preferences (skip key)
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByText('Preferences')).toBeInTheDocument();

    // Set language
    fireEvent.change(screen.getByTestId('language-select'), { target: { value: 'ar' } });
    // Set theme
    fireEvent.change(screen.getByTestId('theme-select'), { target: { value: 'dark' } });

    // Preferences -> Done
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByText("You're All Set!")).toBeInTheDocument();

    // Click finish
    fireEvent.click(screen.getByTestId('wizard-finish'));

    await waitFor(() => {
      expect(latestConfig!.isConfigured).toBe(true);
      expect(latestConfig!.config.providerId).toBe('ollama');
      expect(latestConfig!.config.language).toBe('ar');
      expect(latestConfig!.config.theme).toBe('dark');
    });
  });

  it('completes full wizard flow with key-requiring provider', async () => {
    let latestConfig: ReturnType<typeof useConfig> | null = null;
    renderWizard((cfg) => {
      latestConfig = cfg;
    });

    // Welcome -> Provider
    fireEvent.click(screen.getByTestId('wizard-next'));
    // Select OpenAI
    fireEvent.click(screen.getByTestId('provider-card-openai'));
    // Provider -> API Key
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByText('Enter API Key')).toBeInTheDocument();

    // Enter and validate key
    fireEvent.change(screen.getByTestId('api-key-input'), {
      target: { value: 'valid-openai-key' },
    });
    fireEvent.click(screen.getByTestId('validate-key-button'));

    await waitFor(() => {
      expect(screen.getByTestId('key-valid')).toBeInTheDocument();
    });

    // API Key -> Preferences
    fireEvent.click(screen.getByTestId('wizard-next'));
    expect(screen.getByText('Preferences')).toBeInTheDocument();

    // Preferences -> Done
    fireEvent.click(screen.getByTestId('wizard-next'));

    // Finish
    fireEvent.click(screen.getByTestId('wizard-finish'));

    await waitFor(() => {
      expect(latestConfig!.isConfigured).toBe(true);
      expect(latestConfig!.config.providerId).toBe('openai');
      expect(latestConfig!.config.encryptedApiKey).toBeTruthy();
    });
  });

  it('navigates back from preferences to provider (skipping key) for Ollama', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('provider-card-ollama'));
    fireEvent.click(screen.getByTestId('wizard-next')); // -> preferences (skipped key)
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wizard-back')); // -> provider (skipped key)
    expect(screen.getByText('Choose Your AI Provider')).toBeInTheDocument();
  });

  it('shows preferences with language and theme selectors', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('provider-card-ollama'));
    fireEvent.click(screen.getByTestId('wizard-next'));

    expect(screen.getByTestId('language-select')).toBeInTheDocument();
    expect(screen.getByTestId('theme-select')).toBeInTheDocument();
  });
});
