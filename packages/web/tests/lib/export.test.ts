import { describe, it, expect } from 'vitest';
import { exportAsMarkdown, exportAsJson, exportAsText } from '@/lib/export';
import { WikiMetadata, AsciiArtData } from '@/services/geminiService';

const sampleMetadata: WikiMetadata = {
  keyFacts: ['Fact one', 'Fact two'],
  relatedTopics: ['Alpha', 'Beta', 'Gamma'],
};

const sampleAsciiArt: AsciiArtData = {
  art: '  /\\_/\\\n ( o.o )\n  > ^ <',
};

describe('exportAsMarkdown', () => {
  it('includes topic as heading', () => {
    const result = exportAsMarkdown('Quantum', 'Some content', null, null);
    expect(result).toContain('# Quantum');
  });

  it('includes content body', () => {
    const result = exportAsMarkdown('Test', 'Body text here', null, null);
    expect(result).toContain('Body text here');
  });

  it('includes ASCII art in a code block', () => {
    const result = exportAsMarkdown('Cat', 'Content', null, sampleAsciiArt);
    expect(result).toContain('```');
    expect(result).toContain(sampleAsciiArt.art);
  });

  it('includes key facts as list items', () => {
    const result = exportAsMarkdown('Topic', 'Content', sampleMetadata, null);
    expect(result).toContain('## Key Facts');
    expect(result).toContain('- Fact one');
    expect(result).toContain('- Fact two');
  });

  it('includes related topics', () => {
    const result = exportAsMarkdown('Topic', 'Content', sampleMetadata, null);
    expect(result).toContain('## Related Topics');
    expect(result).toContain('Alpha | Beta | Gamma');
  });

  it('includes footer attribution', () => {
    const result = exportAsMarkdown('Topic', 'Content', null, null);
    expect(result).toContain('Wiki Bite | biteskill.com');
  });

  it('omits key facts section when metadata is null', () => {
    const result = exportAsMarkdown('Topic', 'Content', null, null);
    expect(result).not.toContain('## Key Facts');
  });

  it('omits ASCII art block when asciiArt is null', () => {
    const result = exportAsMarkdown('Topic', 'Content', null, null);
    expect(result).not.toContain('```');
  });

  it('omits key facts section when keyFacts array is empty', () => {
    const emptyMeta: WikiMetadata = { keyFacts: [], relatedTopics: ['A'] };
    const result = exportAsMarkdown('Topic', 'Content', emptyMeta, null);
    expect(result).not.toContain('## Key Facts');
  });
});

describe('exportAsJson', () => {
  it('produces valid JSON', () => {
    const result = exportAsJson('Topic', 'English', 'Content', null, null);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes topic and language', () => {
    const result = exportAsJson('Quantum', 'French', 'Content', null, null);
    const parsed = JSON.parse(result);
    expect(parsed.topic).toBe('Quantum');
    expect(parsed.language).toBe('French');
  });

  it('includes content', () => {
    const result = exportAsJson('T', 'en', 'My body content', null, null);
    const parsed = JSON.parse(result);
    expect(parsed.content).toBe('My body content');
  });

  it('includes keyFacts and relatedTopics from metadata', () => {
    const result = exportAsJson('T', 'en', 'Content', sampleMetadata, null);
    const parsed = JSON.parse(result);
    expect(parsed.keyFacts).toEqual(['Fact one', 'Fact two']);
    expect(parsed.relatedTopics).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('defaults keyFacts and relatedTopics to empty arrays when metadata is null', () => {
    const result = exportAsJson('T', 'en', 'Content', null, null);
    const parsed = JSON.parse(result);
    expect(parsed.keyFacts).toEqual([]);
    expect(parsed.relatedTopics).toEqual([]);
  });

  it('includes asciiArt string when provided', () => {
    const result = exportAsJson('T', 'en', 'Content', null, sampleAsciiArt);
    const parsed = JSON.parse(result);
    expect(parsed.asciiArt).toBe(sampleAsciiArt.art);
  });

  it('sets asciiArt to null when not provided', () => {
    const result = exportAsJson('T', 'en', 'Content', null, null);
    const parsed = JSON.parse(result);
    expect(parsed.asciiArt).toBeNull();
  });

  it('includes exportedAt timestamp', () => {
    const result = exportAsJson('T', 'en', 'Content', null, null);
    const parsed = JSON.parse(result);
    expect(parsed.exportedAt).toBeDefined();
    expect(() => new Date(parsed.exportedAt)).not.toThrow();
  });

  it('includes source attribution', () => {
    const result = exportAsJson('T', 'en', 'Content', null, null);
    const parsed = JSON.parse(result);
    expect(parsed.source).toContain('Wiki Bite');
  });
});

describe('exportAsText', () => {
  it('includes topic in uppercase', () => {
    const result = exportAsText('Quantum Physics', 'Content', null);
    expect(result).toContain('QUANTUM PHYSICS');
  });

  it('includes separator line of equal signs matching topic length', () => {
    const topic = 'Test';
    const result = exportAsText(topic, 'Content', null);
    expect(result).toContain('====');
  });

  it('includes content body', () => {
    const result = exportAsText('T', 'My body text', null);
    expect(result).toContain('My body text');
  });

  it('includes key facts section', () => {
    const result = exportAsText('T', 'Content', sampleMetadata);
    expect(result).toContain('KEY FACTS');
    expect(result).toContain('* Fact one');
    expect(result).toContain('* Fact two');
  });

  it('includes related topics section', () => {
    const result = exportAsText('T', 'Content', sampleMetadata);
    expect(result).toContain('RELATED TOPICS');
    expect(result).toContain('Alpha, Beta, Gamma');
  });

  it('includes footer attribution', () => {
    const result = exportAsText('T', 'Content', null);
    expect(result).toContain('Wiki Bite | biteskill.com');
  });

  it('omits key facts when metadata is null', () => {
    const result = exportAsText('T', 'Content', null);
    expect(result).not.toContain('KEY FACTS');
  });

  it('omits related topics when list is empty', () => {
    const emptyMeta: WikiMetadata = { keyFacts: ['A'], relatedTopics: [] };
    const result = exportAsText('T', 'Content', emptyMeta);
    expect(result).not.toContain('RELATED TOPICS');
  });
});
