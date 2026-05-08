import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMinioClient } from '@/lib/s3';
import { createAuditLog } from '@/lib/audit';
import formidable from 'formidable';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import fs from 'fs';

export const dynamic = 'force-dynamic';

function requestToIncomingMessage(req: Request): IncomingMessage {
  //@ts-expect-error Argument of type 'Readable' is not assignable to parameter of type 'Socket'.
  const message = new IncomingMessage(new Readable());
  if (req.body instanceof ReadableStream) {
    const reader = req.body.getReader();
    const push = async () => {
      const { done, value } = await reader.read();
      if (done) {
        message.push(null);
      } else {
        message.push(Buffer.from(value));
        push();
      }
    };
    push();
  } else {
    message.push(req.body);
    message.push(null);
  }
  return message;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
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

    const incomingReq = requestToIncomingMessage(request);
    const form = new formidable.IncomingForm();

    return new Promise<NextResponse>((resolve) => {
      form.parse(incomingReq, async (err, fields, files) => {
        if (err) {
          return resolve(NextResponse.json({ error: 'Error parsing form data' }, { status: 500 }));
        }

        const fileArray = files.file as formidable.File[] | formidable.File;
        const filesArray = Array.isArray(fileArray) ? fileArray : [fileArray];

        if (filesArray.length === 0) {
          return resolve(NextResponse.json({ error: 'No files provided' }, { status: 400 }));
        }

        const totalSize = filesArray.reduce((sum, f) => sum + f.size, 0);

        if (totalSize > uploadLink.maxFileSize) {
          return resolve(
            NextResponse.json(
              { error: `Total file size exceeds the limit of ${uploadLink.maxFileSize} bytes` },
              { status: 413 }
            )
          );
        }

        if (uploadLink.allowedTypes) {
          const allowed = uploadLink.allowedTypes.split(',').map((t) => t.trim().toLowerCase());
          for (const file of filesArray) {
            const ext = file.originalFilename?.split('.').pop()?.toLowerCase() || '';
            const mime = file.mimetype?.toLowerCase() || '';
            const isAllowed = allowed.some(
              (type) => mime.includes(type) || ext === type.replace('.', '')
            );
            if (!isAllowed) {
              return resolve(
                NextResponse.json(
                  { error: `File type not allowed: ${file.originalFilename}` },
                  { status: 415 }
                )
              );
            }
          }
        }

        try {
          const minioClient = await getMinioClient(uploadLink.s3CredentialId);
          const bucket = uploadLink.s3Credential.bucket;
          const uploadedFiles: string[] = [];

          for (const file of filesArray) {
            const fileStream = fs.createReadStream(file.filepath);
            const objectName = uploadLink.folderId
              ? `${uploadLink.folderId}/${file.originalFilename}`
              : file.originalFilename || `upload_${Date.now()}`;

            await minioClient.putObject(bucket, objectName, fileStream, file.size, {
              'Content-Type': file.mimetype || 'application/octet-stream',
            });

            await prisma.file.create({
              data: {
                userId: uploadLink.userId,
                name: file.originalFilename || objectName,
                type: file.mimetype || 'application/octet-stream',
                size: file.size.toString(),
                s3Key: objectName,
                s3CredentialId: uploadLink.s3CredentialId,
                folderId: uploadLink.folderId,
              },
            });

            uploadedFiles.push(file.originalFilename || objectName);
          }

          await prisma.publicUploadLink.update({
            where: { id: uploadLink.id },
            data: { currentFileCount: { increment: filesArray.length } },
          });

          await createAuditLog({
            userId: uploadLink.userId,
            action: 'PUBLIC_UPLOAD_RECEIVED',
            resourceType: 'publicUploadLink',
            resourceId: uploadLink.id,
            details: { fileCount: filesArray.length, totalSize, fileNames: uploadedFiles },
          });

          resolve(NextResponse.json({ success: true, uploaded: uploadedFiles.length }, { status: 200 }));
        } catch (error) {
          console.error('Public upload failed:', error);
          resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
        }
      });
    });
  } catch (error) {
    console.error('Public upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
