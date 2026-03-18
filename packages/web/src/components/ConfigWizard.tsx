import React, { useState, useCallback, useEffect } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import type { AIProvider } from '@/services/providers/types';
import { ProviderRegistry } from '@/services/providerRegistry';
import { GeminiProvider } from '@/services/providers/gemini';
import { OpenAIProvider } from '@/services/providers/openai';
import { ClaudeProvider } from '@/services/providers/claude';
import { OllamaProvider } from '@/services/providers/ollama';
import { OpenRouterProvider, type OpenRouterModel } from '@/services/providers/openrouter';

type WizardStep = 'welcome' | 'provider' | 'apikey' | 'modelselect' | 'preferences' | 'done';

const STEPS: WizardStep[] = ['welcome', 'provider', 'apikey', 'modelselect', 'preferences', 'done'];

interface ProviderCardInfo {
  id: string;
  name: string;
  description: string;
  freeTier: string;
  recommended: boolean;
  requiresKey: boolean;
}

const PROVIDER_CARDS: ProviderCardInfo[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ AI models through one API key',
    freeTier: 'Many free models available — get a key at openrouter.ai',
    recommended: true,
    requiresKey: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Gemini AI models',
    freeTier: 'Free tier available with generous limits',
    recommended: false,
    requiresKey: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run AI models locally on your machine',
    freeTier: 'Completely free — runs on your hardware',
    recommended: false,
    requiresKey: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT models',
    freeTier: 'Pay-as-you-go pricing',
    recommended: false,
    requiresKey: true,
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'Anthropic Claude AI models',
    freeTier: 'Pay-as-you-go pricing',
    recommended: false,
    requiresKey: true,
  },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
];

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function createRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new OllamaProvider());
  registry.register(new GeminiProvider(''));
  registry.register(new OpenAIProvider(''));
  registry.register(new ClaudeProvider(''));
  registry.register(new OpenRouterProvider(''));
  return registry;
}

const DEVICE_PASSPHRASE = 'wiki-bite-local-encryption-key';

const ConfigWizard: React.FC = () => {
  const { isConfigured, setProvider, setApiKey, setLanguage, setTheme, markConfigured } = useConfig();

  const [step, setStep] = useState<WizardStep>('welcome');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('openrouter');
  const [apiKey, setApiKeyValue] = useState('');
  const [keyValid, setKeyValid] = useState<boolean | null>(null);
  const [keyValidating, setKeyValidating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedTheme, setSelectedTheme] = useState('system');

  // Model selection state (OpenRouter only)
  const [modelTier, setModelTier] = useState<'free' | 'paid'>('free');
  const [freeModels, setFreeModels] = useState<OpenRouterModel[]>([]);
  const [paidModels, setPaidModels] = useState<OpenRouterModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');

  const [registry] = useState(() => createRegistry());

  const currentStepIndex = STEPS.indexOf(step);
  const selectedCard = PROVIDER_CARDS.find((c) => c.id === selectedProviderId);

  const isOpenRouter = selectedProviderId === 'openrouter';

  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      const nextStep = STEPS[idx + 1];
      // Skip apikey + modelselect for providers that don't need a key
      if (nextStep === 'apikey' && selectedCard && !selectedCard.requiresKey) {
        setStep('preferences');
      // Skip modelselect for non-OpenRouter providers
      } else if (nextStep === 'modelselect' && !isOpenRouter) {
        setStep('preferences');
      } else {
        setStep(nextStep);
      }
    }
  }, [step, selectedCard, isOpenRouter]);

  const goBack = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      const prevStep = STEPS[idx - 1];
      // Skip modelselect + apikey for providers that don't need key
      if (prevStep === 'modelselect' && selectedCard && !selectedCard.requiresKey) {
        setStep('provider');
      // Skip modelselect when going back for non-OpenRouter
      } else if (prevStep === 'modelselect' && !isOpenRouter) {
        setStep('apikey');
      // Skip apikey for providers that don't need key
      } else if (prevStep === 'apikey' && selectedCard && !selectedCard.requiresKey) {
        setStep('provider');
      } else {
        setStep(prevStep);
      }
    }
  }, [step, selectedCard, isOpenRouter]);

  const handleProviderSelect = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    setApiKeyValue('');
    setKeyValid(null);
    setKeyError('');
  }, []);

  const handleValidateKey = useCallback(async () => {
    if (!apiKey.trim()) {
      setKeyError('Please enter an API key');
      setKeyValid(false);
      return;
    }

    setKeyValidating(true);
    setKeyError('');
    setKeyValid(null);

    try {
      const provider = registry.get(selectedProviderId) as AIProvider;
      const valid = await provider.validateKey(apiKey.trim());
      setKeyValid(valid);
      if (!valid) {
        setKeyError('Invalid API key. Please check and try again.');
      }
    } catch {
      setKeyValid(false);
      setKeyError('Could not validate key. Check your connection.');
    } finally {
      setKeyValidating(false);
    }
  }, [apiKey, selectedProviderId, registry]);

  // Auto-fetch models when entering the modelselect step
  useEffect(() => {
    if (step === 'modelselect' && isOpenRouter && freeModels.length === 0 && paidModels.length === 0 && !modelsLoading) {
      handleFetchModels();
    }
  }, [step]);

  const handleFetchModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError('');
    try {
      const result = await OpenRouterProvider.fetchAvailableModels(apiKey.trim());
      setFreeModels(result.free);
      setPaidModels(result.paid);
      setSelectedModel('auto');
      setModelTier('free');
    } catch (err) {
      setModelsError('Failed to fetch models. Please try again.');
      console.error('Model fetch error:', err);
    } finally {
      setModelsLoading(false);
    }
  }, [apiKey]);

  const handleFinish = useCallback(async () => {
    const model = isOpenRouter ? selectedModel : '';
    setProvider(selectedProviderId, model || undefined);
    setLanguage(selectedLanguage);
    setTheme(selectedTheme);
    if (apiKey) {
      await setApiKey(apiKey, DEVICE_PASSPHRASE);
    }
    markConfigured();
  }, [selectedProviderId, selectedLanguage, selectedTheme, apiKey, selectedModel, isOpenRouter, setProvider, setApiKey, setLanguage, setTheme, markConfigured]);

  if (isConfigured) {
    return null;
  }

  return (
    <div style={styles.overlay} data-testid="config-wizard">
      <div style={styles.modal}>
        {/* Progress indicator */}
        <div style={styles.progress}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                ...styles.progressDot,
                backgroundColor: i <= currentStepIndex ? 'var(--accent-color)' : 'var(--border-color)',
              }}
            />
          ))}
        </div>

        {/* Step: Welcome */}
        {step === 'welcome' && (
          <div style={styles.stepContent}>
            <h2 style={styles.title}>Welcome to Wiki Bite</h2>
            <p style={styles.description}>
              Your AI-powered encyclopedia. Let's set things up in a few quick steps.
            </p>
            <div style={styles.actions}>
              <button style={styles.primaryButton} onClick={goNext} data-testid="wizard-next">
                Get Started
              </button>
            </div>
          </div>
        )}

        {/* Step: Choose Provider */}
        {step === 'provider' && (
          <div style={styles.stepContent}>
            <h2 style={styles.title}>Choose Your AI Provider</h2>
            <p style={styles.description}>
              Select which AI service you'd like to use for generating content.
            </p>
            <div style={styles.cardGrid}>
              {PROVIDER_CARDS.map((card) => (
                <button
                  key={card.id}
                  style={{
                    ...styles.providerCard,
                    borderColor: selectedProviderId === card.id ? 'var(--accent-color)' : 'var(--border-color)',
                  }}
                  onClick={() => handleProviderSelect(card.id)}
                  data-testid={`provider-card-${card.id}`}
                >
                  {card.recommended && <span style={styles.badge}>Recommended</span>}
                  <span style={styles.cardName}>{card.name}</span>
                  <span style={styles.cardDesc}>{card.description}</span>
                  <span style={styles.cardFree}>{card.freeTier}</span>
                </button>
              ))}
            </div>
            <div style={styles.actions}>
              <button style={styles.secondaryButton} onClick={goBack} data-testid="wizard-back">
                Back
              </button>
              <button
                style={{
                  ...styles.primaryButton,
                  opacity: selectedProviderId ? 1 : 0.5,
                  cursor: selectedProviderId ? 'pointer' : 'not-allowed',
                }}
                onClick={goNext}
                disabled={!selectedProviderId}
                data-testid="wizard-next"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step: API Key */}
        {step === 'apikey' && (
          <div style={styles.stepContent}>
            <h2 style={styles.title}>Enter API Key</h2>
            <p style={styles.description}>
              Enter your API key for {selectedCard?.name ?? 'the selected provider'}.
            </p>
            <div style={styles.keyInputGroup}>
              <input
                type="password"
                style={styles.keyInput}
                value={apiKey}
                onChange={(e) => {
                  setApiKeyValue(e.target.value);
                  setKeyValid(null);
                  setKeyError('');
                }}
                placeholder="Paste your API key here"
                data-testid="api-key-input"
              />
              <button
                style={styles.validateButton}
                onClick={handleValidateKey}
                disabled={keyValidating || !apiKey.trim()}
                data-testid="validate-key-button"
              >
                {keyValidating ? 'Validating...' : 'Validate'}
              </button>
            </div>
            {keyValid === true && (
              <span style={styles.successText} data-testid="key-valid">
                Key is valid
              </span>
            )}
            {keyValid === false && keyError && (
              <span style={styles.errorText} data-testid="key-invalid">
                {keyError}
              </span>
            )}
            <div style={styles.actions}>
              <button style={styles.secondaryButton} onClick={goBack} data-testid="wizard-back">
                Back
              </button>
              <button
                style={{
                  ...styles.primaryButton,
                  opacity: keyValid ? 1 : 0.5,
                  cursor: keyValid ? 'pointer' : 'not-allowed',
                }}
                onClick={goNext}
                disabled={!keyValid}
                data-testid="wizard-next"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step: Model Selection (OpenRouter only) */}
        {step === 'modelselect' && (
          <div style={styles.stepContent}>
            <h2 style={styles.title}>Choose Your Models</h2>
            <p style={styles.description}>
              Select whether to use free or paid models.
            </p>

            {modelsLoading && (
              <p style={{ textAlign: 'center', color: 'var(--secondary-text-color)' }}>
                Loading available models...
              </p>
            )}

            {modelsError && (
              <div style={{ textAlign: 'center' }}>
                <span style={styles.errorText}>{modelsError}</span>
                <button style={{ ...styles.secondaryButton, marginTop: '0.5rem' }} onClick={handleFetchModels}>
                  Retry
                </button>
              </div>
            )}

            {!modelsLoading && !modelsError && freeModels.length === 0 && paidModels.length === 0 && (
              <button style={styles.primaryButton} onClick={handleFetchModels}>
                Load Models
              </button>
            )}

            {!modelsLoading && (freeModels.length > 0 || paidModels.length > 0) && (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    style={{
                      ...styles.secondaryButton,
                      backgroundColor: modelTier === 'free' ? 'var(--accent-color)' : 'transparent',
                      color: modelTier === 'free' ? '#fff' : 'var(--text-color)',
                    }}
                    onClick={() => { setModelTier('free'); setSelectedModel('auto'); }}
                  >
                    Free Models ({freeModels.length})
                  </button>
                  <button
                    style={{
                      ...styles.secondaryButton,
                      backgroundColor: modelTier === 'paid' ? 'var(--accent-color)' : 'transparent',
                      color: modelTier === 'paid' ? '#fff' : 'var(--text-color)',
                    }}
                    onClick={() => { setModelTier('paid'); setSelectedModel(paidModels[0]?.id ?? ''); }}
                  >
                    Paid Models ({paidModels.length})
                  </button>
                </div>

                <div style={styles.prefGroup}>
                  <label style={styles.prefLabel}>
                    {modelTier === 'free' ? 'Free Model' : 'Paid Model'}
                  </label>
                  <select
                    style={styles.select}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    {modelTier === 'free' && (
                      <option value="auto">Auto (rotate through all free models)</option>
                    )}
                    {(modelTier === 'free' ? freeModels : paidModels).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {modelTier === 'free' && selectedModel === 'auto' && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--secondary-text-color)', margin: 0, textAlign: 'center' }}>
                    Auto mode rotates through free models. If one is rate-limited, you'll be asked to switch.
                  </p>
                )}
              </>
            )}

            <div style={styles.actions}>
              <button style={styles.secondaryButton} onClick={goBack} data-testid="wizard-back">
                Back
              </button>
              <button
                style={{
                  ...styles.primaryButton,
                  opacity: (freeModels.length > 0 || paidModels.length > 0) ? 1 : 0.5,
                  cursor: (freeModels.length > 0 || paidModels.length > 0) ? 'pointer' : 'not-allowed',
                }}
                onClick={goNext}
                disabled={freeModels.length === 0 && paidModels.length === 0}
                data-testid="wizard-next"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step: Preferences */}
        {step === 'preferences' && (
          <div style={styles.stepContent}>
            <h2 style={styles.title}>Preferences</h2>
            <p style={styles.description}>Customize your experience.</p>
            <div style={styles.prefGroup}>
              <label style={styles.prefLabel}>Language</label>
              <select
                style={styles.select}
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                data-testid="language-select"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.prefGroup}>
              <label style={styles.prefLabel}>Theme</label>
              <select
                style={styles.select}
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                data-testid="theme-select"
              >
                {THEMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.actions}>
              <button style={styles.secondaryButton} onClick={goBack} data-testid="wizard-back">
                Back
              </button>
              <button style={styles.primaryButton} onClick={goNext} data-testid="wizard-next">
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div style={styles.stepContent}>
            <h2 style={styles.title}>You're All Set!</h2>
            <p style={styles.description}>
              Your settings have been saved. You can always change them later in Settings.
            </p>
            <div style={styles.actions}>
              <button style={styles.primaryButton} onClick={handleFinish} data-testid="wizard-finish">
                Start Exploring
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigWizard;

/* ---------- inline styles (scoped to component) ---------- */

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '540px',
    width: '90vw',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  progress: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '1.5rem',
  },
  progressDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'background-color 0.2s ease',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  title: {
    fontSize: '1.2em',
    fontWeight: 600,
    margin: 0,
    textAlign: 'center',
  },
  description: {
    fontSize: '0.95em',
    color: 'var(--secondary-text-color, #888)',
    textAlign: 'center',
    margin: 0,
  },
  cardGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  providerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.25rem',
    padding: '0.75rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s ease',
    position: 'relative',
    font: 'inherit',
    color: 'inherit',
  },
  badge: {
    fontSize: '0.7em',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    backgroundColor: 'var(--accent-color)',
    color: '#fff',
    fontWeight: 600,
    letterSpacing: '0.03em',
  },
  cardName: {
    fontWeight: 600,
    fontSize: '1em',
  },
  cardDesc: {
    fontSize: '0.85em',
    color: 'var(--secondary-text-color, #888)',
  },
  cardFree: {
    fontSize: '0.8em',
    fontStyle: 'italic',
    color: 'var(--secondary-text-color, #888)',
  },
  keyInputGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  keyInput: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    font: 'inherit',
    fontSize: '0.9em',
    outline: 'none',
  },
  validateButton: {
    padding: '0.5rem 1rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '0.9em',
    whiteSpace: 'nowrap',
  },
  successText: {
    color: 'var(--accent-color)',
    fontSize: '0.85em',
  },
  errorText: {
    color: 'var(--error-color)',
    fontSize: '0.85em',
  },
  prefGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  prefLabel: {
    fontSize: '0.9em',
    fontWeight: 600,
  },
  select: {
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    font: 'inherit',
    fontSize: '0.9em',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  primaryButton: {
    padding: '0.6rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--accent-color)',
    color: '#fff',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '0.95em',
    fontWeight: 600,
  },
  secondaryButton: {
    padding: '0.6rem 1.5rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: '0.95em',
  },
};
