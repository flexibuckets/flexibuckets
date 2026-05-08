import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteWebhook, toggleWebhook } from '@/lib/webhook';
import { createAuditLog } from '@/lib/audit';

export async function DELETE(
  req: Request,
  { params }: { params: { webhookId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const webhook = await deleteWebhook({
      webhookId: params.webhookId,
      userId: session.user.id,
    });

    await createAuditLog({
      userId: session.user.id,
      action: 'WEBHOOK_DELETED',
      resourceType: 'webhook',
      resourceId: params.webhookId,
      details: { url: webhook.url },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { webhookId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { enabled } = await req.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Enabled must be a boolean' }, { status: 400 });
    }

    const webhook = await toggleWebhook({
      webhookId: params.webhookId,
      userId: session.user.id,
      enabled,
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error('Error toggling webhook:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}
