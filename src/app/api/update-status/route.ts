import { NextResponse } from 'next/server';
import { checkForUpdates } from '@/lib/version-checker';

export async function GET() {
  try {
    const updateInfo = await checkForUpdates();
    
    if (!updateInfo) {
      return NextResponse.json({ updateAvailable: false });
    }

    return NextResponse.json({
      updateAvailable: true,
      version: updateInfo.version,
      requiredMigrations: updateInfo.requiredMigrations,
      changeLog: updateInfo.changeLog
    });
  } catch (error) {
    console.error('Failed to check update status:', error);
    return NextResponse.json(
      { error: 'Failed to check for updates' },
      { status: 500 }
    );
  }
} 