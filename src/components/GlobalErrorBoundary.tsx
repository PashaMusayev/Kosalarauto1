import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertOctagon } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Global Application Error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-white">Kosalar Auto</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tətbiq yüklənərkən xəta baş verdi. Səhifəni yeniləyərək yenidən yoxlayın.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left text-[11px] font-mono text-slate-400 max-h-32 overflow-y-auto">
              {this.state.error?.message || 'Xəta məlumatı əlçatan deyil'}
            </div>
            <button
              onClick={this.handleReload}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Səhifəni Yenilə</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
