import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutCallbacks {
  onFocusSearch: () => void;
  onToggleBookmark: () => void;
  onToggleHistory: () => void;
  onToggleTheme: () => void;
  onRandomTopic: () => void;
  onTogglePalette: () => void;
  onEscape: () => void;
}

/**
 * Returns true when the currently focused element is a text input,
 * textarea, or contenteditable node -- meaning single-key shortcuts
 * (like "b", "h", "t", "r", "/") should be suppressed so the user
 * can type freely.
 */
function isEditableElement(): boolean {
  const el = document.activeElement;
  if (!el) return false;

  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  if ((el as HTMLElement).isContentEditable || (el as HTMLElement).contentEditable === 'true') return true;

  return false;
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+K / Cmd+K -> toggle command palette (always active)
      if (isCtrlOrCmd && key.toLowerCase() === 'k') {
        e.preventDefault();
        callbacks.onTogglePalette();
        return;
      }

      // Escape -> close modals (always active)
      if (key === 'Escape') {
        callbacks.onEscape();
        return;
      }

      // Alt+Left -> browser back
      if (e.altKey && key === 'ArrowLeft') {
        e.preventDefault();
        window.history.back();
        return;
      }

      // Alt+Right -> browser forward
      if (e.altKey && key === 'ArrowRight') {
        e.preventDefault();
        window.history.forward();
        return;
      }

      // Single-key shortcuts: skip when focused on editable elements
      if (isEditableElement()) return;

      // Also skip when modifier keys are held (except for the combos handled above)
      if (isCtrlOrCmd || e.altKey) return;

      switch (key) {
        case '/':
          e.preventDefault();
          callbacks.onFocusSearch();
          break;
        case 'b':
          callbacks.onToggleBookmark();
          break;
        case 'h':
          callbacks.onToggleHistory();
          break;
        case 't':
          callbacks.onToggleTheme();
          break;
        case 'r':
          callbacks.onRandomTopic();
          break;
      }
    },
    [callbacks],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
