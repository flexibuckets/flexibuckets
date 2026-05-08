import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const uploadLink = await prisma.publicUploadLink.findUnique({
      where: { token: params.token },
      select: {
        maxFileSize: true,
        maxFileCount: true,
        currentFileCount: true,
        allowedTypes: true,
        isExpired: true,
        expiresAt: true,
      },
    });

    if (!uploadLink) {
      return NextResponse.json({ error: 'Invalid upload link' }, { status: 404 });
    }

    if (uploadLink.isExpired || (uploadLink.expiresAt && new Date(uploadLink.expiresAt) <= new Date())) {
      await prisma.publicUploadLink.update({
        where: { token: params.token },
        data: { isExpired: true },
      });
      return NextResponse.json({ error: 'This upload link has expired' }, { status: 410 });
    }

    if (uploadLink.maxFileCount && uploadLink.currentFileCount >= uploadLink.maxFileCount) {
      return NextResponse.json({ error: 'Upload limit reached for this link' }, { status: 403 });
    }

    return NextResponse.json(uploadLink);
  } catch (error) {
    console.error('Error fetching upload link info:', error);
    return NextResponse.json({ error: 'Failed to fetch link info' }, { status: 500 });
  }
}
