export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { checkForUpdates } from '@/lib/version-checker';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateInfo = await checkForUpdates();
    return NextResponse.json(updateInfo);
  } catch (error) {
    console.error('Failed to check update status:', error);
    return NextResponse.json(
      { error: 'Failed to check for updates' },
      { status: 500 }
    );
  }
}