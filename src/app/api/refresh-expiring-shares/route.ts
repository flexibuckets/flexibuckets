import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getNearExpiryFilesAndFolders } from "@/lib/dboperations";
import { refreshShareLinks } from "@/lib/s3";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { nearExpiryFiles, nearExpiryFolders } = await getNearExpiryFilesAndFolders({ userId: session.user.id });

    const refreshedFilesCount = await refreshShareLinks(
      nearExpiryFiles.map(file => file.id),
      false
    );

    const refreshedFoldersCount = await refreshShareLinks(
      nearExpiryFolders.map(folder => folder.id),
      true
    );

    return NextResponse.json({ 
      refreshedFilesCount, 
      refreshedFoldersCount,
      message: "Share links refreshed successfully" 
    });
  } catch (error) {
    console.error("Error refreshing expiring shares:", error);
    return NextResponse.json({ error: "Failed to refresh expiring shares" }, { status: 500 });
  }
}
