import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMinioClient } from '@/lib/s3';
import { createAuditLog } from '@/lib/audit';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  try {
    const uploadLink = await prisma.publicUploadLink.findUnique({
      where: { token: params.token },
      include: { s3Credential: true },
    });

    if (!uploadLink) {
      return NextResponse.json({ error: 'Invalid upload link' }, { status: 404 });
    }

    if (uploadLink.isExpired) {
      return NextResponse.json({ error: 'This upload link has expired' }, { status: 410 });
    }

    if (uploadLink.expiresAt && new Date(uploadLink.expiresAt) <= new Date()) {
      await prisma.publicUploadLink.update({
        where: { id: uploadLink.id },
        data: { isExpired: true },
      });
      return NextResponse.json({ error: 'This upload link has expired' }, { status: 410 });
    }

    if (uploadLink.maxFileCount && uploadLink.currentFileCount >= uploadLink.maxFileCount) {
      return NextResponse.json({ error: 'Upload limit reached for this link' }, { status: 403 });
    }

    const formData = await request.formData();
    const fileEntries = formData.getAll('file');

    if (!fileEntries || fileEntries.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const files: File[] = fileEntries.filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    if (totalSize > uploadLink.maxFileSize) {
      return NextResponse.json(
        { error: `Total file size exceeds the limit of ${uploadLink.maxFileSize} bytes` },
        { status: 413 }
      );
    }

    if (uploadLink.allowedTypes) {
      const allowed = uploadLink.allowedTypes.split(',').map((t) => t.trim().toLowerCase());
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const mime = file.type.toLowerCase();
        const isAllowed = allowed.some(
          (type) => mime.includes(type) || ext === type.replace('.', '')
        );
        if (!isAllowed) {
          return NextResponse.json(
            { error: `File type not allowed: ${file.name}` },
            { status: 415 }
          );
        }
      }
    }

    const minioClient = await getMinioClient(uploadLink.s3CredentialId);
    const bucket = uploadLink.s3Credential.bucket;
    const uploadedFiles: string[] = [];

    for (const file of files) {
      const objectName = uploadLink.folderId
        ? `${uploadLink.folderId}/${file.name}`
        : file.name || `upload_${Date.now()}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);

      await minioClient.putObject(bucket, objectName, stream, buffer.length, {
        'Content-Type': file.type || 'application/octet-stream',
      });

      await prisma.file.create({
        data: {
          userId: uploadLink.userId,
          name: file.name || objectName,
          type: file.type || 'application/octet-stream',
          size: buffer.length.toString(),
          s3Key: objectName,
          s3CredentialId: uploadLink.s3CredentialId,
          folderId: uploadLink.folderId,
        },
      });

      uploadedFiles.push(file.name || objectName);
    }

    await prisma.publicUploadLink.update({
      where: { id: uploadLink.id },
      data: { currentFileCount: { increment: files.length } },
    });

    await createAuditLog({
      userId: uploadLink.userId,
      action: 'PUBLIC_UPLOAD_RECEIVED',
      resourceType: 'publicUploadLink',
      resourceId: uploadLink.id,
      details: { fileCount: files.length, totalSize, fileNames: uploadedFiles },
    });

    return NextResponse.json({ success: true, uploaded: uploadedFiles.length }, { status: 200 });
  } catch (error) {
    console.error('Public upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
