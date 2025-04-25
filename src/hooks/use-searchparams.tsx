'use client';

import { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

// This is a wrapper component that uses useSearchParams safely
export function SearchParamsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  );
}

// A custom hook that wraps useSearchParams
export function useSearchParamsWithSuspense() {
  const searchParams = useSearchParams();
  
  // Create a helper function to get a param with a default value
  const getParam = useCallback((param: string, defaultValue: string | null = null) => {
    return searchParams.get(param) || defaultValue;
  }, [searchParams]);
  
  return {
    searchParams,
    getParam
  };
} 