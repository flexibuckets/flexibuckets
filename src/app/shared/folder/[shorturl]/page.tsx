"use client";
import { useQuery } from "@tanstack/react-query";
import { getSharedFolderInfo } from "@/app/actions";
import SharedFolderDownload from "@/components/share-folder/ShareFolderDownload";
import { Loader2 } from "lucide-react";
import DashboardError from "@/components/dashboard/DasboardError";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";

export default function SharedFolderPage({
  params,
}: {
  params: { shorturl: string };
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-folder-info"],
    queryFn: () => getSharedFolderInfo(params.shorturl),
    staleTime: Infinity,
  });

  const getContent = () => {
    if (isLoading) {
      return <Loader2 className="h-8 w-8 animate-spin" />;
    }

    if (error || !data) {
      return <>{error ? error.message : <DashboardError />}</>;
    }

    return (
      <>
        <SharedFolderDownload
          folderStructure={data.folderStructure}
          sharedFolderId={data.sharedFolderId}
        />
      </>
    );
  };
  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] p-4">
        {getContent()}
      </div>
      <Footer />
    </>
  );
}