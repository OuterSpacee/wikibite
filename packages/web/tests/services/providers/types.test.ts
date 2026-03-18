import { describe, it, expectTypeOf } from 'vitest';
import type { AIProvider, WikiMetadata, ChatMessage, AsciiArtData } from '@/services/providers/types';

describe('AIProvider interface', () => {
  it('defines all required properties', () => {
    expectTypeOf<AIProvider>().toHaveProperty('id');
    expectTypeOf<AIProvider>().toHaveProperty('streamDefinition');
    expectTypeOf<AIProvider>().toHaveProperty('generateAsciiArt');
    expectTypeOf<AIProvider>().toHaveProperty('getMetadata');
    expectTypeOf<AIProvider>().toHaveProperty('streamChat');
    expectTypeOf<AIProvider>().toHaveProperty('validateKey');
  });

  it('WikiMetadata has correct shape', () => {
    expectTypeOf<WikiMetadata>().toHaveProperty('keyFacts');
    expectTypeOf<WikiMetadata>().toHaveProperty('relatedTopics');
  });
});
