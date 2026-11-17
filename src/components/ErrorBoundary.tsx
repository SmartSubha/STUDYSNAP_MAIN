import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('StudySnap ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCacheAndReload = async () => {
    try {
      // Clear only local browser caches/session keys — never alters Firestore user data
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('cached_') || k.startsWith('profile_') || k === 'custom_auth_user') {
          localStorage.removeItem(k);
        }
      });
    } catch {
      // Ignore cleanup errors
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-3xl font-black">
              !
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                StudySnap Recovery Screen
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                A temporary display error occurred. Your account and saved study data in the cloud are completely safe.
              </p>
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Reload StudySnap
              </button>
              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Clear Local Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
