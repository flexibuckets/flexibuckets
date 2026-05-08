import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAuditLogs } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') as AuditAction | null;
    const resourceType = searchParams.get('resourceType') || undefined;
    const resourceId = searchParams.get('resourceId') || undefined;
    const teamId = searchParams.get('teamId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    const result = await getAuditLogs({
      userId: session.user.id,
      action: action || undefined,
      resourceType,
      resourceId,
      teamId,
      limit: Math.min(limit, 100),
      offset,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
