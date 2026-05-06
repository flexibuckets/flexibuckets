import { auth } from '@/auth';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashKey } from './hash';

type RequestUser = {
  id: string;
} | null;

export async function getRequestUser(req: NextRequest): Promise<RequestUser> {
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id };
  }

  const plainTextKey = req.headers.get('x-api-key');
  if (!plainTextKey) {
    return null;
  }

  try {
    const hashed = await hashKey(plainTextKey);

    const apiKey = await prisma.apiKey.findUnique({
      where: { hashedKey: hashed },
      select: { userId: true, id: true },
    });

    if (apiKey && apiKey.userId) {
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(console.error);

      return { id: apiKey.userId };
    }
  } catch (error) {
    console.error('API Key validation error:', error);
    return null;
  }

  return null;
}
