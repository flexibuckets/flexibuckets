// File: app/api/v1/files/upload-request/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';
import * as Minio from 'minio';


// --- Define the type for the folder lookup result ---
type FolderQueryResult = {
  name: string;
  parentId: string | null;
} | null;
// ---------------------------------------------------

// --- Helper function to get the full folder path ---
async function getFolderPath(folderId: string, userId: string): Promise<string> {
  let path = '';
  let currentFolderId: string | null = folderId;

  while (currentFolderId) {
    // --- Add explicit type annotation here ---
    const folder: FolderQueryResult = await prisma.folder.findFirst({
      where: { id: currentFolderId, userId: userId },
      select: { name: true, parentId: true },
    });
    // --- End of fix ---

    if (!folder) {
      // Should not happen if initial folder check passes, but good for safety
      throw new Error('Folder path reconstruction failed.');
    }

    // Prepend the folder name to the path
    path = path ? `${folder.name}/${path}` : `${folder.name}/`;
    currentFolderId = folder.parentId; // Move to the parent
  }
  return path;
}
// ---------------------------------------------------

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
  });

  if (!parentFolder) {
    return new NextResponse('Folder not found or access denied', {
      status: 404,
    });
  }

  const s3Credential = await prisma.s3Credential.findUnique({
    where: { id: parentFolder.s3CredentialId },
  });

  if (!s3Credential) {
    return new NextResponse('S3 Credentials not found for this folder', {
      status: 500,
    });
  }

  // TODO: Add your storage quota check logic here
  // ...

  try {
    // 1. Get the full folder path
    const fullFolderPath = await getFolderPath(folderId, user.id);

    // 2. Generate the final S3 key including the full path (WITHOUT user ID)
    const s3Key = `${fullFolderPath}${fileName}`;
    console.log(`---> Generating S3 Key: ${s3Key}`); // Keep this for debugging

    // 3. Create the File record in the database
    const newFile = await prisma.file.create({
      data: {
        name: fileName,
        s3Key: s3Key, // Store the correct key
        size: fileSize.toString(),
        type: contentType,
        userId: user.id,
        folderId: folderId,
        s3CredentialId: s3Credential.id,
      },
    });

    // 4. Configure Minio Client
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
      useSSL: useSSL,
      accessKey: s3Credential.accessKey,
      secretKey: s3Credential.secretKey,
      region: s3Credential.region || 'us-east-1',
      pathStyle: true,
    });

    // 5. Generate the presigned PUT URL
    const expires = 60 * 15; // 15 minutes

    const reqParams = {
      'Content-Type': contentType,
      'Content-Length': fileSize.toString(),
    };

    const uploadUrl = await s3Client.presignedUrl(
      'PUT',
      s3Credential.bucket,
      s3Key, // Use the correct key
      expires,
      reqParams
    );

    return NextResponse.json({
      uploadUrl: uploadUrl,
      fileId: newFile.id,
    });
  } catch (error) {
    console.error('Upload request error:', error);
    // Add more specific error handling if needed
    if (
      error instanceof Error &&
      error.message.includes('duplicate key value violates unique constraint')
    ) {
      // Make error message more informative (without user ID)
      const fullKeyPath = `${await getFolderPath(folderId, user.id)}${fileName}`;
      return new NextResponse(
        `File with key '${fullKeyPath}' already exists in this folder path. Please rename the file or delete the existing one.`,
        { status: 409 }
      );
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

