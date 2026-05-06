import { NextRequest, NextResponse } from 'next/server';
import { listS3Objects, importExistingBucketObjects } from '@/lib/s3';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const s3CredentialId = searchParams.get('s3CredentialId');

    if (!s3CredentialId) {
      return NextResponse.json(
        { error: 'Missing s3CredentialId' },
        { status: 400 }
      );
    }

    const objects = await listS3Objects(s3CredentialId);

    const files = objects.filter((o) => !o.name.endsWith('/'));
    const folders = new Set<string>();
    for (const obj of files) {
      const segments = obj.name.split('/').filter(Boolean);
      if (segments.length > 1) {
        for (let i = 1; i < segments.length; i++) {
          folders.add(segments.slice(0, i).join('/'));
        }
      }
    }

    return NextResponse.json({
      totalObjects: files.length,
      totalFolders: folders.size,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      sampleFiles: files.slice(0, 20).map((f) => ({
        name: f.name,
        size: f.size,
        lastModified: f.lastModified,
      })),
    });
  } catch (error) {
    console.error('Failed to list S3 objects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list objects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { s3CredentialId } = body;

    if (!s3CredentialId) {
      return NextResponse.json(
        { error: 'Missing s3CredentialId' },
        { status: 400 }
      );
    }

    const result = await importExistingBucketObjects({
      userId: session.user.id,
      s3CredentialId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to import objects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
