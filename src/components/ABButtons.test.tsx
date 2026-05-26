import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ABButtons } from './ABButtons';

describe('ABButtons', () => {
  const defaultProps = {
    pressedKeys: { A: false, B: false },
    triggerButton: vi.fn(),
  };

  it('renders both A and B buttons', () => {
    render(<ABButtons {...defaultProps} />);
    expect(screen.getByLabelText('Button A')).toBeInTheDocument();
    expect(screen.getByLabelText('Button B')).toBeInTheDocument();
  });

  it('renders button labels A and B', () => {
    render(<ABButtons {...defaultProps} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('calls triggerButton with "A" when A is clicked', () => {
    const triggerButton = vi.fn();
    render(<ABButtons {...defaultProps} triggerButton={triggerButton} />);
    fireEvent.click(screen.getByLabelText('Button A'));
    expect(triggerButton).toHaveBeenCalledWith('A', undefined);
  });

  it('calls triggerButton with "B" when B is clicked', () => {
    const triggerButton = vi.fn();
    render(<ABButtons {...defaultProps} triggerButton={triggerButton} />);
    fireEvent.click(screen.getByLabelText('Button B'));
    expect(triggerButton).toHaveBeenCalledWith('B', undefined);
  });

  it('passes onPressA callback to triggerButton when A is clicked', () => {
    const onPressA = vi.fn();
    const triggerButton = vi.fn();
    render(<ABButtons {...defaultProps} triggerButton={triggerButton} onPressA={onPressA} />);
    fireEvent.click(screen.getByLabelText('Button A'));
    expect(triggerButton).toHaveBeenCalledWith('A', onPressA);
  });

  it('passes onPressB callback to triggerButton when B is clicked', () => {
    const onPressB = vi.fn();
    const triggerButton = vi.fn();
    render(<ABButtons {...defaultProps} triggerButton={triggerButton} onPressB={onPressB} />);
    fireEvent.click(screen.getByLabelText('Button B'));
    expect(triggerButton).toHaveBeenCalledWith('B', onPressB);
  });

  it('applies pressed state classes when A is pressed', () => {
    render(
      <ABButtons {...defaultProps} pressedKeys={{ A: true, B: false }} />,
    );
    const btnA = screen.getByLabelText('Button A');
    expect(btnA.className).toContain('scale-90');
    expect(btnA.className).toContain('shadow-inner');
  });

  it('applies pressed state classes when B is pressed', () => {
    render(
      <ABButtons {...defaultProps} pressedKeys={{ A: false, B: true }} />,
    );
    const btnB = screen.getByLabelText('Button B');
    expect(btnB.className).toContain('scale-90');
    expect(btnB.className).toContain('shadow-inner');
  });

  it('does not apply pressed classes when no buttons are pressed', () => {
    render(<ABButtons {...defaultProps} />);
    const btnA = screen.getByLabelText('Button A');
    const btnB = screen.getByLabelText('Button B');
    expect(btnA.className).not.toContain('scale-90');
    expect(btnB.className).not.toContain('scale-90');
  });

  it('does not throw when onPress callbacks are undefined', () => {
    const triggerButton = vi.fn();
    render(<ABButtons {...defaultProps} triggerButton={triggerButton} />);
    expect(() => {
      fireEvent.click(screen.getByLabelText('Button A'));
      fireEvent.click(screen.getByLabelText('Button B'));
    }).not.toThrow();
  });
});
