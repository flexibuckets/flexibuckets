import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();

  // Verify team bucket access and permissions
  const teamBucket = await prisma.teamSharedBucket.findFirst({
    where: {
      s3CredentialId: data.s3CredentialId,
      team: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
  });

  if (
    !teamBucket ||
    !['READ_WRITE', 'FULL_ACCESS'].includes(teamBucket.permissions)
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const file = await prisma.file.create({
      data: {
        name: data.name,
        type: data.type,
        size: data.size,
        s3Key: data.s3Key,
        userId: session.user.id,
        s3CredentialId: data.s3CredentialId,
      },
    });

    return Response.json(file);
  } catch (error) {
    return Response.json({ error: 'Failed to create file' }, { status: 500 });
  }
}
