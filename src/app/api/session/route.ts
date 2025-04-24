import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      { error: `User Not Found in database` },
      { status: 401 }
    );
  }
  const { user } = session;
  return NextResponse.json(user);
}
