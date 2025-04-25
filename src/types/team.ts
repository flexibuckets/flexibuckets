import {
  BucketPermission,
  TeamRole,
  TeamJoinRequestStatus,
} from '@prisma/client';

export interface TeamMember {
  id: string;
  userId: string;
  role: TeamRole;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

export interface TeamBucket {
  id: string;
  name: string;
  permissions: BucketPermission;
  s3Credential: {
    id: string;
    bucket: string;
    provider: string;
  };
  addedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export type TeamMemberWithUser = {
  id: string; // TeamMember record ID
  teamId: string; // Team ID
  userId: string; // User ID
  role: TeamRole;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

export interface TeamJoinRequestWithUser {
  id: string;
  teamId: string;
  userId: string;
  status: TeamJoinRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string | null;
  memberCount: number;
  role: TeamRole;
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    totalUploadSize: string;
    totalFileShares: number;
  };
  totalStorageUsed: string;
  maxMembers: number;
  members: TeamMemberWithUser[];
  joinRequests: {
    id: string;
    userId: string;
    status: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }[];
}

export type TeamWithMembers = Omit<Team, 'joinRequests'>;
export type TeamWithRequests = Omit<Team, 'members'>;
export type TeamBasic = Pick<Team, 'id' | 'name' | 'owner' | 'memberCount'>;

// Helper type for creating a new team
export interface CreateTeamInput {
  name: string;
  description?: string;
  maxMembers?: number;
}

// Helper type for updating a team
export interface UpdateTeamInput {
  name?: string;
  description?: string;
  maxMembers?: number;
  inviteCode?: string | null;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: Date | null;
  totalUploadSize: string;
  totalFileShares: number;
  totalSharedStorage?: string;
  totalDownloadedSize?: string;
}
