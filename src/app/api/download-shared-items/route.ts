import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFolderDownloadUrls } from "@/lib/s3";
import { PresignedObjectUrl } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { sharedFolderId, selectedItems, subFolderId } = await request.json();

  try {
    const sharedFolder = await prisma.sharedFolder.findUnique({
      where: { id: sharedFolderId },
      include: { folder: true },
    });

    if (
      !sharedFolder ||
      (sharedFolder.expiresAt && sharedFolder.expiresAt < new Date())
    ) {
      return NextResponse.json(
        { error: "Shared folder not found or expired" },
        { status: 404 }
      );
    }
    const urls: PresignedObjectUrl[] = [];

    if (subFolderId) {
      const folderUrls = await getFolderDownloadUrls(
        subFolderId,
        selectedItems
      );
      urls.push(...folderUrls);
    } else {
      const folderUrls = await getFolderDownloadUrls(
        sharedFolder.folder.id,
        selectedItems
      );

      urls.push(...folderUrls);
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Error getting download URLs:", error);
    return NextResponse.json(
      { error: "Failed to get download URLs" },
      { status: 500 }
    );
  }
}
