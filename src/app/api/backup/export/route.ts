import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { encryptBackup } from '@/lib/backup-crypto';

/**
 * POST /api/backup/export
 * Body: { keyword: string }
 *
 * Exports the full system configuration (users, buckets, settings, teams, webhooks,
 * public upload links) as a single encrypted backup string.
 * Only accessible to admin users.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can export
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const keyword: string = body.keyword?.trim();

    if (!keyword || keyword.includes(' ')) {
      return NextResponse.json(
        { error: 'Keyword is required and must not contain spaces' },
        { status: 400 }
      );
    }

    // ── Gather all data to backup ─────────────────────────────────────────
    const [
      users,
      s3Credentials,
      settings,
      teams,
      teamMembers,
      teamSharedBuckets,
      webhooks,
      publicUploadLinks,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          image: true,
          isAdmin: true,
          totalUploadSize: true,
          totalFileShares: true,
          totalSharedStorage: true,
          totalDownloadedSize: true,
          teamMaxMembers: true,
          currentTeamMembers: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // S3 credentials are transparently decrypted by the Prisma middleware
      prisma.s3Credential.findMany(),
      prisma.settings.findMany(),
      prisma.team.findMany(),
      prisma.teamMember.findMany(),
      prisma.teamSharedBucket.findMany(),
      // Webhook secrets are transparently decrypted by the Prisma middleware
      prisma.webhook.findMany(),
      prisma.publicUploadLink.findMany(),
    ]);

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        users,
        s3Credentials,
        settings,
        teams,
        teamMembers,
        teamSharedBuckets,
        webhooks,
        publicUploadLinks,
      },
    };

    const encrypted = encryptBackup(payload, keyword);

    return NextResponse.json({ backup: encrypted });
  } catch (error) {
    console.error('[backup/export]', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}
