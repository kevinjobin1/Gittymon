import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartSelectButtons } from './StartSelectButtons';

describe('StartSelectButtons', () => {
  const defaultProps = {
    pressedKeys: { START: false, SELECT: false },
    triggerButton: vi.fn(),
  };

  it('renders both START and SELECT pill buttons', () => {
    render(<StartSelectButtons {...defaultProps} />);
    expect(screen.getByLabelText('Start button')).toBeInTheDocument();
    expect(screen.getByLabelText('Select button')).toBeInTheDocument();
  });

  it('renders START and SELECT labels underneath', () => {
    render(<StartSelectButtons {...defaultProps} />);
    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText('SELECT')).toBeInTheDocument();
  });

  it('calls triggerButton with "START" when START is clicked', () => {
    const triggerButton = vi.fn();
    render(<StartSelectButtons {...defaultProps} triggerButton={triggerButton} />);
    fireEvent.click(screen.getByLabelText('Start button'));
    expect(triggerButton).toHaveBeenCalledWith('START', undefined);
  });

  it('calls triggerButton with "SELECT" when SELECT is clicked', () => {
    const triggerButton = vi.fn();
    render(<StartSelectButtons {...defaultProps} triggerButton={triggerButton} />);
    fireEvent.click(screen.getByLabelText('Select button'));
    expect(triggerButton).toHaveBeenCalledWith('SELECT', undefined);
  });

  it('passes onPressStart callback to triggerButton', () => {
    const onPressStart = vi.fn();
    const triggerButton = vi.fn();
    render(
      <StartSelectButtons
        {...defaultProps}
        triggerButton={triggerButton}
        onPressStart={onPressStart}
      />,
    );
    fireEvent.click(screen.getByLabelText('Start button'));
    expect(triggerButton).toHaveBeenCalledWith('START', onPressStart);
  });

  it('passes onPressSelect callback to triggerButton', () => {
    const onPressSelect = vi.fn();
    const triggerButton = vi.fn();
    render(
      <StartSelectButtons
        {...defaultProps}
        triggerButton={triggerButton}
        onPressSelect={onPressSelect}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select button'));
    expect(triggerButton).toHaveBeenCalledWith('SELECT', onPressSelect);
  });

  it('applies pressed state classes when START is pressed', () => {
    render(
      <StartSelectButtons
        {...defaultProps}
        pressedKeys={{ START: true, SELECT: false }}
      />,
    );
    const btn = screen.getByLabelText('Start button');
    expect(btn.className).toContain('shadow-inner');
  });

  it('applies pressed state classes when SELECT is pressed', () => {
    render(
      <StartSelectButtons
        {...defaultProps}
        pressedKeys={{ START: false, SELECT: true }}
      />,
    );
    const btn = screen.getByLabelText('Select button');
    expect(btn.className).toContain('shadow-inner');
  });

  it('does not apply pressed classes when no buttons are pressed', () => {
    render(<StartSelectButtons {...defaultProps} />);
    expect(screen.getByLabelText('Start button').className).not.toContain('shadow-inner');
    expect(screen.getByLabelText('Select button').className).not.toContain('shadow-inner');
  });

  it('does not throw when onPress callbacks are undefined', () => {
    const triggerButton = vi.fn();
    render(<StartSelectButtons {...defaultProps} triggerButton={triggerButton} />);
    expect(() => {
      fireEvent.click(screen.getByLabelText('Start button'));
      fireEvent.click(screen.getByLabelText('Select button'));
    }).not.toThrow();
  });
});
