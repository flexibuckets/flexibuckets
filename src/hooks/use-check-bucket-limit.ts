import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

async function checkBucketLimit(userId: string) {
  const response = await fetch("/api/buckets/check-limit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to check bucket limit");
  }

  return response.json();
}

export function useCheckBucketLimit() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: checkBucketLimit,
    onError: (error: Error) => {
      toast({
        title: "Bucket Limit Reached",
        description: error.message || "You have reached your bucket limit. Please upgrade your plan to add more buckets.",
        variant: "destructive",
      });
    },
  });
}