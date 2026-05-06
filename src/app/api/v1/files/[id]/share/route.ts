import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { shareFile } from '@/app/actions';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const file = await prisma.file.findUnique({
    where: { id: params.id },
  });

  if (!file || file.userId !== user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const body = await req.json();
  const expiresInHours = body.expiresInHours || 168;
  const isInfinite = body.isInfinite || false;

  const expiresAt = isInfinite
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  try {
    const shortUrl = Math.random().toString(36).substring(2, 8);
    const result = await shareFile({
      fileId: params.id,
      userId: user.id,
      shortUrl,
      expiresAt,
      isSharedInfinitely: isInfinite,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sharing file:', error);
    return NextResponse.json({ error: 'Failed to share file' }, { status: 500 });
  }
}
