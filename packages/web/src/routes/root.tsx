/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSelector from '../components/LanguageSelector';
import HistorySidebar from '../components/HistorySidebar';
import ConfigWizard from '../components/ConfigWizard';
import CommandPalette, { type CommandPaletteAction } from '../components/CommandPalette';
import { useConfig } from '../contexts/ConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHistory } from '../contexts/HistoryContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useProviderSync } from '../hooks/useProviderSync';
import { UNIQUE_WORDS } from './home';

const RootLayoutInner: React.FC = () => {
  useProviderSync();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme } = useTheme();
  const { history: historyItems } = useHistory();
  const { config } = useConfig();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const handleSelectTopic = useCallback(
    (topic: string) => {
      navigate(`/wiki/${encodeURIComponent(topic)}`);
    },
    [navigate],
  );

  const handleRandomTopic = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
    const randomWord = UNIQUE_WORDS[randomIndex];
    navigate(`/wiki/${encodeURIComponent(randomWord)}`);
  }, [navigate]);

  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>('.search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  // Keyboard shortcut callbacks
  useKeyboardShortcuts({
    onFocusSearch: handleFocusSearch,
    onToggleBookmark: () => {
      // Bookmark toggling requires topic context; handled by individual page components
    },
    onToggleHistory: () => {
      const historyButton = document.querySelector<HTMLButtonElement>('[aria-label="Toggle History"]');
      if (historyButton) {
        historyButton.click();
      }
    },
    onToggleTheme: toggleTheme,
    onRandomTopic: handleRandomTopic,
    onTogglePalette: () => setPaletteOpen((prev) => !prev),
    onEscape: () => setPaletteOpen(false),
  });

  // Command palette actions
  const paletteActions: CommandPaletteAction[] = useMemo(
    () => [
      {
        id: 'theme',
        label: 'Toggle Theme',
        description: 'Switch light/dark mode',
        onSelect: toggleTheme,
      },
      {
        id: 'random',
        label: 'Random Topic',
        description: 'Explore something new',
        onSelect: handleRandomTopic,
      },
    ],
    [toggleTheme, handleRandomTopic],
  );

  // Recent topics from history context
  const recentTopics = useMemo(
    () => historyItems.slice(0, 10).map((item) => item.topic),
    [historyItems],
  );

  return (
      <div>
        <ConfigWizard />
        <aside aria-label="History sidebar">
          <HistorySidebar onSelectTopic={handleSelectTopic} />
        </aside>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <nav aria-label="Main navigation" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {[
              { path: '/', label: 'Home' },
              { path: '/bookmarks', label: 'Bookmarks' },
              { path: '/graph', label: 'Graph' },
              { path: '/settings', label: 'Settings' },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{
                  padding: '0.35rem 0.7rem',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: location.pathname === link.path ? 'var(--accent-color)' : 'transparent',
                  color: location.pathname === link.path ? '#fff' : 'var(--text-color)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                }}
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </header>

        <main>
          <Outlet />
        </main>

        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          actions={paletteActions}
          recentTopics={recentTopics}
          onSelectTopic={handleSelectTopic}
        />

        <footer className="sticky-footer">
          <p className="footer-text" style={{ margin: 0 }}>
            Wiki Bite by <a href="https://biteskill.com" target="_blank" rel="noopener noreferrer">BiteSkill</a> · Powered by {config.providerId}
          </p>
        </footer>
      </div>
  );
};

const RootLayout: React.FC = () => {
  return <RootLayoutInner />;
};

export default RootLayout;
