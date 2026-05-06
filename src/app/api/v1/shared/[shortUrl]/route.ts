import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getSharedFileInfo } from '@/app/actions';

export async function GET(
  req: NextRequest,
  { params }: { params: { shortUrl: string } }
) {
  try {
    const result = await getSharedFileInfo(params.shortUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching shared resource:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Shared resource not found or expired' },
      { status: 404 }
    );
  }
}
