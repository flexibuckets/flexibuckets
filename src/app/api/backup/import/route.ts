import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { decryptBackup } from '@/lib/backup-crypto';
import { Prisma } from '@prisma/client';
import { S3Provider, EmailProvider, WebhookEvent } from '@prisma/client';

interface BackupPayload {
  version: number;
  exportedAt: string;
  data: {
    users: Array<Record<string, unknown>>;
    s3Credentials: Array<Record<string, unknown>>;
    settings: Array<Record<string, unknown>>;
    teams: Array<Record<string, unknown>>;
    teamMembers: Array<Record<string, unknown>>;
    teamSharedBuckets: Array<Record<string, unknown>>;
    webhooks: Array<Record<string, unknown>>;
    publicUploadLinks: Array<Record<string, unknown>>;
  };
}

/**
 * POST /api/backup/import
 * Body: { keyword: string, backup: string }
 *
 * Decrypts and imports a backup file, restoring the full system configuration.
 * Uses upsert so it can safely merge into an existing instance.
 * Only accessible to admin users.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const keyword: string = body.keyword?.trim();
    const backupStr: string = body.backup?.trim();

    if (!keyword || keyword.includes(' ')) {
      return NextResponse.json(
        { error: 'Keyword is required and must not contain spaces' },
        { status: 400 }
      );
    }
    if (!backupStr) {
      return NextResponse.json(
        { error: 'Backup data is required' },
        { status: 400 }
      );
    }

    // ── Decrypt ───────────────────────────────────────────────────────────
    let payload: BackupPayload;
    try {
      payload = decryptBackup<BackupPayload>(backupStr, keyword);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Decryption failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!payload?.data) {
      return NextResponse.json(
        { error: 'Invalid backup structure' },
        { status: 400 }
      );
    }

    const { data } = payload;

    const stats = {
      users: 0,
      s3Credentials: 0,
      settings: 0,
      teams: 0,
      teamMembers: 0,
      teamSharedBuckets: 0,
      webhooks: 0,
      publicUploadLinks: 0,
    };

    // ── Import in a transaction ───────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      // 1. Users
      for (const u of data.users ?? []) {
        await tx.user.upsert({
          where: { id: u.id as string },
          update: {
            name: u.name as string | null,
            email: u.email as string,
            password: u.password as string | null,
            image: u.image as string | null,
            isAdmin: u.isAdmin as boolean,
            totalUploadSize: u.totalUploadSize as string,
            totalFileShares: u.totalFileShares as number,
            totalSharedStorage: u.totalSharedStorage as string,
            totalDownloadedSize: u.totalDownloadedSize as string,
            teamMaxMembers: u.teamMaxMembers as number,
            currentTeamMembers: u.currentTeamMembers as number,
          },
          create: {
            id: u.id as string,
            name: u.name as string | null,
            email: u.email as string,
            password: u.password as string | null,
            image: u.image as string | null,
            isAdmin: u.isAdmin as boolean,
            totalUploadSize: (u.totalUploadSize as string) ?? '0',
            totalFileShares: (u.totalFileShares as number) ?? 0,
            totalSharedStorage: (u.totalSharedStorage as string) ?? '0',
            totalDownloadedSize: (u.totalDownloadedSize as string) ?? '0',
            teamMaxMembers: (u.teamMaxMembers as number) ?? 0,
            currentTeamMembers: (u.currentTeamMembers as number) ?? 0,
          },
        });
        stats.users++;
      }

      // 2. S3 Credentials (secrets will be re-encrypted by the Prisma middleware on write)
      for (const c of data.s3Credentials ?? []) {
        await tx.s3Credential.upsert({
          where: { id: c.id as string },
          update: {
            userId: c.userId as string,
            accessKey: c.accessKey as string,
            secretKey: c.secretKey as string,
            bucket: c.bucket as string,
            region: (c.region as string) ?? 'auto',
            provider: (c.provider as S3Provider) ?? null,
            endpointUrl: c.endpointUrl as string,
          },
          create: {
            id: c.id as string,
            userId: c.userId as string,
            accessKey: c.accessKey as string,
            secretKey: c.secretKey as string,
            bucket: c.bucket as string,
            region: (c.region as string) ?? 'auto',
            provider: (c.provider as S3Provider) ?? null,
            endpointUrl: c.endpointUrl as string,
          },
        });
        stats.s3Credentials++;
      }

      // 3. Settings
      for (const s of data.settings ?? []) {
        await tx.settings.upsert({
          where: { id: s.id as string },
          update: {
            allowSignups: s.allowSignups as boolean,
            emailProvider: (s.emailProvider as EmailProvider) ?? null,
            emailFrom: s.emailFrom as string | null,
            smtpConfig: s.smtpConfig ? (s.smtpConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
            resendConfig: s.resendConfig ? (s.resendConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
            domain: s.domain as string | null,
          },
          create: {
            id: s.id as string,
            allowSignups: (s.allowSignups as boolean) ?? false,
            emailProvider: (s.emailProvider as EmailProvider) ?? null,
            emailFrom: s.emailFrom as string | null,
            smtpConfig: s.smtpConfig ? (s.smtpConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
            resendConfig: s.resendConfig ? (s.resendConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
            domain: s.domain as string | null,
          },
        });
        stats.settings++;
      }

      // 4. Teams
      for (const t of data.teams ?? []) {
        await tx.team.upsert({
          where: { id: t.id as string },
          update: {
            name: t.name as string,
            description: t.description as string | null,
            ownerId: t.ownerId as string,
            totalStorageUsed: (t.totalStorageUsed as string) ?? '0',
            inviteCode: t.inviteCode as string | null,
            maxMembers: (t.maxMembers as number) ?? 5,
            currentMembers: (t.currentMembers as number) ?? 1,
            totalSharedFiles: (t.totalSharedFiles as number) ?? 0,
            totalSharedStorage: (t.totalSharedStorage as string) ?? '0',
          },
          create: {
            id: t.id as string,
            name: t.name as string,
            description: t.description as string | null,
            ownerId: t.ownerId as string,
            totalStorageUsed: (t.totalStorageUsed as string) ?? '0',
            inviteCode: t.inviteCode as string | null,
            maxMembers: (t.maxMembers as number) ?? 5,
            currentMembers: (t.currentMembers as number) ?? 1,
            totalSharedFiles: (t.totalSharedFiles as number) ?? 0,
            totalSharedStorage: (t.totalSharedStorage as string) ?? '0',
          },
        });
        stats.teams++;
      }

      // 5. Team Members
      for (const tm of data.teamMembers ?? []) {
        await tx.teamMember.upsert({
          where: {
            userId_teamId: {
              userId: tm.userId as string,
              teamId: tm.teamId as string,
            },
          },
          update: {
            role: tm.role as 'OWNER' | 'ADMIN' | 'MEMBER',
          },
          create: {
            id: tm.id as string,
            userId: tm.userId as string,
            teamId: tm.teamId as string,
            role: (tm.role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? 'MEMBER',
          },
        });
        stats.teamMembers++;
      }

      // 6. Team Shared Buckets
      for (const tb of data.teamSharedBuckets ?? []) {
        await tx.teamSharedBucket.upsert({
          where: { id: tb.id as string },
          update: {
            teamId: tb.teamId as string,
            s3CredentialId: tb.s3CredentialId as string,
            name: tb.name as string,
            addedById: tb.addedById as string,
            permissions: tb.permissions as 'READ_ONLY' | 'READ_WRITE' | 'FULL_ACCESS',
          },
          create: {
            id: tb.id as string,
            teamId: tb.teamId as string,
            s3CredentialId: tb.s3CredentialId as string,
            name: tb.name as string,
            addedById: tb.addedById as string,
            permissions:
              (tb.permissions as 'READ_ONLY' | 'READ_WRITE' | 'FULL_ACCESS') ?? 'READ_WRITE',
          },
        });
        stats.teamSharedBuckets++;
      }

      // 7. Webhooks (secrets will be re-encrypted by the Prisma middleware)
      for (const w of data.webhooks ?? []) {
        await tx.webhook.upsert({
          where: { id: w.id as string },
          update: {
            userId: w.userId as string,
            url: w.url as string,
            secret: w.secret as string,
            events: w.events as WebhookEvent[],
            description: w.description as string | null,
            enabled: (w.enabled as boolean) ?? true,
            failureCount: (w.failureCount as number) ?? 0,
          },
          create: {
            id: w.id as string,
            userId: w.userId as string,
            url: w.url as string,
            secret: w.secret as string,
            events: w.events as WebhookEvent[],
            description: w.description as string | null,
            enabled: (w.enabled as boolean) ?? true,
            failureCount: (w.failureCount as number) ?? 0,
          },
        });
        stats.webhooks++;
      }

      // 8. Public Upload Links
      for (const pl of data.publicUploadLinks ?? []) {
        await tx.publicUploadLink.upsert({
          where: { id: pl.id as string },
          update: {
            userId: pl.userId as string,
            s3CredentialId: pl.s3CredentialId as string,
            folderName: (pl.folderName as string) ?? 'public-uploads',
            token: pl.token as string,
            maxFileSize: (pl.maxFileSize as number) ?? 104857600,
            maxFileCount: pl.maxFileCount as number | null,
            currentFileCount: (pl.currentFileCount as number) ?? 0,
            allowedTypes: pl.allowedTypes as string | null,
            expiresAt: pl.expiresAt ? new Date(pl.expiresAt as string) : null,
            isExpired: (pl.isExpired as boolean) ?? false,
          },
          create: {
            id: pl.id as string,
            userId: pl.userId as string,
            s3CredentialId: pl.s3CredentialId as string,
            folderName: (pl.folderName as string) ?? 'public-uploads',
            token: pl.token as string,
            maxFileSize: (pl.maxFileSize as number) ?? 104857600,
            maxFileCount: pl.maxFileCount as number | null,
            currentFileCount: (pl.currentFileCount as number) ?? 0,
            allowedTypes: pl.allowedTypes as string | null,
            expiresAt: pl.expiresAt ? new Date(pl.expiresAt as string) : null,
            isExpired: (pl.isExpired as boolean) ?? false,
          },
        });
        stats.publicUploadLinks++;
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Backup restored successfully',
      exportedAt: payload.exportedAt,
      stats,
    });
  } catch (error) {
    console.error('[backup/import]', error);
    const message =
      error instanceof Error ? error.message : 'Failed to import backup';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
