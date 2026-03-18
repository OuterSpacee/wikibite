import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ConfigProvider, useConfig } from '@/contexts/ConfigContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ConfigProvider>{children}</ConfigProvider>
);

describe('ConfigContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unconfigured by default', () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current.isConfigured).toBe(false);
  });

  it('sets provider', () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    act(() => {
      result.current.setProvider('openai', 'gpt-4o');
    });
    expect(result.current.config.providerId).toBe('openai');
    expect(result.current.config.model).toBe('gpt-4o');
  });

  it('marks as configured', () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    act(() => {
      result.current.markConfigured();
    });
    expect(result.current.isConfigured).toBe(true);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    act(() => {
      result.current.setProvider('ollama');
      result.current.markConfigured();
    });

    const stored = JSON.parse(localStorage.getItem('wiki-bite-config')!);
    expect(stored.providerId).toBe('ollama');
    expect(stored.isConfigured).toBe(true);
  });

  it('loads from localStorage on mount', () => {
    localStorage.setItem(
      'wiki-bite-config',
      JSON.stringify({
        providerId: 'claude',
        model: 'claude-sonnet-4-6',
        encryptedApiKey: '',
        language: 'en',
        theme: 'dark',
        isConfigured: true,
      }),
    );

    const { result } = renderHook(() => useConfig(), { wrapper });
    expect(result.current.config.providerId).toBe('claude');
    expect(result.current.isConfigured).toBe(true);
  });

  it('resets config', () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    act(() => {
      result.current.setProvider('openai');
      result.current.markConfigured();
    });
    act(() => {
      result.current.resetConfig();
    });
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.config.providerId).toBe('gemini');
  });

  it('encrypts and decrypts API key', async () => {
    const { result } = renderHook(() => useConfig(), { wrapper });

    await act(async () => {
      await result.current.setApiKey('sk-test-key-12345', 'mypassphrase');
    });

    expect(result.current.config.encryptedApiKey).not.toBe('');
    expect(result.current.config.encryptedApiKey).not.toBe('sk-test-key-12345');

    const decrypted = await result.current.getApiKey('mypassphrase');
    expect(decrypted).toBe('sk-test-key-12345');
  });

  it('sets language', () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    act(() => {
      result.current.setLanguage('ar');
    });
    expect(result.current.config.language).toBe('ar');
  });

  it('sets theme', () => {
    const { result } = renderHook(() => useConfig(), { wrapper });
    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.config.theme).toBe('dark');
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useConfig());
    }).toThrow('useConfig must be used within a ConfigProvider');
  });
});
