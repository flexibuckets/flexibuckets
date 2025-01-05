import { executeUpdate } from '@/lib/version-checker';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { version } = await request.json();
    const success = await executeUpdate(version);
    
    if (!success) {
      throw new Error('Update failed');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to execute update' },
      { status: 500 }
    );
  }
}