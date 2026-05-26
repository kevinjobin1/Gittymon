import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartSelectCluster } from './FloatingControls';

describe('StartSelectCluster (née StartSelectButtons)', () => {
  const defaultProps = {
    size: 'mobile' as const,
    pressedKeys: { START: false, SELECT: false },
    triggerButton: vi.fn(),
  };

  it('renders both START and SELECT pill buttons', () => {
    render(<StartSelectCluster {...defaultProps} />);
    expect(screen.getByLabelText('START button')).toBeInTheDocument();
    expect(screen.getByLabelText('SELECT button')).toBeInTheDocument();
  });

  it('renders START and SELECT labels (embossed)', () => {
    render(<StartSelectCluster {...defaultProps} />);
    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText('SELECT')).toBeInTheDocument();
  });

  it('calls triggerButton with "START" when START is clicked', () => {
    const triggerButton = vi.fn();
    render(<StartSelectCluster {...defaultProps} triggerButton={triggerButton} />);
    fireEvent.click(screen.getByLabelText('START button'));
    expect(triggerButton).toHaveBeenCalledWith('START', undefined);
  });

  it('calls triggerButton with "SELECT" when SELECT is clicked', () => {
    const triggerButton = vi.fn();
    render(<StartSelectCluster {...defaultProps} triggerButton={triggerButton} />);
    fireEvent.click(screen.getByLabelText('SELECT button'));
    expect(triggerButton).toHaveBeenCalledWith('SELECT', undefined);
  });

  it('passes onPressStart callback to triggerButton', () => {
    const onPressStart = vi.fn();
    const triggerButton = vi.fn();
    render(
      <StartSelectCluster
        {...defaultProps}
        triggerButton={triggerButton}
        onPressStart={onPressStart}
      />,
    );
    fireEvent.click(screen.getByLabelText('START button'));
    expect(triggerButton).toHaveBeenCalledWith('START', onPressStart);
  });

  it('passes onPressSelect callback to triggerButton', () => {
    const onPressSelect = vi.fn();
    const triggerButton = vi.fn();
    render(
      <StartSelectCluster
        {...defaultProps}
        triggerButton={triggerButton}
        onPressSelect={onPressSelect}
      />,
    );
    fireEvent.click(screen.getByLabelText('SELECT button'));
    expect(triggerButton).toHaveBeenCalledWith('SELECT', onPressSelect);
  });

  it('applies pressed state classes when START is pressed', () => {
    render(
      <StartSelectCluster
        {...defaultProps}
        pressedKeys={{ START: true, SELECT: false }}
      />,
    );
    const btn = screen.getByLabelText('START button');
    // Pressed state adds translate-y to simulate depression; shadow-inner is always present
    expect(btn.className).toContain('translate-y-[0.5px]');
  });

  it('applies pressed state classes when SELECT is pressed', () => {
    render(
      <StartSelectCluster
        {...defaultProps}
        pressedKeys={{ START: false, SELECT: true }}
      />,
    );
    const btn = screen.getByLabelText('SELECT button');
    expect(btn.className).toContain('translate-y-[0.5px]');
  });

  it('does not apply pressed depression when no buttons are pressed', () => {
    render(<StartSelectCluster {...defaultProps} />);
    expect(screen.getByLabelText('START button').className).not.toContain('translate-y-[0.5px]');
    expect(screen.getByLabelText('SELECT button').className).not.toContain('translate-y-[0.5px]');
  });

  it('does not throw when onPress callbacks are undefined', () => {
    const triggerButton = vi.fn();
    render(<StartSelectCluster {...defaultProps} triggerButton={triggerButton} />);
    expect(() => {
      fireEvent.click(screen.getByLabelText('START button'));
      fireEvent.click(screen.getByLabelText('SELECT button'));
    }).not.toThrow();
  });
});
