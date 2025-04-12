import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMinioClient } from "@/lib/s3";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bucketId = params.id;

    // Get the bucket details
    const bucket = await prisma.s3Credential.findUnique({
      where: { id: bucketId },
      include: {
        files: true,
        folders: true,
      },
    });

    if (!bucket) {
      return NextResponse.json({ error: "Bucket not found" }, { status: 404 });
    }

    // Delete all files from S3 storage
    const minioClient = await getMinioClient(bucketId);
    
    // Delete all files in the bucket
    for (const file of bucket.files) {
      try {
        await minioClient.removeObject(bucket.bucket, file.name);
      } catch (error) {
        console.error(`Error deleting file ${file.name}:`, error);
      }
    }

    // Delete all folders and their contents
    for (const folder of bucket.folders) {
      try {
        await minioClient.removeObject(bucket.bucket, folder.name);
      } catch (error) {
        console.error(`Error deleting folder ${folder.name}:`, error);
      }
    }

    // Delete the bucket from the database
    await prisma.s3Credential.delete({
      where: { id: bucketId },
    });

    return NextResponse.json({ message: "Bucket deleted successfully" });
  } catch (error) {
    console.error("Error deleting bucket:", error);
    return NextResponse.json(
      { error: "Failed to delete bucket" },
      { status: 500 }
    );
  }
} 