import {
  getS3Credentials,
  getBucketFiles,
  getSharedFiles,
  getTeamBucketFiles,
} from "@/app/actions";

export type NavLink = { label: string; href: string };
export type SidebarLinkType = NavLink & {
  Icon: LucideIcon;
  activeOnRoutes: string[];
};
export type SidebarLinkGroup = {
  header: string;
  links: SidebarLinkType[];
};
export type S3Credential = {
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  provider: string;
  endpointUrl: string;
};

export type Bucket = {
  id: string;
  name: string;
  filesCount: number;
  size: string;
  endpointUrl: string;
  team?: {
    id: string;
    name: string;
  } | null;
  isShared?: boolean;
  permissions?: BucketPermission;
};

export type BucketWithCredentials = Awaited<
  ReturnType<typeof getS3Credentials>
>;

export type TeamBucketPermissions = {
  id: string;
  permissions: BucketPermission;
  userRole: TeamRole;
  bucketOwner: string;
  teamId: string;
};
export type CompleteBucket = BucketWithCredentials[number] &
  Bucket & { teamBucket: TeamBucketPermissions | null };

export type CompleteFile = Awaited<
  ReturnType<typeof getBucketFiles>
>["files"][number];

export type CompleteFolder = Awaited<
  ReturnType<typeof getBucketFiles>
>["folders"][number];

export type SharedContent = Awaited<ReturnType<typeof getSharedFiles>>;

export type TimeValues = { value: string; label: string; isLocked?: boolean };

export type HandleUploadParams = {
  creds: {
    endpointUrl: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    region: string;
  };
  files: { file: File; key: string }[];
};

// types/next-auth.d.ts
// @ts-expect-error - next-auth types
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      totalUploadSize: number;
    };
  }
}

export const addBucketFormSchema = z.object({
  accessKey: z.string().min(1, { message: "Access Key is required" }),
  secretKey: z.string().min(1, { message: "Secret Key is required" }),
  bucket: z.string().min(1, { message: "Bucket name is required" }), // Consider renaming to bucketName
  region: z.string().optional(), // Make region optional
  provider: z.string().optional(), // Make provider optional
  endpointUrl: z.string().url({ message: "Endpoint URL must be a valid URL" }),
});
export type Bucket = {
  id: string;
  name: string; // Consider renaming to bucketName for consistency
  filesCount: number;
  size: string; // Consider changing to number for easier calculations
  endpointUrl: string;
};



declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      totalUploadSize: number; // Add totalUploadSize here
    };
  }
}
export type FileStatus = "uploaded" | "uploading" | "inQueue" | null;
export type FileWithId = {
  id: string;
  file: File;
  status: FileStatus;
  path: string;
};

export type Folder = {
  id: string;
  files: FileWithId[];
  status: FileStatus;
  folders: Folder[];
  name: string;
};

export type FolderStructure = {
  id: string;
  name: string;
  type: string;
  size?: string;
  s3Key?: string;
  children?: FolderStructure[];
  parentFolder: FolderStructure | null;
};

export type PresignedObjectUrl = {
  id?: string;
  name: string;
  url: string;
};

// Add these types if they don't exist
export interface FileWithUser extends File {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export interface CompleteBucket extends S3Credential {
  id: string;
  name: string;
  bucket: string;
  filesCount: number;
  size: number;
  userId: string;
  teamAccess?: {
    id: string;
    permissions: BucketPermission;
  };
}
