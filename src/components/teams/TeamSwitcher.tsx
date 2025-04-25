'use client';

import * as React from 'react';
import { SortDesc, CheckIcon, PlusCircleIcon, AxeIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePathname, useRouter } from 'next/navigation';
import { TeamCreateModal } from './TeamCreateModal';

import { Team } from '@/types/team';
import { JoinTeamDialog } from './JoinTeamDialog';
import { useWorkspaceStore } from '@/hooks/use-workspace-context';
import { useTeams } from '@/context/TeamsContext';
import { Skeleton } from '../ui/skeleton';

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface TeamSwitcherProps extends PopoverTriggerProps {
  className?: string;
}

export default function TeamSwitcher({}: TeamSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [showJoinDialog, setShowJoinDialog] = React.useState(false);

  const { teams, selectedTeam, setSelectedTeam } = useWorkspaceStore();
  const router = useRouter();
  const { isLoading } = useTeams();
  const redirectUser = (teamId: string) => {
    const partPathnames = pathname.split('/');

    if (partPathnames[1] === 'teams') {
      router.push(`/teams/${teamId}/${partPathnames[3] ?? ''}`);
    } else {
      router.push(`/dashboard`);
    }
  };
  const handleTeamSelect = (team: Team | null) => {
    if (team) {
      setSelectedTeam(team);
      redirectUser(team.id);
    } else {
      setSelectedTeam(null);
      router.replace('/dashboard');
    }
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a team"
            className="w-full justify-between px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={`https://avatar.vercel.sh/${
                    selectedTeam?.name || 'personal'
                  }.png`}
                  alt={selectedTeam?.name || 'personal'}
                />
                <AvatarFallback className="text-xs">
                  {selectedTeam?.name?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selectedTeam?.name || 'Personal'}
              </span>
            </div>
            <SortDesc className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search workspace..." />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup heading="Personal">
                <CommandItem
                  onSelect={() => handleTeamSelect(null)}
                  className="text-sm"
                >
                  <Avatar className="mr-2 h-4 w-4">
                    <AvatarImage
                      src={`https://avatar.vercel.sh/personal.png`}
                      alt="Personal"
                    />
                    <AvatarFallback>P</AvatarFallback>
                  </Avatar>
                  Personal Workspace
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      !selectedTeam ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Teams">
                {isLoading ? (
                  <div className="px-3 py-1.5 space-y-2">
                    <span className="text-xs">Teams</span>
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index + '-team-loader'}
                        className="flex items-center"
                      >
                        <div className="h-4 w-4 mr-2">
                          <Skeleton className="aspect-square h-full w-full rounded-full mr-2" />
                        </div>
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  teams?.map((team) => (
                    <CommandItem
                      key={team.id}
                      onSelect={() => handleTeamSelect(team)}
                      className="text-sm"
                    >
                      <Avatar className="mr-2 h-4 w-4">
                        <AvatarImage
                          src={`https://avatar.vercel.sh/${
                            team.name || 'unknown'
                          }.png`}
                          alt={team.name || 'Unknown team'}
                        />
                        <AvatarFallback>{team.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      {team.name}
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          selectedTeam?.id === team.id
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowNewTeamDialog(true);
                  }}
                >
                  <PlusCircleIcon className="mr-2 h-4 w-4" />
                  Create Team
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowJoinDialog(true);
                  }}
                >
                  <AxeIcon className="mr-2 h-4 w-4" />
                  Join Team
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <TeamCreateModal
        isOpen={showNewTeamDialog}
        onClose={() => setShowNewTeamDialog(false)}
      />
      <JoinTeamDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />
      <JoinTeamDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />
    </>
  );
}
