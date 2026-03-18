/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSelector from '../components/LanguageSelector';
import HistorySidebar from '../components/HistorySidebar';
import ConfigWizard from '../components/ConfigWizard';
import CommandPalette, { type CommandPaletteAction } from '../components/CommandPalette';
import { ConfigProvider } from '../contexts/ConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHistory } from '../contexts/HistoryContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { UNIQUE_WORDS } from './home';

const RootLayoutInner: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { history: historyItems } = useHistory();
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
    <ConfigProvider>
      <div>
        <ConfigWizard />
        <HistorySidebar onSelectTopic={handleSelectTopic} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <LanguageSelector />
          <ThemeToggle />
        </div>

        <Outlet />

        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          actions={paletteActions}
          recentTopics={recentTopics}
          onSelectTopic={handleSelectTopic}
        />

        <footer className="sticky-footer">
          <p className="footer-text" style={{ margin: 0 }}>
            Wiki Bite by <a href="https://biteskill.com" target="_blank" rel="noopener noreferrer">BiteSkill</a> · Powered by Gemini 2.5 Flash
          </p>
        </footer>
      </div>
    </ConfigProvider>
  );
};

const RootLayout: React.FC = () => {
  return <RootLayoutInner />;
};

export default RootLayout;
