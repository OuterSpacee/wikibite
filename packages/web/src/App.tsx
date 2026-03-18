/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import RootLayout from './routes/root';
import HomePage from './routes/home';
import WikiPage from './routes/wiki';
import BookmarksPage from './routes/bookmarks';
import GraphPage from './routes/graph';
import SettingsPage from './routes/settings';
import { ThemeProvider } from './contexts/ThemeContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { BookmarkProvider } from './contexts/BookmarkContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'wiki/:topic', element: <WikiPage /> },
      { path: 'bookmarks', element: <BookmarksPage /> },
      { path: 'graph', element: <GraphPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <HistoryProvider>
          <BookmarkProvider>
            <RouterProvider router={router} />
          </BookmarkProvider>
        </HistoryProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
