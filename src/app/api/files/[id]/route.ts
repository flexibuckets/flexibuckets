import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPresignedUrl } from '@/lib/s3';
import { auth } from '@/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const file = await prisma.file.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        s3Key: true,
        s3CredentialId: true,
        userId: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.userId !== session.user.id) {
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId: session.user.id,
          team: {
            buckets: {
              some: { s3CredentialId: file.s3CredentialId },
            },
          },
        },
      });
      if (!teamMember) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const url = await getPresignedUrl(file.s3CredentialId, file.s3Key);

    try {
      await createAuditLog({
      userId: session.user.id,
      action: 'FILE_DOWNLOAD',
      resourceType: 'file',
      resourceId: file.id,
      resourceName: file.name,
      details: { size: file.size, type: file.type },
    });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
