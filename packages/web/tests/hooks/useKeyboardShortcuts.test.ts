import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, type KeyboardShortcutCallbacks } from '@/hooks/useKeyboardShortcuts';

function makeCallbacks(): KeyboardShortcutCallbacks {
  return {
    onFocusSearch: vi.fn(),
    onToggleBookmark: vi.fn(),
    onToggleHistory: vi.fn(),
    onToggleTheme: vi.fn(),
    onRandomTopic: vi.fn(),
    onTogglePalette: vi.fn(),
    onEscape: vi.fn(),
  };
}

function fireKey(
  key: string,
  opts: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcuts', () => {
  let callbacks: KeyboardShortcutCallbacks;

  beforeEach(() => {
    callbacks = makeCallbacks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onFocusSearch when "/" is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('/');
    expect(callbacks.onFocusSearch).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleBookmark when "b" is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('b');
    expect(callbacks.onToggleBookmark).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleHistory when "h" is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('h');
    expect(callbacks.onToggleHistory).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleTheme when "t" is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('t');
    expect(callbacks.onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('calls onRandomTopic when "r" is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('r');
    expect(callbacks.onRandomTopic).toHaveBeenCalledTimes(1);
  });

  it('calls onTogglePalette when Ctrl+K is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('k', { ctrlKey: true });
    expect(callbacks.onTogglePalette).toHaveBeenCalledTimes(1);
  });

  it('calls onTogglePalette when Cmd+K is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('k', { metaKey: true });
    expect(callbacks.onTogglePalette).toHaveBeenCalledTimes(1);
  });

  it('calls onEscape when Escape is pressed', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('Escape');
    expect(callbacks.onEscape).toHaveBeenCalledTimes(1);
  });

  it('calls window.history.back() on Alt+Left', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('ArrowLeft', { altKey: true });
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('calls window.history.forward() on Alt+Right', () => {
    const forwardSpy = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('ArrowRight', { altKey: true });
    expect(forwardSpy).toHaveBeenCalledTimes(1);
  });

  it('suppresses single-key shortcuts when an input is focused', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    // Create and focus an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireKey('b');
    fireKey('h');
    fireKey('t');
    fireKey('r');
    fireKey('/');

    expect(callbacks.onToggleBookmark).not.toHaveBeenCalled();
    expect(callbacks.onToggleHistory).not.toHaveBeenCalled();
    expect(callbacks.onToggleTheme).not.toHaveBeenCalled();
    expect(callbacks.onRandomTopic).not.toHaveBeenCalled();
    expect(callbacks.onFocusSearch).not.toHaveBeenCalled();

    // Clean up
    document.body.removeChild(input);
  });

  it('suppresses single-key shortcuts when a textarea is focused', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    fireKey('b');
    expect(callbacks.onToggleBookmark).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('suppresses single-key shortcuts when a contenteditable element is focused', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.tabIndex = 0; // Make focusable in jsdom
    document.body.appendChild(div);
    div.focus();

    fireKey('t');
    expect(callbacks.onToggleTheme).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it('still allows Ctrl+K when an input is focused', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireKey('k', { ctrlKey: true });
    expect(callbacks.onTogglePalette).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it('still allows Escape when an input is focused', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireKey('Escape');
    expect(callbacks.onEscape).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(callbacks));

    unmount();

    fireKey('b');
    expect(callbacks.onToggleBookmark).not.toHaveBeenCalled();
  });

  it('does not trigger single-key shortcuts when Ctrl is held', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('b', { ctrlKey: true });
    expect(callbacks.onToggleBookmark).not.toHaveBeenCalled();
  });

  it('does not trigger single-key shortcuts when Alt is held', () => {
    renderHook(() => useKeyboardShortcuts(callbacks));

    fireKey('b', { altKey: true });
    expect(callbacks.onToggleBookmark).not.toHaveBeenCalled();
  });
});
