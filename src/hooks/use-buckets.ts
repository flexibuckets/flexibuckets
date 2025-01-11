"use client";

import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllBuckets, addS3Credentials, verifyS3Credentials, deleteBucket } from "@/app/actions";
import { addBucketFormSchema as formSchema } from "@/lib/schemas";
import { z } from "zod";
import { Bucket } from "@/lib/types";

type BucketWithStatus = Bucket & {
  isAccessible?: boolean;
  errorMessage?: string;
};

const getBuckets = async (userId: string): Promise<BucketWithStatus[]> => {
  const buckets = await getAllBuckets({ userId });
  return buckets;
};

const verifyBucketCreds = async (values: z.infer<typeof formSchema>) => {
  let formattedValues = { ...values };
  
  // Remove http:// or https:// from endpoint URL
  if (formattedValues.endpointUrl) {
    formattedValues.endpointUrl = formattedValues.endpointUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, ''); // Also remove trailing slash
  }

  const verificationResult = await verifyS3Credentials(formattedValues);
  if (!verificationResult.isVerified) {
    throw new Error('Failed to verify bucket credentials');
  }
  return formattedValues;
};

const addCredsToDb = async ({
  userId,
  values,
}: {
  userId: string;
  values: z.infer<typeof formSchema>;
}) => {
  return await addS3Credentials({ userId, values });
};

export function useBuckets(userId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: buckets, isLoading, isError } = useQuery({
    queryKey: ["buckets", userId],
    queryFn: () => getBuckets(userId),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyBucketCreds,
    onSuccess: async (formattedValues) => {
      await addBucketMutation.mutateAsync({ userId, values: formattedValues });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Failed to verify bucket credentials",
      });
    },
  });

  const addBucketMutation = useMutation({
    mutationFn: addCredsToDb,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buckets", userId] });
      toast({ title: "Bucket added successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error adding bucket",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const deleteBucketMutation = useMutation({
    mutationFn: async ({ bucketId }: { bucketId: string }) => {
      return await deleteBucket({ bucketId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buckets", userId] });
      toast({ title: "Bucket deleted successfully" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error deleting bucket",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  return {
    buckets,
    isLoading,
    isError,
    verifyBucket: verifyMutation.mutate,
    isVerifying: verifyMutation.isPending,
    addBucket: addBucketMutation.mutate,
    isAddingCreds: addBucketMutation.isPending,
    deleteBucket: deleteBucketMutation.mutate,
    isDeleting: deleteBucketMutation.isPending,
  };
}
