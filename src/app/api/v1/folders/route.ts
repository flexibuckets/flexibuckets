// File: app/api/v1/folders/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';

// POST /api/v1/folders
// *** NOW FINDS OR CREATES (UPSERT) A FOLDER ***
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { name, s3CredentialId, parentId } = await req.json();

  // --- Validation ---
  if (!name || !s3CredentialId) {
    return new NextResponse('Missing fields: name, s3CredentialId', {
      status: 400,
    });
  }

  const normalizedParentId = parentId || null;

  try {
    // 1. Check if the folder already exists
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name,
        parentId: normalizedParentId,
        s3CredentialId: s3CredentialId,
        userId: user.id,
      },
    });

    // 2. If it exists, return it
    if (existingFolder) {
      return NextResponse.json(existingFolder);
    }

    // 3. If not, create it
    const newFolder = await prisma.folder.create({
      data: {
        name,
        userId: user.id,
        s3CredentialId,
        parentId: normalizedParentId,
      },
    });

    return NextResponse.json(newFolder);
  } catch (error) {
    console.error('Error in find-or-create folder:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

