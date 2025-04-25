'use client';

import { SidebarGroup, SidebarGroupLabel } from '../ui/sidebar';
import TeamSwitcher from '@/components/teams/TeamSwitcher';
import { useWorkspaceStore } from '@/hooks/use-workspace-context';
import { formatBytes } from '@/lib/utils';

export function SidebarTeamSection() {
  const { selectedTeam } = useWorkspaceStore();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <TeamSwitcher />
      {selectedTeam && (
        <div className="px-2 py-1 space-y-1">
          <p className="text-xs text-sidebar-foreground/70">
            {selectedTeam.members?.length || 0} members
          </p>
        </div>
      )}
    </SidebarGroup>
  );
}
