import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { encryptKey, decryptKey } from '@/lib/encryption';

const STORAGE_KEY = 'wiki-bite-config';

export interface AppConfig {
  providerId: string;
  model: string;
  encryptedApiKey: string;
  language: string;
  theme: string;
  isConfigured: boolean;
}

export interface ConfigContextValue {
  config: AppConfig;
  setProvider: (providerId: string, model?: string) => void;
  setApiKey: (key: string, passphrase: string) => Promise<void>;
  getApiKey: (passphrase: string) => Promise<string>;
  setLanguage: (lang: string) => void;
  setTheme: (theme: string) => void;
  markConfigured: () => void;
  resetConfig: () => void;
  isConfigured: boolean;
}

const defaultConfig: AppConfig = {
  providerId: 'gemini',
  model: '',
  encryptedApiKey: '',
  language: 'en',
  theme: 'system',
  isConfigured: false,
};

function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppConfig>;
      return { ...defaultConfig, ...parsed };
    }
  } catch {
    // Corrupted data -- fall through to default
  }
  return { ...defaultConfig };
}

function saveConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(loadConfig);

  // Persist every time config changes
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const setProvider = useCallback((providerId: string, model?: string) => {
    setConfig((prev) => ({
      ...prev,
      providerId,
      model: model ?? prev.model,
    }));
  }, []);

  const setApiKey = useCallback(async (key: string, passphrase: string) => {
    const encryptedApiKey = await encryptKey(key, passphrase);
    setConfig((prev) => ({ ...prev, encryptedApiKey }));
  }, []);

  const getApiKey = useCallback(
    async (passphrase: string) => {
      if (!config.encryptedApiKey) return '';
      return decryptKey(config.encryptedApiKey, passphrase);
    },
    [config.encryptedApiKey],
  );

  const setLanguage = useCallback((language: string) => {
    setConfig((prev) => ({ ...prev, language }));
  }, []);

  const setTheme = useCallback((theme: string) => {
    setConfig((prev) => ({ ...prev, theme }));
  }, []);

  const markConfigured = useCallback(() => {
    setConfig((prev) => ({ ...prev, isConfigured: true }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({ ...defaultConfig });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: ConfigContextValue = {
    config,
    setProvider,
    setApiKey,
    getApiKey,
    setLanguage,
    setTheme,
    markConfigured,
    resetConfig,
    isConfigured: config.isConfigured,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
