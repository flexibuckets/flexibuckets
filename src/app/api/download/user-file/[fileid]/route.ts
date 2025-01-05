import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getPresignedUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileid: string } }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = params.fileid;

  try {
    // Check file ownership
    const file = await prisma.file.findUnique({
      where: { id: fileId, userId: session.user.id },
      include: { s3Credential: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found or unauthorized" }, { status: 404 });
    }
    
    // Generate pre-signed URL
    const presignedUrl = await getPresignedUrl(file.s3CredentialId, file.s3Key);

    // Redirect to the pre-signed URL
    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }
}
