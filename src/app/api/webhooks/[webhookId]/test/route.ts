import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { testWebhook } from '@/lib/webhook';

export async function POST(
  req: Request,
  { params }: { params: { webhookId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await testWebhook({
      webhookId: params.webhookId,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing webhook:', error);
    return NextResponse.json({ error: 'Failed to test webhook' }, { status: 500 });
  }
}
