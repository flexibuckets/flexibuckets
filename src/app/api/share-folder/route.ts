import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId, expiresAt } = await request.json();

  try {
    const downloadUrl = `${
      process.env.NEXT_PUBLIC_APP_URL
    }/shared/folder/${nanoid()}`;

    const sharedFolder = await prisma.sharedFolder.create({
      data: {
        folderId,
        sharedById: session.user.id,
        downloadUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    try {
      await createAuditLog({
      userId: session.user.id,
      action: 'FOLDER_SHARE',
      resourceType: 'folder',
      resourceId: folderId,
      details: { downloadUrl, expiresAt },
    });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json(sharedFolder);
  } catch (error) {
    console.error("Error sharing folder:", error);
    return NextResponse.json(
      { error: "Failed to share folder" },
      { status: 500 }
    );
  }
}
