import React, {useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogOut, User2 } from "lucide-react";
import { getUserTotalFileUpload } from "@/app/actions";
import { formatBytes } from "@/lib/utils";
import { ThemeSwitcher } from "../ThemeSwitcher";
import { NameModal } from "./NameModal";
import { useSubscriptionPlan } from "@/context/SubscriptionContext";
import { UserAvatar } from "../UserAvatar";
const UserBox = () => {
  const { data: session, status } = useSession();
  const subscriptionPlan = useSubscriptionPlan();
  const [name, setName] = useState("");
  const [isNameModalOpen, setNameModalOpen] = useState(true);
  const handleNameModalClose = (givenName?: string) => {
    setNameModalOpen(false);
    if (givenName) {
      setName(givenName);
    }
  };
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const { data: usedStorage, isLoading: isLoadingTotalUploadSize } = useQuery({
    queryFn: () =>
      getUserTotalFileUpload({ userId: session?.user?.id as string }),
    queryKey: ["total-file-size"],
    enabled: !!session?.user?.id && status === "authenticated", // Ensures the query runs only when the session is available and authenticated
  });
  const totalStorage = subscriptionPlan.storage * 1024 * 1024 * 1024;
  const usedPercentage = usedStorage
    ? (parseInt(usedStorage) / totalStorage) * 100
    : 0;

  return (
    <div>
      {status === "loading" ? (
        <div className="p-4 border-t border-gray-200">
          <div className="flex w-full items-center space-x-3 mb-4">
            <Skeleton className="aspect-square h-10 rounded-full" />

            <div className="w-full flex flex-col justify-between space-y-2">
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-full h-3" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-full h-8" />
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="aspect-square h-10 rounded-full bg-gray-300 flex justify-center items-end">
              <UserAvatar
                user={{
                  name: session?.user.name || null,
                  image: session?.user.image || null,
                }}
              />
            </div>
            <div>
              {session?.user?.name ||
                name ||
                (session?.user?.id ? (
                  <NameModal
                    userId={session?.user?.id}
                    isOpen={isNameModalOpen}
                    onClose={handleNameModalClose}
                  />
                ) : (
                  "User"
                ))}

              <p className="text-sm text-gray-500 max-w-[22ch] truncate">
                {session?.user?.email || "user@example.com"}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-gray-500 flex items-center">
                  {isLoadingTotalUploadSize ? (
                    <>
                      <Skeleton className="w-6 h-2 mr-1" />
                    </>
                  ) : usedStorage ? (
                    formatBytes(usedStorage)
                  ) : (
                    0
                  )}{" "}
                  / {formatBytes(totalStorage.toString())}
                </span>
              </div>
              <Progress value={usedPercentage} className="h-2" />
            </div>
            <div className="flex justify-between gap-x-2">
              <ThemeSwitcher withLabel={true} />
              <Button
                variant="outline"
                className="w-full text-destructive dark:text-red-300"
                onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBox;
