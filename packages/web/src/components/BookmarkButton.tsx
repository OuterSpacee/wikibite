import React, { useCallback, useState } from 'react';
import { useBookmarks } from '../contexts/BookmarkContext';

interface BookmarkButtonProps {
  topic: string;
  language: string;
  provider: string;
  model: string;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ topic, language, provider, model }) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [toggling, setToggling] = useState(false);

  const bookmarked = isBookmarked(topic);

  const handleClick = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await toggleBookmark(topic, language, provider, model);
    } finally {
      setToggling(false);
    }
  }, [topic, language, provider, model, toggling, toggleBookmark]);

  return (
    <button
      onClick={handleClick}
      disabled={toggling}
      style={styles.button}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      data-testid="bookmark-button"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={bookmarked ? 'var(--accent-color)' : 'none'}
        stroke="var(--accent-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </button>
  );
};

export default BookmarkButton;

const styles: Record<string, React.CSSProperties> = {
  button: {
    background: 'transparent',
    color: 'var(--text-color)',
    border: '1px solid var(--border-color)',
    padding: '0.6rem 1.2rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'opacity 0.2s',
  },
};
