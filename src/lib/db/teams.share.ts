import { prisma } from '@/lib/prisma';
import { TeamRole } from '@prisma/client';

export async function canShareTeamFile(
  userId: string,
  fileUserId: string,
  teamId: string
) {
  const member = await prisma.teamMember.findFirst({
    where: { userId, teamId },
    include: {
      team: {
        include: {
          members: {
            where: { userId: fileUserId },
          },
        },
      },
    },
  });

  if (!member) return false;

  // Owner can share anyone's files
  if (member.role === TeamRole.OWNER) return true;

  // Admin can share member files but not owner files
  if (member.role === TeamRole.ADMIN) {
    const fileOwnerMember = member.team.members[0];
    return fileOwnerMember.role === TeamRole.MEMBER;
  }

  // Members can only share their own files
  return userId === fileUserId;
}

export async function isTeamSharingAllowed(teamId: string, fileSize: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) return false;

  // Check file count limit

  // Check storage limit
  const currentSharedStorage = BigInt(team.totalSharedStorage);
  const newFileSize = BigInt(fileSize);
  const totalAfterShare = currentSharedStorage + newFileSize;
  // const maxSharedStorage =
  //   BigInt(teamSharedStorageLimit) * BigInt(1024 * 1024 * 1024); // Convert GB to bytes

  return true;
}

export async function getTeamSharedFiles({
  userId,
  teamId,
}: {
  userId: string;
  teamId: string;
}) {
  const sharedFiles = await prisma.sharedFile.findMany({
    where: {
      teamId,
    },
    include: {
      file: true,
      sharedBy: { include: { teamMemberships: { where: { teamId } } } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedSharedFiles = sharedFiles.map(({ sharedBy, ...rest }) => ({
    ...rest,
    sharedBy: sharedBy?.name ?? 'Unknown',
    sharedByRole: sharedBy?.teamMemberships[0]?.role ?? 'MEMBER',
  }));

  const sharedFolders = await prisma.sharedFolder.findMany({
    where: {
      teamId,
    },
    include: {
      folder: true,
      sharedBy: { include: { teamMemberships: { where: { teamId } } } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  const formattedSharedFolders = sharedFolders.map(({ sharedBy, ...rest }) => ({
    ...rest,
    sharedBy: sharedBy?.name ?? 'Unknown',
    sharedByRole: sharedBy?.teamMemberships[0]?.role ?? 'MEMBER',
  }));

  return {
    sharedFiles: formattedSharedFiles,
    sharedFolders: formattedSharedFolders,
  };
}
