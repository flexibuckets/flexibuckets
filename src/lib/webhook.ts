import { WebhookEvent } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

interface DispatchWebhookParams {
  userId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
}

export async function getUserWebhooks(userId: string) {
  return prisma.webhook.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWebhook({
  userId,
  url,
  secret,
  events,
  description,
}: {
  userId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  description?: string;
}) {
  return prisma.webhook.create({
    data: {
      userId,
      url,
      secret,
      events,
      description,
    },
  });
}

export async function deleteWebhook({ webhookId, userId }: { webhookId: string; userId: string }) {
  return prisma.webhook.delete({
    where: { id: webhookId, userId },
  });
}

export async function toggleWebhook({ webhookId, userId, enabled }: { webhookId: string; userId: string; enabled: boolean }) {
  return prisma.webhook.update({
    where: { id: webhookId, userId },
    data: { enabled },
  });
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function dispatchWebhooks({ userId, event, payload }: DispatchWebhookParams) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      userId,
      enabled: true,
      events: { has: event },
    },
  });

  const results = await Promise.allSettled(
    webhooks.map(async (webhook) => {
      const timestamp = Date.now();
      const body = JSON.stringify({
        event,
        timestamp,
        data: payload,
      });
      const signature = signPayload(body, webhook.secret);

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-FlexiBuckets-Event': event,
            'X-FlexiBuckets-Signature': `sha256=${signature}`,
            'X-FlexiBuckets-Timestamp': timestamp.toString(),
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`Webhook responded with ${response.status}`);
        }

        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: 0,
          },
        });

        return { webhookId: webhook.id, status: 'success' };
      } catch (error) {
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            failureCount: { increment: 1 },
          },
        });

        console.error(`Webhook ${webhook.id} delivery failed:`, error);
        return { webhookId: webhook.id, status: 'failed', error: (error as Error).message };
      }
    })
  );

  return results;
}

export async function testWebhook({ webhookId, userId }: { webhookId: string; userId: string }) {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId, userId },
  });

  if (!webhook) throw new Error('Webhook not found');

  const testPayload = {
    event: 'test',
    timestamp: Date.now(),
    data: { message: 'Test webhook from FlexiBuckets' },
  };
  const body = JSON.stringify(testPayload);
  const signature = signPayload(body, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FlexiBuckets-Event': 'test',
        'X-FlexiBuckets-Signature': `sha256=${signature}`,
        'X-FlexiBuckets-Timestamp': Date.now().toString(),
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
