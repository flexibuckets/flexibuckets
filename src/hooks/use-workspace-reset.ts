"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspaceStore } from './use-workspace-context';

export function useWorkspaceReset() {
  const { data: session } = useSession();
  const resetWorkspace = useWorkspaceStore((state) => state.resetWorkspace);

  useEffect(() => {
    if (!session) {
      resetWorkspace();
    }
  }, [session, resetWorkspace]);
} 