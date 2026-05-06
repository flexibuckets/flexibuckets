import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPresignedUrl } from '@/lib/s3';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const file = await prisma.file.findUnique({
    where: { id: params.id },
    include: { s3Credential: true },
  });

  if (!file || file.userId !== user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const downloadUrl = await getPresignedUrl(
      file.s3CredentialId,
      file.s3Key,
      3600
    );

    return NextResponse.json({
      downloadUrl,
      fileName: file.name,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
