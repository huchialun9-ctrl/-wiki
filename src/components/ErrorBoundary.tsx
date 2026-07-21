import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold text-sm">⚠️ 渲染發生錯誤，請重新分析</p>
          <p className="text-red-400 dark:text-red-500 text-xs mt-1">{this.state.error?.message}</p>
          <button
            className="mt-3 px-4 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
