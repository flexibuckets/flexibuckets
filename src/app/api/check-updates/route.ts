import { checkForUpdates } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const updateInfo = await checkForUpdates();
    console.log('Update info:', updateInfo);
    return NextResponse.json(updateInfo);
  } catch (error) {
    console.error('Error in check-updates route:', error);
    return NextResponse.json(
      { error: 'Failed to check for updates', details: error },
      { status: 500 }
    );
  }
}

