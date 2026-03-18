/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../contexts/LanguageContext';
import { WikiCache, type CacheStats } from '../services/cache';

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
  padding: '1.5rem',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-color)',
};

const headingStyle: React.CSSProperties = {
  margin: '0 0 1rem',
  fontSize: '1.1rem',
  fontWeight: 600,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--text-color)',
};

const valueStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--secondary-text-color)',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  backgroundColor: 'var(--bg-color)',
  color: 'var(--text-color)',
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: 'var(--error-color)',
  color: 'var(--error-color)',
};

export default function SettingsPage() {
  const { config, resetConfig } = useConfig();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [clearMessage, setClearMessage] = useState('');

  useEffect(() => {
    const cache = new WikiCache();
    cache.getStats().then(setCacheStats).catch(console.error);
  }, []);

  const handleClearCache = async () => {
    const cache = new WikiCache();
    await cache.clear();
    setCacheStats({ definitionCount: 0, historyCount: 0 });
    setClearMessage('Cache cleared!');
    setTimeout(() => setClearMessage(''), 2000);
  };

  const maskedKey = config.encryptedApiKey
    ? '••••••••' + config.encryptedApiKey.slice(-4)
    : 'Not set';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Settings</h1>

      {/* Provider Section */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Provider</h2>
        <div style={rowStyle}>
          <span style={labelStyle}>Current Provider</span>
          <span style={valueStyle}>{config.providerId}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Model</span>
          <span style={valueStyle}>{config.model || 'Default'}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>API Key</span>
          <span style={valueStyle}>{maskedKey}</span>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <button style={dangerButtonStyle} onClick={resetConfig}>
            Reset Configuration
          </button>
        </div>
      </section>

      {/* Appearance Section */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Appearance</h2>
        <div style={rowStyle}>
          <span style={labelStyle}>Theme</span>
          <button style={buttonStyle} onClick={toggleTheme}>
            {theme === 'dark' ? 'Dark' : 'Light'} — Click to toggle
          </button>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Language</span>
          <select
            value={language.name}
            onChange={(e) => {
              const lang = SUPPORTED_LANGUAGES.find((l) => l.name === e.target.value);
              if (lang) setLanguage(lang);
            }}
            style={{
              ...buttonStyle,
              appearance: 'auto',
            }}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.name}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Cache Section */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Cache</h2>
        {cacheStats ? (
          <>
            <div style={rowStyle}>
              <span style={labelStyle}>Cached Definitions</span>
              <span style={valueStyle}>{cacheStats.definitionCount}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>History Entries</span>
              <span style={valueStyle}>{cacheStats.historyCount}</span>
            </div>
          </>
        ) : (
          <p style={valueStyle}>Loading stats...</p>
        )}
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button style={dangerButtonStyle} onClick={handleClearCache}>
            Clear All Cache
          </button>
          {clearMessage && (
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)' }}>
              {clearMessage}
            </span>
          )}
        </div>
      </section>

      {/* About Section */}
      <section style={sectionStyle}>
        <h2 style={headingStyle}>About</h2>
        <div style={rowStyle}>
          <span style={labelStyle}>Version</span>
          <span style={valueStyle}>1.0.0</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Website</span>
          <a
            href="https://biteskill.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...valueStyle, color: 'var(--accent-color)', textDecoration: 'none' }}
          >
            biteskill.com
          </a>
        </div>
      </section>
    </div>
  );
}
