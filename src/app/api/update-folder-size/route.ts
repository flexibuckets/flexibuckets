import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const { folderId, size } = await request.json();

  if (!folderId || typeof size !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { size: true },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: { 
        size: (BigInt(size) + BigInt(folder.size)).toString()
      },
    });

    // Recursively update parent folders
    if (updatedFolder.parentId) {
      await updateParentFolderSize(updatedFolder.parentId, BigInt(size));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating folder size:', error);
    return NextResponse.json({ error: 'Failed to update folder size' }, { status: 500 });
  }
}

async function updateParentFolderSize(folderId: string, sizeChange: bigint) {
  const parentFolder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { size: true, parentId: true },
  });

  if (parentFolder) {
    const currentSize = BigInt(parentFolder.size);
    const newSize = (currentSize + sizeChange).toString();

    await prisma.folder.update({
      where: { id: folderId },
      data: { size: newSize },
    });

    if (parentFolder.parentId) {
      await updateParentFolderSize(parentFolder.parentId, sizeChange);
    }
  }
}
