import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  shareFolder,
  isAllowedToShare,
  isTeamSharingAllowed,
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import {
  ShareVariables,
  ShareResponse,
  ShareMutation,
} from '@/lib/types/share';

export function useShareFolder({
  updateDownloadUrl,
}: {
  updateDownloadUrl: (shortUrl: string) => void;
}): ShareMutation {
  const { toast } = useToast();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation<ShareResponse, Error, ShareVariables>({
    mutationFn: async ({ id, expiresAt, teamId, fileSize }) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      if (teamId) {
        // Check team sharing permissions and limits
        // const canShare = await canShareTeamFile(session.user.id, id, teamId);
        // if (!canShare) {
        //   throw new Error('Insufficient permissions to share this folder');
        // }

        const isAllowed = await isTeamSharingAllowed(teamId, fileSize);
        if (!isAllowed) {
          throw new Error('Team sharing limits exceeded');
        }
      } else {
        // Check individual sharing limits
        const allowed = await isAllowedToShare({
          userId: session.user.id,
          fileSize,
        });
        if (!allowed) {
          throw new Error('Sharing limit reached');
        }
      }

      const shortUrl = Math.random().toString(36).substring(2, 8);

      const result = await shareFolder({
        folderId: id,
        userId: session.user.id,
        shortUrl: shortUrl,
        expiresAt: expiresAt || null,
        teamId,
      });

      return {
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt,
      };
    },
    onSuccess: ({ downloadUrl }, { teamId }) => {
      toast({
        title: 'Folder shared successfully',
        description: 'The folder is now publicly accessible.',
      });
      updateDownloadUrl(downloadUrl);
      queryClient.invalidateQueries({
        queryKey: [teamId ? 'team-files' : 'bucket-files'],
      });

      queryClient.invalidateQueries({
        queryKey: [teamId ? 'team-shared-files' : 'shared-files'],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error sharing folder',
        description: error.message || 'Failed to share folder',
        variant: 'destructive',
      });
    },
  });
}
