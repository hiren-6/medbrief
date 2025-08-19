import React, { Suspense, lazy } from 'react';

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const LazySection: React.FC<LazySectionProps> = ({ 
  children, 
  fallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-full bg-blue-400 h-4 w-4"></div>
        <div className="rounded-full bg-teal-400 h-4 w-4"></div>
        <div className="rounded-full bg-blue-400 h-4 w-4"></div>
      </div>
    </div>
  )
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export default LazySection;