import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fileId } = await req.json();
  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totalUploadSize: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentSize = BigInt(currentUser.totalUploadSize || '0');
    const fileSize = BigInt(file.size);
    const newTotalSize = currentSize + fileSize;

    await prisma.user.update({
      where: { id: user.id },
      data: { totalUploadSize: newTotalSize.toString() },
    });

    if (file.folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: file.folderId },
        select: { size: true },
      });
      if (folder) {
        const newFolderSize = (BigInt(folder.size) + fileSize).toString();
        await prisma.folder.update({
          where: { id: file.folderId },
          data: { size: newFolderSize },
        });
      }
    }

    return NextResponse.json({
      message: 'Upload successfully completed',
      fileId,
    });
  } catch (error) {
    console.error('Upload complete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
