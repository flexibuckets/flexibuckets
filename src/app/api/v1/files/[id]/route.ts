import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { deleteFile } from '@/app/actions';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const file = await prisma.file.findUnique({
    where: { id: params.id },
    select: { userId: true, s3CredentialId: true },
  });

  if (!file || file.userId !== user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    await deleteFile({
      userId: user.id,
      fileId: params.id,
      s3CredentialId: file.s3CredentialId,
    });
    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
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

  const file = await prisma.file.findUnique({
    where: { id: params.id },
  });

  if (!file || file.userId !== user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const updated = await prisma.file.update({
      where: { id: params.id },
      data: { name },
    });
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error renaming file:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}
