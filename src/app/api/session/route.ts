import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const headersList = headers();
  const sessionToken = headersList.get("sessionToken");

  if (!sessionToken)
    return NextResponse.json({ error: "No session Token" }, { status: 401 });
  const dbUser = await prisma.session.findUnique({
    where: {
      sessionToken: sessionToken,
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          totalUploadSize: true,
        },
      },
    },
  });

  if (!dbUser || !dbUser.user) {
    return NextResponse.json(
      { error: `User Not Found in database: ${dbUser}` },
      { status: 401 }
    );
  }
  const { user } = dbUser;
  return NextResponse.json(user);
}
