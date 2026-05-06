import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getpresignedPutUrl } from '@/app/actions';

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
    const cred = file.s3Credential;
    const downloadUrl = await getpresignedPutUrl({
      endpointUrl: cred.endpointUrl,
      accessKey: cred.accessKey,
      secretKey: cred.secretKey,
      fileName: file.s3Key,
      bucketName: cred.bucket,
      region: cred.region,
      expiresIn: 3600,
    });

    return NextResponse.json({
      downloadUrl,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
