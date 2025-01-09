import { checkForUpdates } from '@/lib/version-checker';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const updateInfo = await checkForUpdates();
    return NextResponse.json(updateInfo);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check for updates' },
      { status: 500 }
    );
  }
}

