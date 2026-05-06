import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPresignedUrl } from '@/lib/s3';

export async function GET(
  _req: NextRequest,
  { params }: { params: { shortUrl: string } }
) {
  try {
    const sharedFile = await prisma.sharedFile.findUnique({
      where: { downloadUrl: params.shortUrl },
      include: { file: true },
    });

    if (
      !sharedFile ||
      (sharedFile.expiresAt && new Date(sharedFile.expiresAt) <= new Date())
    ) {
      return NextResponse.json(
        { error: 'File not found or expired' },
        { status: 404 }
      );
    }

    const url = await getPresignedUrl(
      sharedFile.file.s3CredentialId,
      sharedFile.file.s3Key
    );

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
