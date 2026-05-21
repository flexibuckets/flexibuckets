import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserWebhooks, createWebhook } from '@/lib/webhook';
import { createAuditLog } from '@/lib/audit';
import { WebhookEvent } from '@prisma/client';
import { nanoid } from 'nanoid';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const webhooks = await getUserWebhooks(session.user.id);
    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { url, events, description } = await req.json();

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'URL and at least one event are required' }, { status: 400 });
    }

    const validEvents: string[] = Object.values(WebhookEvent);
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(', ')}` }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const secret = `whsec_${nanoid(32)}`;
    const webhook = await createWebhook({
      userId: session.user.id,
      url,
      secret,
      events,
      description,
    });

    try {
      await createAuditLog({
      userId: session.user.id,
      action: 'WEBHOOK_CREATED',
      resourceType: 'webhook',
      resourceId: webhook.id,
      details: { url, events },
    });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({ ...webhook, secret }, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}
