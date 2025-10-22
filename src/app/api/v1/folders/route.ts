import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';

// POST /api/v1/folders
// Creates a new folder in a specific bucket or parent folder
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { name, s3CredentialId, parentId } = await req.json();

  // --- Validation ---
  if (!name || !s3CredentialId) {
    return new NextResponse('Missing required fields: name and s3CredentialId', {
      status: 400,
    });
  }

  // 1. Verify user owns the bucket
  const bucket = await prisma.s3Credential.findFirst({
    where: { id: s3CredentialId, userId: user.id },
  });

  if (!bucket) {
    return new NextResponse('Bucket not found or access denied', {
      status: 404,
    });
  }

  // 2. (If provided) Verify user owns the parent folder
  if (parentId) {
    const parentFolder = await prisma.folder.findFirst({
      where: {
        id: parentId,
        userId: user.id,
        s3CredentialId: s3CredentialId, // Ensure parent is in the same bucket
      },
    });
    if (!parentFolder) {
      return new NextResponse('Parent folder not found or access denied', {
        status: 404,
      });
    }
  }

  // --- Create Folder ---
  try {
    const newFolder = await prisma.folder.create({
      data: {
        name: name,
        userId: user.id,
        s3CredentialId: s3CredentialId,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(newFolder, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// You can also add a GET method here to list folders
// e.g., /api/v1/folders?bucketId=...&parentId=...
