import { auth } from '@/auth';
import { NextResponse } from 'next/server';

import { ADMIN_EMAILS } from '@/config/adminconfig';

export async function adminAuthMiddleware(request: Request) {
  const session = await auth();

  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
  }
}
