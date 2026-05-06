import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { shareFolder } from '@/app/actions';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const folder = await prisma.folder.findUnique({
    where: { id: params.id },
  });

  if (!folder || folder.userId !== user.id) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  const body = await req.json();
  const expiresInHours = body.expiresInHours || 168;

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  try {
    const shortUrl = Math.random().toString(36).substring(2, 8);
    const result = await shareFolder({
      folderId: params.id,
      userId: user.id,
      shortUrl,
      expiresAt,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sharing folder:', error);
    return NextResponse.json({ error: 'Failed to share folder' }, { status: 500 });
  }
}
