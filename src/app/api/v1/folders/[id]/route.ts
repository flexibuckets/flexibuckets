import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { deleteFolder } from '@/app/actions';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const folder = await prisma.folder.findUnique({
    where: { id: params.id },
    select: { userId: true, s3CredentialId: true },
  });

  if (!folder || folder.userId !== user.id) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  try {
    await deleteFolder({
      userId: user.id,
      folderId: params.id,
      s3CredentialId: folder.s3CredentialId,
    });
    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}

export async function PATCH(
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

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const updated = await prisma.folder.update({
      where: { id: params.id },
      data: { name },
    });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error renaming folder:', error);
    return NextResponse.json({ error: 'Failed to rename folder' }, { status: 500 });
  }
}
