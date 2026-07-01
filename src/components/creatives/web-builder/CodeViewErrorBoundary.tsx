/**
 * CodeViewErrorBoundary — extracted from WebBuilder.tsx (Pass 5).
 *
 * Catches render-time crashes in the code/split view panels and offers
 * Retry / Switch-to-Canvas actions.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onFallbackClick?: () => void;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class CodeViewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WebBuilder] Code view crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0d1117] rounded-lg border border-white/10">
          <div className="text-center max-w-sm p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Code Editor failed to load
            </h3>
            <p className="text-sm text-white/50 mb-4">
              {this.state.errorMsg || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, errorMsg: '' })}
                className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
              >
                Retry
              </button>
              {this.props.onFallbackClick && (
                <button
                  onClick={this.props.onFallbackClick}
                  className="px-4 py-2 text-sm bg-primary/80 hover:bg-primary text-white rounded-md transition-colors"
                >
                  Switch to Canvas
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
