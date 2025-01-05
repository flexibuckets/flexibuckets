import { NextRequest, NextResponse } from 'next/server';
import { getSharedFolderStructure } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { sharedFolderId: string } }
) {
  const sharedFolderId = params.sharedFolderId;

  try {
    const folderStructure = await getSharedFolderStructure(sharedFolderId);
    return NextResponse.json(folderStructure);
  } catch (error) {
    console.error('Error fetching shared folder structure:', error);
    return NextResponse.json({ error: "Failed to fetch folder structure" }, { status: 500 });
  }
}