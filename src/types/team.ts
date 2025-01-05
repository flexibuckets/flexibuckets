
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
