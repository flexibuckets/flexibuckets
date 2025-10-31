// File: app/api/v1/files/upload-complete/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/api/index';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// POST /api/v1/files/upload-complete
// Marks an upload as complete and updates user storage
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { fileId } = await req.json();

  if (!fileId) {
    return new NextResponse('Missing fileId', { status: 400 });
  }

  try {
    // Find the file to verify ownership and get its size
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Verify the user making the request owns the file
    if (file.userId !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // --- Start of Fix ---
    // Fetch the current user data to get the current totalUploadSize
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totalUploadSize: true },
    });

    if (!currentUser) {
        // This should theoretically not happen if getRequestUser succeeded
        return new NextResponse('User not found', { status: 404 });
    }

    // Calculate the new total size
    const currentSize = BigInt(currentUser.totalUploadSize || '0');
    const fileSize = BigInt(file.size); // Assuming file.size is stored as string
    const newTotalSize = currentSize + fileSize;

    // Update the user's total upload size with the new string value
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalUploadSize: newTotalSize.toString(), // Update with the new string value
      },
    });
    // --- End of Fix ---

    // Revalidate relevant paths if using Next.js caching heavily (optional but good practice)
    // TODO: Determine the correct paths to revalidate based on your application structure
    // Example: If files are shown under a bucket route, revalidate that
    // const bucketName = ... // Need to fetch bucket name if revalidating specific bucket
    // revalidatePath(`/dashboard/bucket/${bucketName}`);
    // You might also need to revalidate paths related to user storage stats
    revalidatePath(`/dashboard/stats`); // Example path
    
    // Using a more generic revalidation if specific paths are complex to determine
    // revalidatePath('/dashboard', 'layout');


    return NextResponse.json({
      message: 'Upload successfully completed',
      fileId: fileId,
    });
  } catch (error) {
    console.error('Upload complete error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

