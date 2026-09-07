import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X, ArrowLeft, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('AdminErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleClose = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div 
          id="admin-error-boundary-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto"
        >
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Admin panel təhlükəsizlik rejimi</h3>
                  <p className="text-xs text-slate-400">Yüklənmə zamanı xəta aşkarlandı</p>
                </div>
              </div>
              <button
                type="button"
                onClick={this.handleClose}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Bağla"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Xəta təfərrüatı:</span>
              </div>
              <p className="text-xs text-rose-200 font-mono break-words leading-relaxed">
                {this.state.error?.message || 'Bilinməyən render xətası baş verdi.'}
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tətbiqin əsas vitrin hissəsi normal işləyir. Aşağıdakı düymələrlə admin paneli yenidən yükləyə və ya əsas səhifəyə qayıda bilərsiniz.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Yenidən cəhd et</span>
              </button>
              
              <button
                type="button"
                onClick={this.handleClose}
                className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700 active:scale-98"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Vitrinə qayıt</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-3.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-800"
                title="Səhifəni yenilə"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Yenilə</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
