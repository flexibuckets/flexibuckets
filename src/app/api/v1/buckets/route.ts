import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Now you have user.id, regardless of how they authenticated!
  const buckets = await prisma.s3Credential.findMany({
    where: { userId: user.id },
  });

  return NextResponse.json(buckets);
}