import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const links = await prisma.publicUploadLink.findMany({
      where: { userId: session.user.id },
      include: { s3Credential: { select: { bucket: true, endpointUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching public upload links:', error);
    return NextResponse.json({ error: 'Failed to fetch upload links' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      s3CredentialId,
      folderId,
      maxFileSize,
      maxFileCount,
      allowedTypes,
      expiresAt,
    } = await req.json();

    if (!s3CredentialId) {
      return NextResponse.json({ error: 'Bucket selection is required' }, { status: 400 });
    }

    const credential = await prisma.s3Credential.findUnique({
      where: { id: s3CredentialId, userId: session.user.id },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Bucket not found or not owned by you' }, { status: 404 });
    }

    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId, userId: session.user.id },
      });
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    const token = nanoid(24);

    const link = await prisma.publicUploadLink.create({
      data: {
        userId: session.user.id,
        s3CredentialId,
        folderId: folderId || null,
        token,
        maxFileSize: maxFileSize || 104857600,
        maxFileCount: maxFileCount || null,
        allowedTypes: allowedTypes || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/upload/${token}`;

    return NextResponse.json({ ...link, uploadUrl }, { status: 201 });
  } catch (error) {
    console.error('Error creating public upload link:', error);
    return NextResponse.json({ error: 'Failed to create upload link' }, { status: 500 });
  }
}
