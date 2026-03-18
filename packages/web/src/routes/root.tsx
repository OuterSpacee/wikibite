/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, useNavigate } from 'react-router';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSelector from '../components/LanguageSelector';
import HistorySidebar from '../components/HistorySidebar';
import ConfigWizard from '../components/ConfigWizard';
import { ConfigProvider } from '../contexts/ConfigContext';

const RootLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectTopic = (topic: string) => {
    navigate(`/wiki/${encodeURIComponent(topic)}`);
  };

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

        <footer className="sticky-footer">
          <p className="footer-text" style={{ margin: 0 }}>
            Wiki Bite by <a href="https://biteskill.com" target="_blank" rel="noopener noreferrer">BiteSkill</a> · Powered by Gemini 2.5 Flash
          </p>
        </footer>
      </div>
    </ConfigProvider>
  );
};

export default RootLayout;
