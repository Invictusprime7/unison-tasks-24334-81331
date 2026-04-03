import React, { ReactNode } from 'react';
import { TemplateErrorBoundary } from '../components/TemplateErrorBoundary';

// HOC wrapper for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <TemplateErrorBoundary>
      <Component {...props} />
    </TemplateErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};