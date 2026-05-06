export const runtime = 'nodejs';
import { executeUpdate } from '@/lib/version-checker';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Auth check — admin only
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { version } = await req.json();
    if (!version || typeof version !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Version is required' },
        { status: 400 }
      );
    }

    const success = await executeUpdate(version);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Update failed. Check server logs for details.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update execution failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
