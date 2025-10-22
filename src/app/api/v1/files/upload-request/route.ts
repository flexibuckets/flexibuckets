import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';
// --- Use Minio client ---
import * as Minio from 'minio';

// POST /api/v1/files/upload-request
// Creates a file record and returns a presigned URL for upload
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { fileName, fileSize, contentType, folderId } = await req.json();

  // --- Validation ---
  if (!fileName || !fileSize || !contentType || !folderId) {
    return new NextResponse(
      'Missing fields: fileName, fileSize, contentType, folderId',
      { status: 400 }
    );
  }

  // --- Check Folder and Bucket Ownership ---
  const parentFolder = await prisma.folder.findFirst({
    where: { id: folderId, userId: user.id },
    include: { s3Credential: true },
  });

  if (!parentFolder || !parentFolder.s3Credential) {
    return new NextResponse('Folder not found or access denied', {
      status: 404,
    });
  }

  const s3Credential = parentFolder.s3Credential;

  // TODO: Add your storage quota check logic here
  // ...

  let newFile;
  let s3Key;
  let fileUrl;

  try {
    // 1. Create the File record in the database
    newFile = await prisma.file.create({
      data: {
        name: fileName,
        key: 'PENDING', // Will be updated
        url: 'PENDING', // Will be updated
        size: fileSize.toString(),
        type: contentType,
        status: 'UPLOADING',
        userId: user.id,
        folderId: folderId,
        s3CredentialId: s3Credential.id,
      },
    });

    // 2. Generate the S3 key and URL
    s3Key = `${user.id}/${s3Credential.id}/${newFile.id}/${fileName}`;
    fileUrl = `${s3Credential.endpointUrl}/${s3Credential.bucket}/${s3Key}`;

    // 3. Update the file record with the final key and URL
    await prisma.file.update({
      where: { id: newFile.id },
      data: {
        key: s3Key,
        url: fileUrl,
      },
    });

    // 4. Configure Minio Client
    const url = new URL(s3Credential.endpointUrl);
    const s3Client = new Minio.Client({
      endPoint: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:.' ? 443 : 80),
      useSSL: url.protocol === 'https:',
      accessKey: s3Credential.accessKey,
      secretKey: s3Credential.secretKey,
      region: s3Credential.region || 'us-east-1', // Default region if not provided
      pathStyle: true, 
    });

    // 5. Generate the presigned PUT URL
    const expires = 60 * 15; // 15 minutes
    
    // We can enforce content type and length with request parameters
    // Note: The client's PUT request *must* include these exact headers
    const reqParams = {
      'Content-Type': contentType,
      'Content-Length': fileSize,
    };

    const uploadUrl = await s3Client.presignedUrl(
      'PUT',
      s3Credential.bucket,
      s3Key,
      expires,
      reqParams
    );

    return NextResponse.json({
      uploadUrl: uploadUrl,
      fileId: newFile.id,
      fileUrl: fileUrl,
    });
  } catch (error) {
    console.error('Upload request error:', error);
    // If we created a file record but failed, roll it back
    if (newFile) {
      await prisma.file.delete({ where: { id: newFile.id } });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

