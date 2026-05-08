import { AuditAction, WebhookEvent } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

const AUDIT_TO_WEBHOOK_MAP: Partial<Record<AuditAction, WebhookEvent>> = {
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DELETE: 'FILE_DELETE',
  FILE_SHARE: 'FILE_SHARE',
  FILE_UNSHARE: 'FILE_UNSHARE',
  FOLDER_CREATE: 'FOLDER_CREATE',
  FOLDER_DELETE: 'FOLDER_DELETE',
  FOLDER_SHARE: 'FOLDER_SHARE',
  BUCKET_ADD: 'BUCKET_ADD',
  BUCKET_DELETE: 'BUCKET_DELETE',
  PUBLIC_UPLOAD_RECEIVED: 'PUBLIC_UPLOAD_RECEIVED',
};

interface CreateAuditLogParams {
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, unknown>;
  teamId?: string;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      null;
    const userAgent = headersList.get('user-agent') || null;

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        resourceName: params.resourceName ?? null,
        details: params.details ? (params.details as any) : undefined,
        ipAddress,
        userAgent,
        teamId: params.teamId ?? null,
      },
    });

    const webhookEvent = AUDIT_TO_WEBHOOK_MAP[params.action];
    if (webhookEvent) {
      const { dispatchWebhooks } = await import('@/lib/webhook');
      dispatchWebhooks({
        userId: params.userId,
        event: webhookEvent,
        payload: {
          action: params.action,
          resourceType: params.resourceType ?? null,
          resourceId: params.resourceId ?? null,
          resourceName: params.resourceName ?? null,
          details: params.details ?? null,
          timestamp: auditLog.createdAt,
        },
      }).catch((err) => {
        console.error('Webhook dispatch error:', err);
      });
    }

    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function getAuditLogs({
  userId,
  action,
  resourceType,
  resourceId,
  teamId,
  limit = 50,
  offset = 0,
  startDate,
  endDate,
}: {
  userId: string;
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: Record<string, unknown> = {
    userId,
    ...(action && { action }),
    ...(resourceType && { resourceType }),
    ...(resourceId && { resourceId }),
    ...(teamId && { teamId }),
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(endDate && { createdAt: { lte: endDate } }),
    ...(startDate &&
      endDate && { createdAt: { gte: startDate, lte: endDate } }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
