import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeamBucketFiles, deleteTeamFile } from "@/app/actions";
import { toast } from "./use-toast";
import useParentId from "./use-parentId";
import { useEffect, useState } from "react";
import useDebounce from "./useDebounce";

export function useTeamFiles({
  s3CredentialId,
  userId,
}: {
  userId: string;
  s3CredentialId: string;
}) {
  const { parentId } = useParentId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const updateSearchQuery = (val: string) => {
    setSearchQuery(val);
  };
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data, isError, isRefetching, isLoading, refetch } = useQuery({
    queryKey: ["team-files", s3CredentialId, debouncedSearchQuery],
    queryFn: () =>
      getTeamBucketFiles({
        userId,
        s3CredentialId,
        parentId,
        searchQuery: debouncedSearchQuery,
      }),
  });

  useEffect(() => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["team-breadcrumbs"] });
  }, [parentId]);

  const { mutate: deleteFile } = useMutation({
    mutationFn: deleteTeamFile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["team-files", s3CredentialId],
      });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file",
      });
    },
  });

  return {
    data,
    isLoading,
    deleteFile,
    searchQuery,
    updateSearchQuery,
    parentId,
    isRefetching,
    isError,
  };
}
