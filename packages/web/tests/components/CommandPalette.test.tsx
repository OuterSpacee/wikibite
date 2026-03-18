import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import CommandPalette, { type CommandPaletteAction } from '@/components/CommandPalette';

function makeActions(): CommandPaletteAction[] {
  return [
    { id: 'theme', label: 'Toggle Theme', description: 'Switch light/dark', onSelect: vi.fn() },
    { id: 'language', label: 'Change Language', description: 'Select language', onSelect: vi.fn() },
    { id: 'provider', label: 'Switch Provider', description: 'Choose AI provider', onSelect: vi.fn() },
  ];
}

const recentTopics = ['React', 'JavaScript', 'TypeScript', 'Python'];

describe('CommandPalette', () => {
  let actions: CommandPaletteAction[];
  let onClose: ReturnType<typeof vi.fn>;
  let onSelectTopic: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    actions = makeActions();
    onClose = vi.fn();
    onSelectTopic = vi.fn();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <CommandPalette
        isOpen={false}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });

  it('renders the palette when isOpen is true', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette-input')).toBeInTheDocument();
  });

  it('displays all actions and recent topics when no query', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    expect(screen.getByText('Change Language')).toBeInTheDocument();
    expect(screen.getByText('Switch Provider')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('filters actions by query', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'theme' } });

    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    expect(screen.queryByText('Change Language')).not.toBeInTheDocument();
    expect(screen.queryByText('Switch Provider')).not.toBeInTheDocument();
  });

  it('filters recent topics by query', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'script' } });

    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });

  it('shows empty state when no results match', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'xyznonexistent' } });

    expect(screen.getByTestId('command-palette-empty')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    fireEvent.click(screen.getByTestId('command-palette-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed in the input', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const palette = screen.getByTestId('command-palette');
    fireEvent.keyDown(palette, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selects an action via Enter key', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const palette = screen.getByTestId('command-palette');

    // First item (Toggle Theme) should be selected by default
    fireEvent.keyDown(palette, { key: 'Enter' });

    expect(actions[0].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates with arrow keys and selects', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const palette = screen.getByTestId('command-palette');

    // Move down to second action (Change Language)
    fireEvent.keyDown(palette, { key: 'ArrowDown' });
    fireEvent.keyDown(palette, { key: 'Enter' });

    expect(actions[1].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selects a recent topic via click', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    fireEvent.click(screen.getByTestId('command-palette-topic-React'));

    expect(onSelectTopic).toHaveBeenCalledWith('React');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('selects an action via click', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    fireEvent.click(screen.getByTestId('command-palette-action-theme'));

    expect(actions[0].onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps around when navigating past the last item', () => {
    const shortActions = [actions[0]];
    const shortTopics = ['React'];

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={shortActions}
        recentTopics={shortTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const palette = screen.getByTestId('command-palette');

    // 2 items total: action + topic. Press down 2 times to wrap back to first
    fireEvent.keyDown(palette, { key: 'ArrowDown' }); // index 1 (topic)
    fireEvent.keyDown(palette, { key: 'ArrowDown' }); // index 0 (wrap)
    fireEvent.keyDown(palette, { key: 'Enter' });

    expect(shortActions[0].onSelect).toHaveBeenCalledTimes(1);
  });

  it('wraps around when navigating up from the first item', () => {
    const shortActions = [actions[0]];
    const shortTopics = ['React'];

    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={shortActions}
        recentTopics={shortTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const palette = screen.getByTestId('command-palette');

    // At index 0, press up to wrap to last item (index 1 = topic)
    fireEvent.keyDown(palette, { key: 'ArrowUp' });
    fireEvent.keyDown(palette, { key: 'Enter' });

    expect(onSelectTopic).toHaveBeenCalledWith('React');
  });

  it('filters by action description', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'light/dark' } });

    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    expect(screen.queryByText('Change Language')).not.toBeInTheDocument();
  });

  it('resets query and selection when reopened', async () => {
    const { rerender } = render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    // Type a query
    const input = screen.getByTestId('command-palette-input');
    fireEvent.change(input, { target: { value: 'theme' } });

    // Close
    rerender(
      <CommandPalette
        isOpen={false}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    // Reopen
    rerender(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={actions}
        recentTopics={recentTopics}
        onSelectTopic={onSelectTopic}
      />,
    );

    // Wait for the setTimeout in the useEffect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Query should be reset
    const newInput = screen.getByTestId('command-palette-input');
    expect(newInput).toHaveValue('');

    // All items should be visible
    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    expect(screen.getByText('Change Language')).toBeInTheDocument();
    expect(screen.getByText('Switch Provider')).toBeInTheDocument();
  });
});
