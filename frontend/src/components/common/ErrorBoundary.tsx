import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Error Boundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Error occurred</div>;
    }
    return this.props.children;
  }
}