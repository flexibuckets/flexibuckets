import { auth } from "@/auth";
import AccessDenied from "@/components/dashboard/AccessDenied";
import { SharedFilesTable } from "@/components/share-file-table/SharedFileTables";
export default async function SharedFilesPage() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) return <AccessDenied />;
  return (
    <div className="p-6 bg-background text-foreground space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shared Files</h1>
      </div>
      <SharedFilesTable userId={session.user.id} />
    </div>
  );
}
