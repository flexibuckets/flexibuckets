import { executeUpdate } from '@/lib/version-checker';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { version, shaShort } = await req.json();
    const success = await executeUpdate(version, shaShort);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Update failed' },
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

