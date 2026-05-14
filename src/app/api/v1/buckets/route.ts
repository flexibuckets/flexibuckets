import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const buckets = await prisma.s3Credential.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      bucket: true,
      region: true,
      provider: true,
      endpointUrl: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  return NextResponse.json(buckets);
}