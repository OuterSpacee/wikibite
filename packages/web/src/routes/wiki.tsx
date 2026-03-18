/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { streamDefinition, generateAsciiArt, getWikiMetadata } from '../services/ai';
import type { AsciiArtData, WikiMetadata } from '../services/providers/types';
import ContentDisplay from '../components/ContentDisplay';
import SearchBar from '../components/SearchBar';
import LoadingSkeleton from '../components/LoadingSkeleton';
import AsciiArtDisplay from '../components/AsciiArtDisplay';
import WikiChat from '../components/WikiChat';
import ExportMenu from '../components/ExportMenu';
import BookmarkButton from '../components/BookmarkButton';
import { useHistory } from '../contexts/HistoryContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UNIQUE_WORDS } from './home';

/**
 * Creates a simple ASCII art bounding box as a fallback.
 * @param topic The text to display inside the box.
 * @returns An AsciiArtData object with the generated art.
 */
const createFallbackArt = (topic: string): AsciiArtData => {
  const displayableTopic = topic.length > 20 ? topic.substring(0, 17) + '...' : topic;
  const paddedTopic = ` ${displayableTopic} `;
  const topBorder = `\u250C${'\u2500'.repeat(paddedTopic.length)}\u2510`;
  const middle = `\u2502${paddedTopic}\u2502`;
  const bottomBorder = `\u2514${'\u2500'.repeat(paddedTopic.length)}\u2518`;
  return {
    art: `${topBorder}\n${middle}\n${bottomBorder}`
  };
};

const WikiPage: React.FC = () => {
  const { topic: rawTopic } = useParams<{ topic: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToHistory } = useHistory();
  const { language } = useLanguage();

  // Decode the topic from the URL
  const topic = rawTopic ? decodeURIComponent(rawTopic) : '';

  // Optional language override from search params
  const langOverride = searchParams.get('lang');

  const effectiveLanguageName = langOverride || language.name;

  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<WikiMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asciiArt, setAsciiArt] = useState<AsciiArtData | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  useEffect(() => {
    if (!topic) return;

    // Add to history when topic changes
    addToHistory(topic);

    let isCancelled = false;

    const fetchContentAndArt = async () => {
      // Set initial state for a clean page load
      setIsLoading(true);
      setError(null);
      setContent('');
      setMetadata(null);
      setAsciiArt(null);
      setGenerationTime(null);
      const startTime = performance.now();

      // Kick off ASCII art generation in parallel
      generateAsciiArt(topic)
        .then(art => {
          if (!isCancelled) {
            setAsciiArt(art);
          }
        })
        .catch(err => {
          if (!isCancelled) {
            console.error("Failed to generate ASCII art:", err);
            const fallbackArt = createFallbackArt(topic);
            setAsciiArt(fallbackArt);
          }
        });

      // Kick off Metadata fetch in parallel
      getWikiMetadata(topic, effectiveLanguageName)
        .then(data => {
          if (!isCancelled) {
            setMetadata(data);
          }
        })
        .catch(err => console.error("Failed to fetch metadata:", err));

      let accumulatedContent = '';
      try {
        for await (const chunk of streamDefinition(topic, effectiveLanguageName)) {
          if (isCancelled) break;

          if (chunk.startsWith('Error:')) {
            throw new Error(chunk);
          }
          accumulatedContent += chunk;
          if (!isCancelled) {
            setContent(accumulatedContent);
          }
        }
      } catch (e: unknown) {
        if (!isCancelled) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
          setError(errorMessage);
          setContent('');
          console.error(e);
        }
      } finally {
        if (!isCancelled) {
          const endTime = performance.now();
          setGenerationTime(endTime - startTime);
          setIsLoading(false);
        }
      }
    };

    fetchContentAndArt();

    return () => {
      isCancelled = true;
    };
  }, [topic, effectiveLanguageName]);

  const handleWordClick = useCallback((word: string) => {
    const newTopic = word.trim();
    if (newTopic && newTopic.toLowerCase() !== topic.toLowerCase()) {
      navigate(`/wiki/${encodeURIComponent(newTopic)}`);
    }
  }, [topic, navigate]);

  const handleSearch = useCallback((searchTopic: string) => {
    const newTopic = searchTopic.trim();
    if (newTopic && newTopic.toLowerCase() !== topic.toLowerCase()) {
      navigate(`/wiki/${encodeURIComponent(newTopic)}`);
    }
  }, [topic, navigate]);

  const handleRandom = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
    let randomWord = UNIQUE_WORDS[randomIndex];

    // Prevent picking the same word twice in a row
    if (randomWord.toLowerCase() === topic.toLowerCase()) {
      const nextIndex = (randomIndex + 1) % UNIQUE_WORDS.length;
      randomWord = UNIQUE_WORDS[nextIndex];
    }

    navigate(`/wiki/${encodeURIComponent(randomWord)}`);
  }, [topic, navigate]);

  if (!topic) {
    return <div style={{ color: '#888', padding: '2rem 0' }}><p>No topic specified.</p></div>;
  }

  return (
    <div>
      <SearchBar onSearch={handleSearch} onRandom={handleRandom} isLoading={isLoading} />

      <header className="page-header">
        <h1 className="header-title">WIKI BITE</h1>
        <h2 className="topic-title">{topic}</h2>
      </header>

      <main>
        <div>
          {error && (
            <div style={{ border: '1px solid #cc0000', padding: '1rem', color: '#cc0000' }}>
              <p style={{ margin: 0 }}>An Error Occurred</p>
              <p style={{ marginTop: '0.5rem', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Show skeleton loader when loading and no content is yet available */}
          {isLoading && content.length === 0 && !error && (
            <LoadingSkeleton />
          )}

          {/* Show content as it streams or when it's interactive */}
          {content.length > 0 && !error && (
            <div className="content-with-art">
              <div className="content-art">
                <AsciiArtDisplay artData={asciiArt} topic={topic} />
              </div>
              <div className="content-main">
                <ContentDisplay
                  content={content}
                  metadata={metadata}
                  isLoading={isLoading}
                  onWordClick={handleWordClick}
                />
              </div>
            </div>
          )}

          {/* Export Menu + Bookmark Buttons */}
          {!isLoading && !error && content.length > 0 && (
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <ExportMenu
                topic={topic}
                content={content}
                metadata={metadata}
                asciiArt={asciiArt}
                language={effectiveLanguageName}
              />
              <BookmarkButton
                topic={topic}
                language={effectiveLanguageName}
                provider=""
                model=""
              />
            </div>
          )}

          {/* Chat Widget */}
          {!isLoading && !error && (
            <WikiChat currentTopic={topic} />
          )}

          {/* Show empty state if fetch completes with no content and is not loading */}
          {!isLoading && !error && content.length === 0 && (
            <div style={{ color: '#888', padding: '2rem 0' }}>
              <p>Content could not be generated.</p>
            </div>
          )}
        </div>
      </main>

      {generationTime && (
        <div style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--secondary-text-color)' }}>
          Generated in {Math.round(generationTime)}ms
        </div>
      )}

      {!isLoading && content.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '0.75rem',
          fontSize: '0.75rem',
          color: 'var(--secondary-text-color)',
          borderTop: '1px solid var(--border-color)',
          marginTop: '1rem',
        }}>
          AI-generated content — may contain inaccuracies
        </div>
      )}
    </div>
  );
};

export default WikiPage;
