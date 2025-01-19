import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/s3";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const file = await prisma.file.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        s3Key: true,
        s3CredentialId: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Get presigned URL using existing function
    const url = await getPresignedUrl(file.s3CredentialId, file.s3Key);

    return NextResponse.json({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url: url,
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 