import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFolderDownloadUrls } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  folderId: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folder = await prisma.sharedFolder.findUnique({
      where: { 
        id: params.folderId, 
      },
    });
    
    if (!folder) {
      throw new Error("Access Denied to folder.");
    }
    
    const urls = await getFolderDownloadUrls(params.folderId, "");
    return NextResponse.json({ urls });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
