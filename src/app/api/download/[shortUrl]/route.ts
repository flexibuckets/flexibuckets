import { NextResponse } from "next/server";
import { getSharedFileInfo } from "@/app/actions";
import { getMinioClient, getSingleCredential } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { isDownloadAllowed } from "@/lib/dboperations";

export async function GET(
  request: Request,
  { params }: { params: { shortUrl: string } }
) {
  const { shortUrl } = params;

  try {
    const fileInfo = await getSharedFileInfo(shortUrl);

    if (!fileInfo) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (fileInfo.expiresAt && new Date() > fileInfo.expiresAt) {
      return NextResponse.json(
        { error: "Share link has expired" },
        { status: 410 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: fileInfo.sharedById },
      select: {
        id: true,                               
        totalDownloadedSize: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if download is allowed
    const isAllowed = await isDownloadAllowed({
      userId: user.id,
      fileSize: parseInt(fileInfo.file.size),
    });

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Download limit reached" },
        { status: 403 }
      );
    }

    const minioClient = await getMinioClient(fileInfo.file.s3CredentialId);
    const credential = await getSingleCredential(fileInfo.file.s3CredentialId);

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    const { bucket } = credential;
    const fileStream = await minioClient.getObject(bucket, fileInfo.file.s3Key);

    // Trigger the webhook for file access
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shared-file-access`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: fileInfo.id,
          userId: fileInfo.sharedById,
        }),
      }
    );

    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    // Update downloaded size for both SharedFile and User after successful download
    await prisma.$transaction([
      prisma.sharedFile.update({
        where: { id: fileInfo.id },
        data: {
          downloadedSize: (
            parseInt(fileInfo.downloadedSize) + parseInt(fileInfo.file.size)
          ).toString(),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          totalDownloadedSize: (
            parseInt(user.totalDownloadedSize) + parseInt(fileInfo.file.size)
          ).toString(),
        },
      }),
    ]);

    return new NextResponse(readableStream, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileInfo.file.name}"`,
        "Content-Type": fileInfo.file.type,
      },
    });
  } catch (error) {
    console.error("Error downloading shared file:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
