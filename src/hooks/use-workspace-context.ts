import { Team } from "@/types/team";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceStoreType {
  userId: string | null;
  teams: Team[];
  selectedTeam: Team | null;
  setTeams: (teams: Team[]) => void;
  setSelectedTeam: (team: Team | null) => void;
  selectTeamById: (teamId: string) => void;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceStoreType>()(
  persist(
    (set, get) => ({
      userId: null,
      teams: [],
      selectedTeam: null,

      setTeams: (teams) => set({ teams }),
      setSelectedTeam: (team) => set({ selectedTeam: team }),

      selectTeamById: (teamId) => {
        const team = get().teams.find((t) => t.id === teamId);
        if (team) {
          set({ selectedTeam: team });
        } else {
          console.warn(`Team with ID ${teamId} not found`);
        }
      },

      resetWorkspace: () => {
        set({
          userId: null,
          teams: [],
          selectedTeam: null,
        }, );
      },
    }),
    {
      name: `workspace-store`,
      partialize: (state) => ({ userId: state.userId }),
    }
  )
);
