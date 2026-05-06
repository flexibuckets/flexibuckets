import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
  });

  if (!bucket || bucket.userId !== user.id) {
    return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId') || null;
  const search = searchParams.get('search') || undefined;

  const fileWhere: Prisma.FileWhereInput = {
    userId: user.id,
    s3CredentialId: params.id,
    folderId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { type: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const folderWhere: Prisma.FolderWhereInput = {
    userId: user.id,
    s3CredentialId: params.id,
    parentId: folderId,
    ...(search ? { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } : {}),
  };

  const [files, folders] = await Promise.all([
    prisma.file.findMany({
      where: fileWhere,
      include: { sharedFile: { select: { downloadUrl: true, expiresAt: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.folder.findMany({
      where: folderWhere,
      include: { sharedFolder: { select: { downloadUrl: true, expiresAt: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.size,
      s3Key: f.s3Key,
      folderId: f.folderId,
      isShared: !!f.sharedFile,
      sharedUrl: f.sharedFile?.downloadUrl || null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      parentId: f.parentId,
      isShared: !!f.sharedFolder,
      sharedUrl: f.sharedFolder?.downloadUrl || null,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
  });
}
