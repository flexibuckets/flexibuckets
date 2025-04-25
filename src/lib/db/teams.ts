import { prisma } from '@/lib/prisma';
import {
  BucketPermission,
  TeamInvite,
  TeamJoinRequestStatus,
  TeamRole,
} from '@prisma/client';

import { auth } from '@/auth';

import { getBucketDetails, getMinioClient } from '../s3';

import { nanoid } from 'nanoid';

// Types
type CreateTeamParams = {
  name: string;
  description?: string;
  ownerId: string;
};

type AddTeamMemberParams = {
  userId: string;
  teamId: string;
  role?: TeamRole;
};

type AddTeamBucketParams = {
  teamId: string;
  s3CredentialId: string;
  name: string;
  addedById: string;
  permissions?: BucketPermission;
};

type TeamJoinRequestWithDetails = {
  id: string;
  teamId: string;
  userId: string;
  status: TeamJoinRequestStatus;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export async function verifyTeamPermissions(
  userId: string,
  teamId: string,
  requiredRoles: TeamRole[]
) {
  const member = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      role: {
        in: requiredRoles,
      },
    },
  });

  if (!member) {
    throw new Error('Unauthorized: Insufficient permissions');
  }

  return member;
}

export async function getUserTeamsCount(userId: string) {
  return await prisma.teamMember.count({
    where: {
      userId,
      role: TeamRole.OWNER,
    },
  });
}

export async function canCreateTeam(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamMaxMembers: true },
  });

  if (!user) return false;

  // const maxTeamsAllowed = Math.floor(user.teamMaxMembers / 5);
  // if (maxTeamsAllowed === 0) return false;

  // const userTeamsCount = await getUserTeamsCount(userId);
  return true;
}

export async function createTeam({
  name,
  description,
  ownerId,
}: CreateTeamParams) {
  const canCreate = await canCreateTeam(ownerId);
  if (!canCreate) {
    throw new Error('You have reached the maximum number of teams allowed');
  }

  return await prisma.team.create({
    data: {
      name,
      description,
      ownerId,
      inviteCode: nanoid(8),
      members: {
        create: {
          userId: ownerId,
          role: TeamRole.OWNER,
        },
      },
    },
    include: {
      members: true,
    },
  });
}

export async function getTeam(teamId: string) {
  return await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              totalUploadSize: true,
              totalFileShares: true,
            },
          },
        },
      },
    },
  });
}

export async function getUserTeams(userId: string) {
  return await prisma.teamMember.findMany({
    where: {
      userId,
      user: {
        isNot: undefined, // Ensure user exists
      },
    },
    include: {
      team: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
}

export async function addTeamMember({
  userId,
  teamId,
  role = TeamRole.MEMBER,
}: AddTeamMemberParams) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { role: TeamRole.OWNER },
        include: { user: true },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const owner = team.members[0]?.user;
  if (!owner) {
    throw new Error('Team owner not found');
  }

  const existingMember = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  });

  if (existingMember) {
    throw new Error('User is already a team member');
  }

  // Check team's specific member limit
  const teamMemberCount = await prisma.teamMember.count({
    where: { teamId },
  });

  if (teamMemberCount >= team.maxMembers) {
    throw new Error('Team has reached its member limit');
  }

  // Add member and update counters in transaction
  return await prisma.$transaction(async (tx) => {
    const member = await tx.teamMember.create({
      data: {
        userId,
        teamId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
  });
}

export async function removeTeamMember(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { role: TeamRole.OWNER },
        include: { user: true },
      },
    },
  });

  if (!team?.members[0]?.user) {
    throw new Error('Team owner not found');
  }

  const owner = team.members[0].user;
  const userToRemove = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });
  if (!userToRemove) {
    throw new Error('User not found');
  }
  return await prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
    await tx.teamInvite.deleteMany({
      where: {
        teamId,
        email: userToRemove.email,
      },
    });
    // Decrement owner's current team members count
    await tx.user.update({
      where: { id: owner.id },
      data: {
        currentTeamMembers: {
          decrement: 1,
        },
      },
    });
  });
}

export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: TeamRole
) {
  return await prisma.teamMember.update({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    data: { role },
  });
}

export async function removeTeamMemberFiles(teamId: string, userId: string) {
  // Get all files from this user in team buckets
  const teamBuckets = await prisma.teamSharedBucket.findMany({
    where: { teamId },
    include: {
      s3Credential: true,
    },
  });

  for (const bucket of teamBuckets) {
    // Get all files from this user in this bucket
    const files = await prisma.file.findMany({
      where: {
        userId,
        s3CredentialId: bucket.s3CredentialId,
      },
    });

    // Delete each file from S3 and database
    for (const file of files) {
      const minioClient = await getMinioClient(bucket.s3CredentialId);
      await minioClient.removeObject(bucket.s3Credential.bucket, file.s3Key);

      // Delete file record
      await prisma.file.delete({
        where: { id: file.id },
      });
    }
  }
}

// Team Bucket Operations
export async function getTeamBuckets(teamId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!team) {
      console.warn(`Team not found: ${teamId}`);
      return [];
    }

    if (team.members.length === 0) {
      console.warn(`User ${session.user.id} is not a member of team ${teamId}`);
      return [];
    }

    const bucketData = await prisma.teamSharedBucket.findMany({
      where: { teamId },
      include: {
        s3Credential: true,
        team: true,
      },
    });

    const buckets = await Promise.all(
      bucketData.map(async (bucket) => {
        try {
          const { s3Credential } = bucket;
          const bucketDetails = await getBucketDetails({
            bucketName: s3Credential.bucket,
            accessKey: s3Credential.accessKey,
            secretKey: s3Credential.secretKey,
            endpointUrl: s3Credential.endpointUrl,
            region: s3Credential.region,
          });

          return {
            id: bucket.s3CredentialId,
            name: bucket.name,
            filesCount: bucketDetails.totalFiles,
            size: bucketDetails.totalSizeInMB,
            isAccessible: bucketDetails.isAccessible,
            errorMessage: bucketDetails.errorMessage || undefined,
            endpointUrl: bucket.s3Credential.endpointUrl,
            isShared: true,
            permissions: bucket.permissions,
            team: bucket.team,
          };
        } catch (error) {
          console.error(`Error processing bucket ${bucket.id}:`, error);
          return {
            id: bucket.s3CredentialId,
            name: bucket.name,
            filesCount: 0,
            size: 0,
            endpointUrl: bucket.s3Credential.endpointUrl,
            isShared: true,
            permissions: bucket.permissions,
            team: bucket.team,
          };
        }
      })
    );

    return buckets;
  } catch (error) {
    console.error('Error in getTeamBuckets:', error);
    return [];
  }
}

export async function addTeamBucket({
  teamId,
  s3CredentialId,
  name,
  addedById,
  permissions = BucketPermission.READ_WRITE,
}: AddTeamBucketParams) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    throw new Error('Access Denied');
  }
  try {
    // Check if bucket is already shared with the team
    const existingBucket = await prisma.teamSharedBucket.findUnique({
      where: {
        teamId_s3CredentialId: {
          teamId,
          s3CredentialId,
        },
      },
    });

    if (existingBucket) {
      throw new Error('Bucket is already shared with this team');
    }

    return await prisma.teamSharedBucket.create({
      data: {
        teamId,
        s3CredentialId,
        name,
        addedById,
        permissions,
      },
      include: {
        s3Credential: true,
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error creating team buckets:', error);
    throw new Error('Access Denied');
  }
}

export async function updateTeamBucketPermissions(
  bucketId: string,
  permissions: BucketPermission
) {
  return await prisma.teamSharedBucket.update({
    where: { id: bucketId },
    data: { permissions },
  });
}

export async function canAccessTeam(userId: string, teamId: string) {
  try {
    const member = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!member) {
      console.warn(
        `User ${userId} attempted to access team ${teamId} without membership`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking team access:', error);
    return false;
  }
}

export async function canManageTeam(userId: string, teamId: string) {
  const member = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      role: {
        in: [TeamRole.OWNER, TeamRole.ADMIN],
      },
    },
  });
  return !!member;
}

export async function canManageBucket(userId: string, bucketId: string) {
  const bucket = await prisma.teamSharedBucket.findFirst({
    where: {
      id: bucketId,
      team: {
        members: {
          some: {
            userId,
            role: {
              in: [TeamRole.OWNER, TeamRole.ADMIN],
            },
          },
        },
      },
    },
  });
  return !!bucket;
}

// Team Storage Management
export async function updateTeamStorage(teamId: string, sizeChange: bigint) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { totalStorageUsed: true },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const currentStorage = BigInt(team.totalStorageUsed);
  const newStorage = (currentStorage + sizeChange).toString();

  return await prisma.team.update({
    where: { id: teamId },
    data: { totalStorageUsed: newStorage },
  });
}

export async function verifyTeamAccess(
  userId: string,
  teamId: string
): Promise<boolean> {
  const member = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
    },
  });
  return !!member;
}

export async function verifyTeamRole(
  userId: string,
  teamId: string,
  roles: TeamRole[]
): Promise<boolean> {
  const member = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      role: {
        in: roles,
      },
    },
  });
  return !!member;
}

export async function removeTeamBucket(bucketId: string, userId: string) {
  // Verify user has permission to manage buckets
  const hasPermission = await canManageBucket(userId, bucketId);
  if (!hasPermission) {
    throw new Error('Unauthorized: Insufficient permissions to remove bucket');
  }

  return await prisma.teamSharedBucket.delete({
    where: { id: bucketId },
  });
}

export async function generateTeamInviteLink(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { inviteCode: true },
  });

  if (!team?.inviteCode) {
    const inviteCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    await prisma.team.update({
      where: { id: teamId },
      data: { inviteCode },
    });
    return inviteCode;
  }

  return team.inviteCode;
}

export async function joinTeamByInviteCode(userId: string, inviteCode: string) {
  const team = await prisma.team.findUnique({
    where: { inviteCode },
    include: {
      members: true,
      joinRequests: {
        where: {
          userId,
          status: 'PENDING',
        },
      },
    },
  });

  if (!team) {
    throw new Error('Invalid invite code');
  }

  // Check if user is already a member
  if (team.members.some((member) => member.userId === userId)) {
    throw new Error('Already a team member');
  }

  // Check if user already has a pending request
  if (team.joinRequests.length > 0) {
    throw new Error('You already have a pending join request for this team');
  }

  // Create join request
  return await prisma.teamJoinRequest.create({
    data: {
      teamId: team.id,
      userId,
      status: 'PENDING',
    },
    include: {
      team: true,
      user: true,
    },
  });
}

export async function getTeamJoinRequests(
  teamId: string
): Promise<TeamJoinRequestWithDetails[]> {
  const requests = await prisma.teamJoinRequest.findMany({
    where: {
      teamId,
      status: 'PENDING',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return requests;
}

export async function handleTeamJoinRequest(
  requestId: string,
  status: 'ACCEPTED' | 'REJECTED',
  userId: string
) {
  const request = await prisma.teamJoinRequest.findUnique({
    where: { id: requestId },
    include: {
      team: {
        include: {
          members: {
            where: { role: 'OWNER' },
            include: { user: true },
          },
        },
      },
      user: true,
    },
  });

  if (!request) {
    throw new Error('Join request not found');
  }

  // Get team owner
  const owner = request.team.members[0]?.user;
  if (!owner) {
    throw new Error('Team owner not found');
  }

  // Verify the user has permission to handle requests
  await verifyTeamPermissions(userId, request.teamId, [
    TeamRole.OWNER,
    TeamRole.ADMIN,
  ]);

  // Start a transaction to handle the request
  return await prisma.$transaction(async (tx) => {
    // Update request status
    const updatedRequest = await tx.teamJoinRequest.update({
      where: { id: requestId },
      data: { status },
    });

    if (status === 'ACCEPTED') {
      // Check if user is already a member
      const existingMember = await tx.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: request.userId,
            teamId: request.teamId,
          },
        },
      });

      if (!existingMember) {
        // Add user to team and increment owner's current team members count
        await Promise.all([
          tx.teamMember.create({
            data: {
              userId: request.userId,
              teamId: request.teamId,
              role: TeamRole.MEMBER,
            },
          }),
          tx.user.update({
            where: { id: owner.id },
            data: {
              currentTeamMembers: {
                increment: 1,
              },
            },
          }),
        ]);
      }
    }

    return {
      request: updatedRequest,
      team: request.team,
      user: request.user,
    };
  });
}

export async function getJoinRequestsForTeam(teamId: string) {
  return await prisma.teamJoinRequest.findMany({
    where: {
      teamId,
      status: 'PENDING',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updateTeamSettings(
  teamId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    inviteCode?: string;
    maxMembers?: number;
  }
) {
  // Only owner can update team settings
  await verifyTeamPermissions(userId, teamId, [TeamRole.OWNER]);

  return await prisma.team.update({
    where: { id: teamId },
    data,
  });
}

export async function deleteTeam(teamId: string, userId: string) {
  // Only owner can delete team
  await verifyTeamPermissions(userId, teamId, [TeamRole.OWNER]);

  // Start a transaction to handle team deletion
  return await prisma.$transaction(async (tx) => {
    // Delete all team buckets and their files
    const teamBuckets = await tx.teamSharedBucket.findMany({
      where: { teamId },
      include: { s3Credential: true },
    });

    for (const bucket of teamBuckets) {
      // Delete files from S3
      const minioClient = await getMinioClient(bucket.s3CredentialId);
      const files = await tx.file.findMany({
        where: { s3CredentialId: bucket.s3CredentialId },
      });

      for (const file of files) {
        await minioClient.removeObject(bucket.s3Credential.bucket, file.s3Key);
      }

      // Delete bucket records
      await tx.teamSharedBucket.delete({
        where: { id: bucket.id },
      });
    }

    // Delete all related records in the correct order
    await tx.teamJoinRequest.deleteMany({
      where: { teamId },
    });

    await tx.teamInvite.deleteMany({
      where: { teamId },
    });

    await tx.teamMember.deleteMany({
      where: { teamId },
    });

    // Finally delete the team
    return await tx.team.delete({
      where: { id: teamId },
    });
  });
}

export async function getTeamByInviteCode(inviteCode: string, userId?: string) {
  const team = await prisma.team.findFirst({
    where: { inviteCode },
    include: {
      joinRequests: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!team) return null;

  // Find the owner from members
  const owner = team.members.find((member) => member.role === 'OWNER')?.user;
  if (!owner) return null;

  // Find user's role if userId is provided
  let userTeamRole: TeamRole | null = null;
  if (userId) {
    const userMember = team.members.find((member) => member.userId === userId);
    userTeamRole = userMember?.role || null;
  }

  // Return the transformed team object
  return {
    ...team,
    owner,
    memberCount: team.members.length,
    userTeamRole: userTeamRole || 'MEMBER',
  };
}

export async function joinTeamWithInviteCode(
  teamId: string,
  userId: string,
  validInvite: TeamInvite | null
) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: true,
      joinRequests: {
        where: {
          userId,
        },
      },
    },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  // Check if user is already a member
  if (team.members.some((member) => member.userId === userId)) {
    throw new Error('You are already a member of this team');
  }

  // Check team size limits
  if (team.members.length >= (team.maxMembers || 10)) {
    throw new Error('Team has reached maximum member limit');
  }

  try {
    // Delete any existing join requests for this user
    await prisma.teamJoinRequest.deleteMany({
      where: {
        teamId,
        userId,
      },
    });

    if (validInvite) {
      // Direct join with valid invite
      const result = await prisma.$transaction([
        prisma.teamMember.create({
          data: {
            userId,
            teamId,
            role: 'MEMBER',
          },
        }),
        prisma.teamInvite.update({
          where: { id: validInvite.id },
          data: { used: true },
        }),
      ]);
      return result[0];
    } else {
      // Create new join request
      return await prisma.teamJoinRequest.create({
        data: {
          teamId,
          userId,
          status: 'PENDING',
        },
      });
    }
  } catch (error) {
    console.error('Error processing join request:', error);
    throw error;
  }
}

export async function getTeamOwnerEmail(teamId: string) {
  const owner = await prisma.teamMember.findFirst({
    where: {
      teamId,
      role: 'OWNER',
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!owner?.user?.email) {
    throw new Error('Team owner email not found');
  }

  return owner.user.email;
}

export async function getTeamWithMembers(teamId: string) {
  return await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });
}

export async function removeTeamMemberInvites(
  teamId: string,
  email: string,
  userId: string
) {
  await prisma.teamInvite.deleteMany({
    where: { teamId, email },
  });
  return await prisma.teamJoinRequest.deleteMany({
    where: { teamId: { equals: teamId }, userId: { equals: userId } },
  });
}

export async function getTeamSharedFiles(teamId: string) {
  return await prisma.sharedFile.findMany({
    where: { teamId },
    include: {
      file: true,
      sharedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateTeamMaxMembers(teamId: string, how_much: number) {
  return await prisma.team.update({
    where: { id: teamId },
    data: {
      maxMembers: how_much,
    },
  });
}
