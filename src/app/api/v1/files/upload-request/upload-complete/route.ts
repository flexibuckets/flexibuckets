import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';


export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { fileId } = await req.json();

  if (!fileId) {
    return new NextResponse('Missing field: fileId', { status: 400 });
  }

  try {
    // 1. Find the file and verify ownership
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: user.id,
      },
    });

    if (!file) {
      return new NextResponse('File not found or access denied', {
        status: 404,
      });
    }

    // 2. Check if it's already completed
    if (file.status === 'COMPLETED') {
      return NextResponse.json({ message: 'File already marked as complete' });
    }

    // 3. Update file status to 'COMPLETED'
    await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'COMPLETED',
      },
    });

    // 4. Update user's total storage usage
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (userRecord) {
      const currentSize = BigInt(userRecord.totalUploadSize);
      const fileSize = BigInt(file.size);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          totalUploadSize: (currentSize + fileSize).toString(),
        },
      });
    }

    return NextResponse.json({
      message: 'Upload successfully completed',
      fileId: fileId,
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
