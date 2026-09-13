import { ReactNode, Component, ErrorInfo } from 'react';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../../data/transits';
import whatsappLogo from '../../pics/whatsapp logo.png';
import { trackWhatsAppClick } from '../../services/analyticsService';

interface ErrorBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
  carTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DetailModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TransitDetailModal Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
          onClick={this.props.onClose}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                {this.props.carTitle || 'Avtomobil məlumatları yüklənir'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Məlumatlar göstərilərkən kiçik uyğunsuzluq yarandı. Birbaşa əlaqə saxlayaraq ətraflı məlumat ala bilərsiniz.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Salam! Kosalar Auto avtomobili haqqında məlumat almaq istəyirəm.')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick()}
                className="w-full sm:flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow transition-all"
              >
                <img src={whatsappLogo} alt="WhatsApp" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                <span>WhatsApp ilə Əlaqə</span>
              </a>

              <button
                type="button"
                onClick={this.props.onClose}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-colors"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
