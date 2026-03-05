import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-cinzel font-bold text-slate-100">
                  System Malfunction
                </h1>
                <p className="text-slate-400 text-sm">
                  The Council has encountered a critical error
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 max-h-48 overflow-auto">
              <p className="text-red-400 font-mono text-sm">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Reload System
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-all"
              >
                <Home className="w-5 h-5" />
                Return to Hub
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <details className="group">
                <summary className="flex items-center gap-2 text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                  <Bug className="w-4 h-4" />
                  <span className="text-sm">Technical Details</span>
                </summary>
                <div className="mt-3 text-xs font-mono text-slate-600 bg-slate-950 p-3 rounded-lg">
                  <p>Error Type: {this.state.error?.name}</p>
                  <p>Stack: {this.state.error?.stack?.slice(0, 200)}</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
