import { NextResponse } from 'next/server';
import { deleteFile } from '@/lib/s3';
import { auth } from '@/auth';

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileId, s3CredentialId } = await request.json();

    if (!fileId || !s3CredentialId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await deleteFile({
      userId: session.user.id,
      fileId,
      s3CredentialId,
    });

    return NextResponse.json({ message: "File deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}