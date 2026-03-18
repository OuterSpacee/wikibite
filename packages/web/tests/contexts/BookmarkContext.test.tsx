import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BookmarkProvider, useBookmarks } from '@/contexts/BookmarkContext';
import { MemoryRouter } from 'react-router';
import BookmarkButton from '@/components/BookmarkButton';
import BookmarksPage from '@/routes/bookmarks';
import { IDBFactory } from 'fake-indexeddb';

// Helper wrapper that provides BookmarkProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BookmarkProvider>{children}</BookmarkProvider>
);

// Helper wrapper with both BookmarkProvider and Router
function RouterBookmarkWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BookmarkProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </BookmarkProvider>
  );
}

// Reset IndexedDB completely before each test
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

// Wait for the provider to finish its async init
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

describe('BookmarkContext', () => {
  it('starts with empty bookmarks', async () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await settle();

    expect(result.current.bookmarks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useBookmarks());
    }).toThrow('useBookmarks must be used within a BookmarkProvider');
  });

  it('adds a bookmark via toggleBookmark', async () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await settle();

    await act(async () => {
      await result.current.toggleBookmark('React', 'English', 'gemini', 'flash');
    });

    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.bookmarks[0].topic).toBe('React');
    expect(result.current.bookmarks[0].language).toBe('English');
    expect(result.current.isBookmarked('React')).toBe(true);
  });

  it('removes a bookmark via toggleBookmark when already bookmarked', async () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await settle();

    await act(async () => {
      await result.current.toggleBookmark('React', 'English', 'gemini', 'flash');
    });
    expect(result.current.isBookmarked('React')).toBe(true);

    await act(async () => {
      await result.current.toggleBookmark('React', 'English', 'gemini', 'flash');
    });
    expect(result.current.isBookmarked('React')).toBe(false);
    expect(result.current.bookmarks).toHaveLength(0);
  });

  it('isBookmarked is case-insensitive', async () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await settle();

    await act(async () => {
      await result.current.toggleBookmark('JavaScript', 'English', 'gemini', 'flash');
    });

    expect(result.current.isBookmarked('javascript')).toBe(true);
    expect(result.current.isBookmarked('JAVASCRIPT')).toBe(true);
    expect(result.current.isBookmarked('JavaScript')).toBe(true);
  });

  it('removes a bookmark by id', async () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await settle();

    await act(async () => {
      await result.current.toggleBookmark('React', 'English', 'gemini', 'flash');
    });
    await act(async () => {
      await result.current.toggleBookmark('Vue', 'English', 'gemini', 'flash');
    });

    expect(result.current.bookmarks).toHaveLength(2);

    await act(async () => {
      await result.current.removeBookmark('react');
    });

    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.bookmarks[0].topic).toBe('Vue');
  });

  it('getBookmarks returns current bookmarks', async () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await settle();

    await act(async () => {
      await result.current.toggleBookmark('TypeScript', 'English', 'gemini', 'flash');
    });

    const bookmarks = result.current.getBookmarks();
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].topic).toBe('TypeScript');
  });

  it('handles multiple bookmarks', async () => {
    const { result } = renderHook(() => useBookmarks(), { wrapper });
    await settle();

    await act(async () => {
      await result.current.toggleBookmark('React', 'English', 'gemini', 'flash');
    });
    await act(async () => {
      await result.current.toggleBookmark('Vue', 'French', 'openai', 'gpt-4');
    });
    await act(async () => {
      await result.current.toggleBookmark('Angular', 'Arabic', 'claude', 'sonnet');
    });

    expect(result.current.bookmarks).toHaveLength(3);
    expect(result.current.isBookmarked('React')).toBe(true);
    expect(result.current.isBookmarked('Vue')).toBe(true);
    expect(result.current.isBookmarked('Angular')).toBe(true);
    expect(result.current.isBookmarked('Svelte')).toBe(false);
  });
});

describe('BookmarkButton', () => {
  it('renders with "Bookmark" text when not bookmarked', async () => {
    render(
      <BookmarkProvider>
        <BookmarkButton topic="React" language="English" provider="gemini" model="flash" />
      </BookmarkProvider>,
    );

    await settle();

    const button = screen.getByTestId('bookmark-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Bookmark');
    expect(button).toHaveAttribute('aria-label', 'Add bookmark');
  });

  it('toggles to "Bookmarked" when clicked', async () => {
    render(
      <BookmarkProvider>
        <BookmarkButton topic="React" language="English" provider="gemini" model="flash" />
      </BookmarkProvider>,
    );

    await settle();

    const button = screen.getByTestId('bookmark-button');
    expect(button).toHaveTextContent('Bookmark');

    await act(async () => {
      fireEvent.click(button);
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(button).toHaveTextContent('Bookmarked');
    expect(button).toHaveAttribute('aria-label', 'Remove bookmark');
  });

  it('toggles back to "Bookmark" on second click', async () => {
    render(
      <BookmarkProvider>
        <BookmarkButton topic="React" language="English" provider="gemini" model="flash" />
      </BookmarkProvider>,
    );

    await settle();

    const button = screen.getByTestId('bookmark-button');

    await act(async () => {
      fireEvent.click(button);
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(button).toHaveTextContent('Bookmarked');

    await act(async () => {
      fireEvent.click(button);
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(button).toHaveTextContent('Bookmark');
  });
});

describe('BookmarksPage', () => {
  it('shows empty state when no bookmarks', async () => {
    render(<BookmarksPage />, { wrapper: RouterBookmarkWrapper });

    await settle();

    expect(screen.getByText('No bookmarks yet.')).toBeInTheDocument();
  });

  it('renders bookmarks list after adding', async () => {
    function TestComponent() {
      const { toggleBookmark, bookmarks } = useBookmarks();
      return (
        <div>
          <button
            data-testid="add-btn"
            onClick={() => toggleBookmark('React', 'English', 'gemini', 'flash')}
          >
            Add
          </button>
          <span data-testid="count">{bookmarks.length}</span>
          <BookmarksPage />
        </div>
      );
    }

    render(<TestComponent />, { wrapper: RouterBookmarkWrapper });
    await settle();

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-btn'));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('filters bookmarks by search', async () => {
    function TestComponent() {
      const { toggleBookmark } = useBookmarks();
      return (
        <div>
          <button
            data-testid="add-react"
            onClick={() => toggleBookmark('React', 'English', 'gemini', 'flash')}
          >
            Add React
          </button>
          <button
            data-testid="add-vue"
            onClick={() => toggleBookmark('Vue', 'English', 'gemini', 'flash')}
          >
            Add Vue
          </button>
          <BookmarksPage />
        </div>
      );
    }

    render(<TestComponent />, { wrapper: RouterBookmarkWrapper });
    await settle();

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-react'));
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-vue'));
      await new Promise((r) => setTimeout(r, 50));
    });

    // Both should be visible
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vue')).toBeInTheDocument();

    // Search for "react"
    const searchInput = screen.getByTestId('bookmarks-search');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'react' } });
    });

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.queryByText('Vue')).not.toBeInTheDocument();
  });

  it('removes bookmark from list', async () => {
    function TestComponent() {
      const { toggleBookmark } = useBookmarks();
      return (
        <div>
          <button
            data-testid="add-btn"
            onClick={() => toggleBookmark('React', 'English', 'gemini', 'flash')}
          >
            Add
          </button>
          <BookmarksPage />
        </div>
      );
    }

    render(<TestComponent />, { wrapper: RouterBookmarkWrapper });
    await settle();

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-btn'));
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByText('React')).toBeInTheDocument();

    const removeButton = screen.getByTestId('bookmark-remove-react');
    await act(async () => {
      fireEvent.click(removeButton);
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByText('No bookmarks yet.')).toBeInTheDocument();
  });
});
