export const runtime = 'nodejs';
import { checkForUpdates } from '@/lib/version-checker';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateInfo = await checkForUpdates();
    return NextResponse.json(updateInfo);
  } catch (error) {
    console.error('Error in check-updates route:', error);
    return NextResponse.json(
      { error: 'Failed to check for updates', details: String(error) },
      { status: 500 }
    );
  }
}
