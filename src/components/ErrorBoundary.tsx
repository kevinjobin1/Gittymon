import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. If omitted, shows the GBA cartridge error screen. */
  fallback?: ReactNode;
  /** Called with the error for external reporting */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches rendering errors and shows a Game Boy "cartridge error" screen
 * instead of crashing the entire console.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    // Also log it
    console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // GBA cartridge error screen
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#e2dfde] text-[#1a1a1a] font-mono p-8">
          <div className="border-4 border-[#1a1a1a] bg-white p-6 max-w-md w-full shadow-[4px_4px_0px_#1a1a1a]">
            {/* Title bar */}
            <div className="border-b-2 border-[#1a1a1a] pb-2 mb-4 text-center">
              <span className="text-[8px] font-bold tracking-widest">⚠ GITTYMON ERROR ⚠</span>
            </div>

            {/* Cartridge icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-2 border-[#1a1a1a] bg-[#e2dfde] flex items-center justify-center rotate-45">
                <div className="w-6 h-6 border-2 border-[#7f001c] flex items-center justify-center">
                  <span className="text-[10px] font-black text-[#7f001c] -rotate-45">!</span>
                </div>
              </div>
            </div>

            {/* Error message */}
            <div className="text-center mb-4">
              <p className="text-[10px] font-bold mb-2 uppercase tracking-wide">Cartridge Error</p>
              <p className="text-[8px] text-gray-500 leading-relaxed">
                The game card could not be read.<br />
                Please remove and reinsert the cartridge.
              </p>
            </div>

            {/* Error details (collapsed) */}
            <details className="mt-3 group">
              <summary className="text-[7px] text-gray-400 cursor-pointer hover:text-[#7f001c] transition-colors">
                ▼ Technical Log
              </summary>
              <pre className="mt-2 p-2 bg-[#f5f5f5] border border-[#1a1a1a] text-[6px] text-[#7f001c] overflow-x-auto max-h-24 overflow-y-auto">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </details>

            {/* Recovery hint */}
            <div className="mt-4 pt-3 border-t border-gray-300 text-center">
              <p className="text-[7px] text-gray-400">
                Press <span className="text-[#1a1a1a] font-bold">F5</span> to reset the console
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-1.5 border-2 border-[#1a1a1a] bg-[#7f001c] text-white text-[9px] font-bold shadow-[2px_2px_0px_#1a1a1a] hover:bg-[#a30024] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
