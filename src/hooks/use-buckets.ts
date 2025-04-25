'use client';

import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllBuckets,
  getTeamBuckets,
  addTeamBucket,
  addS3Credentials,
  verifyS3Credentials,
  deleteBucket,
  deleteCompleteBucket,
} from '@/app/actions';
import { addBucketFormSchema as formSchema } from '@/lib/schemas';
import { z } from 'zod';
import { Bucket } from '@/lib/types';
import { useWorkspaceStore } from './use-workspace-context';
import { useRouter } from 'next/navigation';

type BucketWithStatus = Bucket & {
  isAccessible?: boolean;
  errorMessage?: string;
};

const getBuckets = async (
  teamId: string | null,
  userId: string
): Promise<BucketWithStatus[]> => {
  if (teamId) {
    const teamBuckets = await getTeamBuckets(teamId);
    return teamBuckets.map((bucket) => ({
      ...bucket,
      size: bucket.size.toString(),
    }));
  }
  const buckets = await getAllBuckets({ userId });
  return buckets;
};

const addCredsToDb = async ({
  userId,
  teamId,
  values,
}: {
  userId: string;
  teamId: string | null;
  values: z.infer<typeof formSchema>;
}) => {
  try {
    const bucket = await addS3Credentials({ userId, values });
    if (!teamId) {
      return bucket;
    }
    await addTeamBucket({
      teamId,
      s3CredentialId: bucket.id,
      addedById: userId,
      name: bucket.bucket,
    });
    return bucket;
  } catch (error: any) {
    console.log();
    if (error.digest && error.digest === '3232525769') {
      throw new Error('Bucket Already Exists with these credentials.');
    }
    throw new Error(error.message);
  }
};

export function useBuckets({
  userId,
  onCreateComplete,
}: {
  userId: string;
  onCreateComplete?: (bucketName: string) => void;
}) {
  const { selectedTeam } = useWorkspaceStore();
  const teamId = selectedTeam ? selectedTeam?.id : null;
  const {
    data: buckets,
    isLoading: isBucketsLoading,
    isError: isBucketsError,
  } = useQuery({
    queryFn: () => getBuckets(teamId, userId),
    queryKey: [teamId ? `team-buckets-${teamId}` : 'user-buckets'],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { mutate: addCreds, isPending: isAddingCreds } = useMutation({
    mutationFn: addCredsToDb,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [teamId ? `team-buckets-${teamId}` : 'user-buckets'],
      });
      if (onCreateComplete) onCreateComplete(data.bucket);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description:
          error.message ||
          'An error occurred while adding the bucket. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const { mutate: verify, isPending: isVerifying } = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      verifyS3Credentials(values, userId),
    onSuccess: (data) => {
      if (!data.isVerified) {
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: 'Please check your S3 credentials and try again.',
        });
        return;
      }
      const { isVerified, ...credentialsData } = data;
      addCreds({ userId, teamId, values: credentialsData });
      toast({
        title: 'Bucket Verified',
        description:
          'Bucket is verified, now adding this bucket to your account',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description:
          error.message ||
          'An error occurred while adding the bucket. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const { mutate: deleteBucket, isPending: isDeleting } = useMutation({
    mutationFn: (bucketId: string) => deleteCompleteBucket({ bucketId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [teamId ? `team-buckets-${teamId}` : 'user-buckets'],
      });
      toast({
        title: 'Deleted Successfully',
        description: `Your bucket ${data.bucket} has been removed successfully.`,
        variant: 'success',
      });
      router.push('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description:
          error.message ||
          'An error occurred while deleting the bucket. Please try again.',
        variant: 'destructive',
      });
    },
  });
  return {
    buckets,
    isBucketsLoading,
    isBucketsError,
    verify,
    isAddingCreds,
    isVerifying,
    deleteBucket,
    isDeleting,
  };
}
