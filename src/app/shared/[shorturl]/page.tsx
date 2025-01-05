import { getSharedFileInfo } from "@/app/actions";
import FileIcon from "@/components/file-upload/FileIcon";
import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { Download } from "lucide-react";
import Link from "next/link";

export default async function SharedFilePage({
  params,
}: {
  params: { shorturl: string };
}) {
  const fileInfo = await getSharedFileInfo(params.shorturl);

  if (!fileInfo) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-7rem)]">
          <h1 className="text-2xl font-bold mb-4">File Not Found</h1>
          <p>
            The shared file you&apos;re looking for doesn&apos;t exist or has
            expired.
          </p>
        </div>
      </>
    );
  }

  const { expiresAt } = fileInfo;
  const { type, name, size } = fileInfo.file;

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] p-4">
        <div className="bg-background border border-border shadow-md rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4 space-x-4">
            <FileIcon fileType={type} height="h-12" width="w-12" />
            <div>
              <h1 className="text-2xl font-bold">{name}</h1>
              <p className="text-sm text-gray-500">{type}</p>
            </div>
          </div>
          <div className="mb-4">
            <p>
              <strong>Size:</strong> {formatBytes(size)}
            </p>
            {expiresAt ? (
              <p>
                <strong>Expires:</strong> {new Date(expiresAt).toLocaleString()}
              </p>
            ) : (
              <p>
                <strong>File Never Expires</strong>
              </p>
            )}
          </div>
          <Button asChild className="w-full">
            <Link target="_blank" href={`/api/download/${params.shorturl}`}>
              <Download className="mr-2 h-4 w-4" /> Download File
            </Link>
          </Button>
        </div>
      </div>
      <Footer />
    </>
  );
}
