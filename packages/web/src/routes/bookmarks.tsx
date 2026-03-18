/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router';
import { useBookmarks, type BookmarkItem } from '../contexts/BookmarkContext';

type SortOrder = 'newest' | 'oldest';

export default function BookmarksPage() {
  const { bookmarks, removeBookmark, loading } = useBookmarks();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const filtered = useMemo(() => {
    let items = [...bookmarks];

    // Filter by search term
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter((b) => b.topic.toLowerCase().includes(q));
    }

    // Sort by date
    items.sort((a, b) =>
      sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    );

    return items;
  }, [bookmarks, search, sortOrder]);

  const handleRemove = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      await removeBookmark(id);
    },
    [removeBookmark],
  );

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>Bookmarks</h2>
        <p style={styles.emptyText}>Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div style={styles.container} data-testid="bookmarks-page">
      <h2 style={styles.heading}>Bookmarks</h2>

      {/* Search and Sort controls */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search bookmarks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
          aria-label="Search bookmarks"
          data-testid="bookmarks-search"
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          style={styles.sortSelect}
          aria-label="Sort order"
          data-testid="bookmarks-sort"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Bookmarks list */}
      {bookmarks.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No bookmarks yet.</p>
          <p style={styles.emptyHint}>
            Browse topics and click the star icon to save them here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No bookmarks match your search.</p>
        </div>
      ) : (
        <ul style={styles.list}>
          {filtered.map((bookmark: BookmarkItem) => (
            <li key={bookmark.id} style={styles.listItem}>
              <Link
                to={`/wiki/${encodeURIComponent(bookmark.topic)}`}
                style={styles.link}
                data-testid={`bookmark-item-${bookmark.id}`}
              >
                <div style={styles.itemContent}>
                  <span style={styles.topicName}>{bookmark.topic}</span>
                  <span style={styles.meta}>
                    {bookmark.language} &middot; {formatDate(bookmark.createdAt)}
                  </span>
                </div>
              </Link>
              <button
                onClick={(e) => handleRemove(e, bookmark.id)}
                style={styles.removeButton}
                aria-label={`Remove bookmark for ${bookmark.topic}`}
                data-testid={`bookmark-remove-${bookmark.id}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- inline styles (scoped to component) ---------- */

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '1rem 0',
  },
  heading: {
    fontSize: '1.4em',
    fontWeight: 600,
    marginTop: 0,
    marginBottom: '1rem',
    color: 'var(--text-color)',
  },
  controls: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  searchInput: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    font: 'inherit',
    fontSize: '0.9em',
    outline: 'none',
  },
  sortSelect: {
    padding: '0.5rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    font: 'inherit',
    fontSize: '0.9em',
    outline: 'none',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    overflow: 'hidden',
    transition: 'border-color 0.2s ease',
  },
  link: {
    flex: 1,
    padding: '0.75rem 1rem',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  topicName: {
    fontWeight: 600,
    fontSize: '1em',
    color: 'var(--text-color)',
  },
  meta: {
    fontSize: '0.8em',
    color: 'var(--secondary-color)',
  },
  removeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--secondary-color)',
    cursor: 'pointer',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  emptyText: {
    color: 'var(--secondary-color)',
    fontSize: '1em',
    margin: 0,
  },
  emptyHint: {
    color: 'var(--secondary-color)',
    fontSize: '0.85em',
    marginTop: '0.5rem',
  },
};
