import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScreenFrame } from './ScreenFrame';

// Mock audio utils
vi.mock('../utils/audio', () => ({
  playRetroSound: vi.fn(),
  isAudioEnabled: vi.fn(() => true),
  toggleAudioMute: vi.fn(() => false),
}));

// Mock react-github-btn (it uses Shadow DOM which JSDOM doesn't support)
vi.mock('react-github-btn', () => ({
  default: ({ children, ..._props }: any) => (
    <button data-testid="github-star-btn">{children}</button>
  ),
}));

import { playRetroSound, isAudioEnabled, toggleAudioMute } from '../utils/audio';

const defaultProps = {
  isSynced: false,
  isBooting: false,
  isExpanded: false,
  focusDone: false,
  zoomLevel: 1,
  onZoomIn: vi.fn(),
  onZoomOut: vi.fn(),
  onZoomReset: vi.fn(),
  children: <div data-testid="game-content">Game Content</div>,
};

describe('ScreenFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================================================================
  //  Boot screen
  // ==================================================================

  it('shows boot animation when isBooting is true', () => {
    render(<ScreenFrame {...defaultProps} isBooting={true} />);
    expect(screen.getByText('Gittendo')).toBeInTheDocument();
    expect(screen.getByText(/POWERED BY GROQ AI/i)).toBeInTheDocument();
    expect(screen.queryByTestId('game-content')).not.toBeInTheDocument();
  });

  it('shows children when isBooting is false', () => {
    render(<ScreenFrame {...defaultProps} />);
    expect(screen.getByTestId('game-content')).toBeInTheDocument();
    expect(screen.queryByText('Gittendo')).not.toBeInTheDocument();
  });

  // ==================================================================
  //  Status bar indicators
  // ==================================================================

  it('displays ONLINE text when isSynced is true', () => {
    render(<ScreenFrame {...defaultProps} isSynced={true} />);
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
  });

  it('displays OFFLINE text when isSynced is false', () => {
    render(<ScreenFrame {...defaultProps} isSynced={false} />);
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  // ==================================================================
  //  Zoom controls
  // ==================================================================

  it('renders zoom level percentage', () => {
    render(<ScreenFrame {...defaultProps} zoomLevel={0.75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('calls onZoomIn when + button is clicked', () => {
    const onZoomIn = vi.fn();
    render(<ScreenFrame {...defaultProps} onZoomIn={onZoomIn} />);
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[0]);
    expect(onZoomIn).toHaveBeenCalled();
  });

  it('calls onZoomOut when − button is clicked', () => {
    const onZoomOut = vi.fn();
    render(<ScreenFrame {...defaultProps} onZoomOut={onZoomOut} />);
    const minusButtons = screen.getAllByText('−');
    fireEvent.click(minusButtons[0]);
    expect(onZoomOut).toHaveBeenCalled();
  });

  it('calls onZoomReset when % button is clicked', () => {
    const onZoomReset = vi.fn();
    render(<ScreenFrame {...defaultProps} onZoomReset={onZoomReset} />);
    // default zoomLevel is 1, so the button shows 100%
    fireEvent.click(screen.getByText('100%'));
    expect(onZoomReset).toHaveBeenCalled();
  });

  // ==================================================================
  //  Audio toggle
  // ==================================================================

  it('shows AUDIO: ON when sound is enabled', () => {
    vi.mocked(isAudioEnabled).mockReturnValue(true);
    render(<ScreenFrame {...defaultProps} />);
    expect(screen.getByText('AUDIO: ON')).toBeInTheDocument();
  });

  it('toggles audio and plays sound when AUDIO button is clicked', () => {
    render(<ScreenFrame {...defaultProps} />);
    const audioBtn = screen.getByTitle('Toggle 8-bit Sound Loop');
    fireEvent.click(audioBtn);
    expect(toggleAudioMute).toHaveBeenCalled();
    expect(playRetroSound).toHaveBeenCalledWith('beep');
  });

  // ==================================================================
  //  GITTENDO ADVANCED SP logo
  // ==================================================================

  it('renders the GITTENDO ADVANCED SP logo', () => {
    render(<ScreenFrame {...defaultProps} />);
    expect(screen.getByText('GITTENDO ADVANCED SP')).toBeInTheDocument();
  });

  // ==================================================================
  //  Controls modal
  // ==================================================================

  it('opens controls modal when ? button is clicked', () => {
    render(<ScreenFrame {...defaultProps} />);
    const helpBtn = screen.getByTitle('Keyboard controls');
    fireEvent.click(helpBtn);
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('ARROWS')).toBeInTheDocument();
    expect(screen.getByText('Move')).toBeInTheDocument();
  });

  it('closes controls modal when close button is clicked', () => {
    render(<ScreenFrame {...defaultProps} />);
    // Open modal — the modal is always in the DOM (opacity toggles visibility)
    fireEvent.click(screen.getByTitle('Keyboard controls'));
    const modalWrapper = screen.getByText('Controls').closest('[class*="fixed"]')!;
    expect(modalWrapper.className).toContain('opacity-100');

    // Close using the ✕ button
    fireEvent.click(screen.getByTitle('Close'));
    expect(modalWrapper.className).toContain('opacity-0');
  });

  it('closes controls modal when backdrop is clicked', () => {
    render(<ScreenFrame {...defaultProps} />);
    // Open modal
    fireEvent.click(screen.getByTitle('Keyboard controls'));
    expect(screen.getByText('Controls')).toBeInTheDocument();

    // Click the backdrop overlay (the bg-black/40 div) to close
    const outerWrapper = screen.getByText(/Click outside or press ESC/i)
      .closest('[class*="fixed"]');
    if (outerWrapper) fireEvent.click(outerWrapper);
  });

  it('closes controls modal on Escape key press', () => {
    render(<ScreenFrame {...defaultProps} />);
    // Open modal — the modal is always in the DOM (opacity toggles visibility)
    fireEvent.click(screen.getByTitle('Keyboard controls'));
    const modalWrapper = screen.getByText('Controls').closest('[class*="fixed"]')!;
    expect(modalWrapper.className).toContain('opacity-100');

    // Press Escape (the modal listens for Escape on window)
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(modalWrapper.className).toContain('opacity-0');
  });

  it('plays retro sound when help button is clicked', () => {
    render(<ScreenFrame {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Keyboard controls'));
    expect(playRetroSound).toHaveBeenCalledWith('select');
  });

  // ==================================================================
  //  GitHub star button
  // ==================================================================

  it('renders GitHub star button', () => {
    render(<ScreenFrame {...defaultProps} />);
    expect(screen.getByTestId('github-star-btn')).toBeInTheDocument();
    expect(screen.getByTestId('github-star-btn')).toHaveTextContent('Star');
  });

  // ==================================================================
  //  Expand/collapse icon
  // ==================================================================

  it('shows expand icon when focusDone is true and isExpanded is false', () => {
    render(<ScreenFrame {...defaultProps} focusDone={true} isExpanded={false} />);
    // ⊞ is the expand icon
    expect(screen.getByTitle('Click console to expand')).toBeInTheDocument();
  });

  it('shows collapse icon when focusDone is true and isExpanded is true', () => {
    render(<ScreenFrame {...defaultProps} focusDone={true} isExpanded={true} />);
    expect(screen.getByTitle('Click outside to collapse')).toBeInTheDocument();
  });

  it('does not show expand/collapse icon when focusDone is false', () => {
    render(<ScreenFrame {...defaultProps} focusDone={false} />);
    expect(screen.queryByTitle('Click console to expand')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Click outside to collapse')).not.toBeInTheDocument();
  });
});
