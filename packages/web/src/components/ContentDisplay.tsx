import React from 'react';
import type { WikiMetadata } from '../services/providers/types';

interface ContentDisplayProps {
  content: string;
  metadata?: WikiMetadata | null;
  isLoading: boolean;
  onWordClick: (word: string) => void;
}

const InteractiveContent: React.FC<{
  content: string;
  onWordClick: (word: string) => void;
}> = ({ content, onWordClick }) => {
  const words = content.split(/(\s+)/).filter(Boolean); // Keep whitespace for spacing

  return (
    <p style={{ margin: 0, textAlign: 'justify' }}>
      {words.map((word, index) => {
        // Only make non-whitespace words clickable
        if (/\S/.test(word)) {
          const cleanWord = word.replace(/[.,!?;:()"']/g, '');
          if (cleanWord) {
            return (
              <button
                key={index}
                onClick={() => onWordClick(cleanWord)}
                className="interactive-word"
                aria-label={`Learn more about ${cleanWord}`}
              >
                {word}
              </button>
            );
          }
        }
        // Render whitespace as-is
        return <span key={index}>{word}</span>;
      })}
    </p>
  );
};

const StreamingContent: React.FC<{ content: string }> = ({ content }) => (
  <p style={{ margin: 0 }}>
    {content}
    <span className="blinking-cursor">|</span>
  </p>
);

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, metadata, isLoading, onWordClick }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="definition-section">
        {isLoading ? (
          <StreamingContent content={content} />
        ) : (
          <InteractiveContent content={content} onWordClick={onWordClick} />
        )}
      </div>

      {/* Metadata Section - Only show when not loading and metadata exists */}
      {!isLoading && metadata && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '2rem',
          marginTop: '1rem'
        }}>
          {metadata.keyFacts.length > 0 && (
            <div>
              <h3 style={{
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--secondary-text-color)',
                marginBottom: '1rem'
              }}>
                Key Facts
              </h3>
              <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                {metadata.keyFacts.map((fact, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>{fact}</li>
                ))}
              </ul>
            </div>
          )}

          {metadata.relatedTopics.length > 0 && (
            <div>
              <h3 style={{
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--secondary-text-color)',
                marginBottom: '1rem'
              }}>
                Related Topics
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {metadata.relatedTopics.map((topic, i) => (
                  <button
                    key={i}
                    onClick={() => onWordClick(topic)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent-color)';
                      e.currentTarget.style.color = 'var(--accent-color)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'inherit';
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentDisplay;