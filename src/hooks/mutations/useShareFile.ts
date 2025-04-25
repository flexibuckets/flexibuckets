import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  shareFile,
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

export function useShareFile({
  updateDownloadUrl,
}: {
  updateDownloadUrl: (shortUrl: string) => void;
}): ShareMutation {
  const { toast } = useToast();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation<ShareResponse, Error, ShareVariables>({
    mutationFn: async ({ id, expiresAt, teamId, fileSize, isInfinite }) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      if (teamId) {
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

      // If infinite sharing, always set an initial 7-day expiry
      let effectiveExpiryDate = expiresAt;
      if (isInfinite) {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        effectiveExpiryDate = sevenDaysFromNow;
      }

      const result = await shareFile({
        fileId: id,
        userId: session.user.id,
        shortUrl,
        expiresAt: effectiveExpiryDate,
        teamId,
        isSharedInfinitely: isInfinite,
      });

      return {
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt,
      };
    },
    onSuccess: ({ downloadUrl }, { teamId }) => {
      toast({
        title: 'File shared successfully',
        description: 'The file is now publicly accessible.',
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
        title: 'Error sharing file',
        description: error.message || 'Failed to share file',
        variant: 'destructive',
      });
    },
  });
}
