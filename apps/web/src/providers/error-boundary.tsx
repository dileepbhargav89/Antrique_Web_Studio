'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

interface GlobalErrorBoundaryState {
  hasError: boolean;
}

/**
 * React only supports error boundaries as class components — there is no
 * hook equivalent. Catches render-time errors anywhere below it in the
 * tree; does NOT catch errors in event handlers or async code (those are
 * normal try/catch's job). Plain markup only, no shadcn — this phase is
 * infra-only, not a design system.
 */
export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  override state: GlobalErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlobalErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('GlobalErrorBoundary caught an error', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Something went wrong.</h1>
          <p>Please refresh the page and try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
