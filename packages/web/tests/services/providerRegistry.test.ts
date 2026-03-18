import { describe, it, expect, vi } from 'vitest';
import { ProviderRegistry } from '@/services/providerRegistry';
import type { AIProvider } from '@/services/providers/types';

const mockProvider: AIProvider = {
  id: 'mock',
  name: 'Mock Provider',
  description: 'Test',
  requiresKey: false,
  defaultModel: 'mock-1',
  availableModels: ['mock-1'],
  streamDefinition: vi.fn() as any,
  generateAsciiArt: vi.fn() as any,
  getMetadata: vi.fn() as any,
  streamChat: vi.fn() as any,
  validateKey: vi.fn().mockResolvedValue(true),
};

describe('ProviderRegistry', () => {
  it('registers and retrieves a provider', () => {
    const registry = new ProviderRegistry();
    registry.register(mockProvider);
    expect(registry.get('mock')).toBe(mockProvider);
  });

  it('lists all registered providers', () => {
    const registry = new ProviderRegistry();
    registry.register(mockProvider);
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].id).toBe('mock');
  });

  it('returns undefined for unknown provider', () => {
    const registry = new ProviderRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('checks if provider exists', () => {
    const registry = new ProviderRegistry();
    registry.register(mockProvider);
    expect(registry.has('mock')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });
});
