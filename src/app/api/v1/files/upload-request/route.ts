import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';
import * as Minio from 'minio';

async function getFolderPath(folderId: string, userId: string): Promise<string> {
  let path = '';
  let currentId: string | null = folderId;

  while (currentId) {
    const result: { name: string; parentId: string | null } | null =
      await prisma.folder.findFirst({
        where: { id: currentId, userId },
        select: { name: true, parentId: true },
      });

    if (!result) {
      throw new Error('Folder path reconstruction failed.');
    }

    path = path ? `${result.name}/${path}` : `${result.name}/`;
    currentId = result.parentId;
  }
  return path;
}

export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fileName, fileSize, contentType, folderId, s3CredentialId } =
    await req.json();

  if (!fileName || !fileSize || !contentType) {
    return NextResponse.json(
      { error: 'Missing fields: fileName, fileSize, contentType' },
      { status: 400 }
    );
  }

  if (!folderId && !s3CredentialId) {
    return NextResponse.json(
      { error: 'Either folderId or s3CredentialId is required' },
      { status: 400 }
    );
  }

  let resolvedS3CredentialId = s3CredentialId;
  let resolvedFolderId: string | null = folderId || null;

  if (folderId) {
    const parentFolder = await prisma.folder.findFirst({
      where: { id: folderId, userId: user.id },
    });

    if (!parentFolder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    resolvedS3CredentialId = parentFolder.s3CredentialId;
  }

  const s3Credential = await prisma.s3Credential.findUnique({
    where: { id: resolvedS3CredentialId },
  });

  if (!s3Credential || s3Credential.userId !== user.id) {
    return NextResponse.json(
      { error: 'S3 credentials not found or access denied' },
      { status: 404 }
    );
  }

  try {
    const fullFolderPath = resolvedFolderId
      ? await getFolderPath(resolvedFolderId, user.id)
      : '';
    const s3Key = `${fullFolderPath}${fileName}`;

    const newFile = await prisma.file.create({
      data: {
        name: fileName,
        s3Key,
        size: fileSize.toString(),
        type: contentType,
        userId: user.id,
        folderId: resolvedFolderId,
        s3CredentialId: s3Credential.id,
      },
    });

    let fullEndpointUrl = s3Credential.endpointUrl;
    if (
      !fullEndpointUrl.startsWith('http://') &&
      !fullEndpointUrl.startsWith('https://')
    ) {
      fullEndpointUrl = `https://${fullEndpointUrl}`;
    }

    const url = new URL(fullEndpointUrl);
    const useSSL = url.protocol === 'https:';

    const s3Client = new Minio.Client({
      endPoint: url.hostname,
      port: url.port ? parseInt(url.port) : useSSL ? 443 : 80,
      useSSL,
      accessKey: s3Credential.accessKey,
      secretKey: s3Credential.secretKey,
      region: s3Credential.region || 'us-east-1',
      pathStyle: true,
    });

    const expires = 60 * 15;
    const reqParams = {
      'Content-Type': contentType,
      'Content-Length': fileSize.toString(),
    };

    const uploadUrl = await s3Client.presignedUrl(
      'PUT',
      s3Credential.bucket,
      s3Key,
      expires,
      reqParams
    );

    return NextResponse.json({
      uploadUrl,
      fileId: newFile.id,
      s3Key,
    });
  } catch (error) {
    console.error('Upload request error:', error);
    if (
      error instanceof Error &&
      (error.message.includes('duplicate key value') ||
        'code' in error &&
        (error as any).code === 'P2002')
    ) {
      return NextResponse.json(
        { error: `File '${fileName}' already exists at this path. Rename or delete the existing one.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
