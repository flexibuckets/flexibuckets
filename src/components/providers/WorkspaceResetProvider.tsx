"use client";

import { useWorkspaceReset } from "@/hooks/use-workspace-reset";

export function WorkspaceResetProvider({ children }: { children: React.ReactNode }) {
  useWorkspaceReset();
  return <>{children}</>;
} 
