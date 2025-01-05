import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/s3'; // Your existing uploadFile function
import formidable from 'formidable';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import fs from 'fs';
import { isAllowedToUpload } from '@/lib/dboperations';
import {prisma} from '@/lib/prisma'


// New configuration method
export const dynamic = 'force-dynamic';
// Helper function to convert the Next.js request into a readable stream
function requestToIncomingMessage(req: Request): IncomingMessage {

  //@ts-expect-error Argument of type 'Readable' is not assignable to parameter of type 'Socket'.
  const message = new IncomingMessage(new Readable());
  
  // Check if req.body is a ReadableStream
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

export const POST: (request: NextRequest) => Promise<NextResponse> = async (request) => {
  const incomingReq = requestToIncomingMessage(request);
  const form = new formidable.IncomingForm();

  return new Promise((resolve, reject) => {
    form.parse(incomingReq, async (err, fields, files) => {
      if (err) {
        return reject(NextResponse.json({ error: 'Error parsing the form data' }, { status: 500 }));
      }

      const { userId, fileName, mimeType, bucket, fileSize, s3CredentialId, folderId } = fields;

      const fileArray = files.file as formidable.File[] | formidable.File;
      const filesArray = Array.isArray(fileArray) ? fileArray : [fileArray];

      if (filesArray.length === 0 || !userId || !fileName || !mimeType || !bucket || !fileSize) {
        return resolve(
          NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        );
      }

      // Handle multiple file sizes
      const fileSizes = Array.isArray(fileSize) ? fileSize : [fileSize];
      const totalFileSize = fileSizes.reduce((sum, size) => sum + parseInt(size as string, 10), 0);

      // Check if the user is allowed to upload
      const isAllowed = await isAllowedToUpload({
        userId: userId as unknown as string,
        fileSize: totalFileSize,
        fileCount: filesArray.length,
      });

      if (!isAllowed) {
        return resolve(
          NextResponse.json({ error: 'Upload limit exceeded' }, { status: 403 })
        );
      }

      try {
        const uploadPromises = filesArray.map(async (file, index) => {
          const fileStream = fs.createReadStream(file.filepath);
          const currentFileName = Array.isArray(fileName) ? fileName[index] : fileName;
          const currentMimeType = Array.isArray(mimeType) ? mimeType[index] : mimeType;
          const currentFileSize = parseInt(fileSizes[index] as string, 10);

          const uploadResult = await uploadFile({
            userId: userId as unknown as string,
            fileStream,
            fileName: currentFileName as string,
            mimeType: currentMimeType as string,
            bucket: bucket as unknown as string,
            fileSize: currentFileSize.toString(),
            s3CredentialId: s3CredentialId as unknown as string,
            folderId: folderId as string | undefined,
          });

          // Update folder size if a folder is specified
          if (folderId) {
            const folder = await prisma.folder.findUnique({
              where: { id: folderId as unknown as string },
              select: { size: true }
            });
            
            if (folder) {
              const newSize = (BigInt(folder.size) + BigInt(currentFileSize)).toString();
              await prisma.folder.update({
                where: { id: folderId as unknown as string },
                data: { size: newSize }
              });
            }
          }

          return uploadResult;
        });

        const fileRecords = await Promise.all(uploadPromises);

        // Update the user's total upload size
        const user = await prisma.user.findUnique({
          where: { id: userId as unknown  as string },
          select: { totalUploadSize: true }
        });

        if (user) {
          const newTotalUploadSize = (BigInt(user.totalUploadSize) + BigInt(totalFileSize)).toString();
          await prisma.user.update({
            where: { id: userId as unknown as string },
            data: { totalUploadSize: newTotalUploadSize }
          });
        }

        resolve(NextResponse.json({ success: true, files: fileRecords }, { status: 200 }));
      } catch (error) {
        console.error('File upload failed:', error);
        resolve(NextResponse.json({ error: 'File upload failed' }, { status: 500 }));
      }
    });
  });
}
