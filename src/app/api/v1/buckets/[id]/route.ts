import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bucket = await prisma.s3Credential.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { files: true, folders: true } },
    },
  });

  if (!bucket || bucket.userId !== user.id) {
    return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: bucket.id,
    name: bucket.bucket,
    endpointUrl: bucket.endpointUrl,
    region: bucket.region,
    provider: bucket.provider,
    fileCount: bucket._count.files,
    folderCount: bucket._count.folders,
    createdAt: bucket.createdAt,
  });
}
