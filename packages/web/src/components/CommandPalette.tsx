import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface CommandPaletteAction {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
  recentTopics: string[];
  onSelectTopic: (topic: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  actions,
  recentTopics,
  onSelectTopic,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build a combined list of filterable items
  const filteredActions = query
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(query.toLowerCase())),
      )
    : actions;

  const filteredTopics = query
    ? recentTopics.filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    : recentTopics;

  // Total selectable items: actions first, then topics
  const totalItems = filteredActions.length + filteredTopics.length;

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input on next tick so the modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selectedIndex when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (index: number) => {
      if (index < filteredActions.length) {
        filteredActions[index].onSelect();
        onClose();
      } else {
        const topicIndex = index - filteredActions.length;
        if (topicIndex < filteredTopics.length) {
          onSelectTopic(filteredTopics[topicIndex]);
          onClose();
        }
      }
    },
    [filteredActions, filteredTopics, onClose, onSelectTopic],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(totalItems, 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (totalItems > 0) {
            handleSelect(selectedIndex);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [totalItems, selectedIndex, handleSelect, onClose],
  );

  if (!isOpen) return null;

  let itemIndex = 0;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        data-testid="command-palette-backdrop"
        onClick={onClose}
        style={styles.backdrop}
      />

      {/* Palette container */}
      <div
        data-testid="command-palette"
        role="dialog"
        aria-label="Command palette"
        style={styles.container}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <input
          ref={inputRef}
          data-testid="command-palette-input"
          type="text"
          placeholder="Search topics or actions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
          aria-label="Command palette search"
        />

        {/* Results list */}
        <div ref={listRef} style={styles.list}>
          {/* Quick Actions section */}
          {filteredActions.length > 0 && (
            <>
              <div style={styles.sectionHeader}>Actions</div>
              {filteredActions.map((action) => {
                const thisIndex = itemIndex++;
                return (
                  <div
                    key={action.id}
                    data-testid={`command-palette-action-${action.id}`}
                    data-selected={thisIndex === selectedIndex ? 'true' : 'false'}
                    onClick={() => handleSelect(thisIndex)}
                    style={{
                      ...styles.item,
                      ...(thisIndex === selectedIndex ? styles.itemSelected : {}),
                    }}
                    role="option"
                    aria-selected={thisIndex === selectedIndex}
                  >
                    <span style={styles.itemLabel}>{action.label}</span>
                    {action.description && (
                      <span style={styles.itemDescription}>{action.description}</span>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Recent Topics section */}
          {filteredTopics.length > 0 && (
            <>
              <div style={styles.sectionHeader}>Recent Topics</div>
              {filteredTopics.map((topic) => {
                const thisIndex = itemIndex++;
                return (
                  <div
                    key={topic}
                    data-testid={`command-palette-topic-${topic}`}
                    data-selected={thisIndex === selectedIndex ? 'true' : 'false'}
                    onClick={() => handleSelect(thisIndex)}
                    style={{
                      ...styles.item,
                      ...(thisIndex === selectedIndex ? styles.itemSelected : {}),
                    }}
                    role="option"
                    aria-selected={thisIndex === selectedIndex}
                  >
                    <span style={styles.itemLabel}>{topic}</span>
                  </div>
                );
              })}
            </>
          )}

          {/* Empty state */}
          {totalItems === 0 && query && (
            <div style={styles.emptyState} data-testid="command-palette-empty">
              No results found for "{query}"
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={styles.footer}>
          <span style={styles.footerKey}>Up/Down</span> navigate
          <span style={{ ...styles.footerKey, marginLeft: '0.75rem' }}>Enter</span> select
          <span style={{ ...styles.footerKey, marginLeft: '0.75rem' }}>Esc</span> close
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
  },
  container: {
    position: 'fixed',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '500px',
    backgroundColor: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    zIndex: 2001,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '60vh',
    overflow: 'hidden',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'transparent',
    color: 'var(--text-color)',
    outline: 'none',
    boxSizing: 'border-box',
  },
  list: {
    overflowY: 'auto',
    flex: 1,
    padding: '0.25rem 0',
  },
  sectionHeader: {
    padding: '0.5rem 1rem 0.25rem',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--secondary-text-color)',
  },
  item: {
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.1s',
  },
  itemSelected: {
    backgroundColor: 'var(--accent-color)',
    color: '#fff',
  },
  itemLabel: {
    fontSize: '0.9rem',
  },
  itemDescription: {
    fontSize: '0.75rem',
    opacity: 0.7,
    marginLeft: 'auto',
  },
  emptyState: {
    padding: '1.5rem 1rem',
    textAlign: 'center' as const,
    color: 'var(--secondary-text-color)',
    fontSize: '0.9rem',
  },
  footer: {
    padding: '0.5rem 1rem',
    borderTop: '1px solid var(--border-color)',
    fontSize: '0.7rem',
    color: 'var(--secondary-text-color)',
    display: 'flex',
    alignItems: 'center',
  },
  footerKey: {
    display: 'inline-block',
    padding: '0.1rem 0.3rem',
    border: '1px solid var(--border-color)',
    borderRadius: '3px',
    fontSize: '0.65rem',
    marginRight: '0.25rem',
    backgroundColor: 'var(--bg-color)',
  },
};

export default CommandPalette;
