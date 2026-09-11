import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackSectionName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Forensic Workstation Uncaught Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReturnToDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '';
    window.dispatchEvent(new CustomEvent('cctv:navigate-tab', { detail: 'dashboard' }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-fallback" 
          className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/90 text-slate-100 min-h-[400px] w-full"
        >
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-100">Something went wrong</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                We couldn't load {this.props.fallbackSectionName ? `the ${this.props.fallbackSectionName} section` : 'this section'}. 
                An isolated client execution error occurred.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                onClick={this.handleReturnToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Return to Dashboard</span>
              </button>
            </div>

            {this.state.error && (
              <div className="pt-3 border-t border-white/10 text-left">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-300 font-mono py-1 cursor-pointer"
                >
                  <span>Technical Diagnostics</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {this.state.showDetails && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-rose-300/90 overflow-x-auto max-h-32">
                    {this.state.error.toString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
