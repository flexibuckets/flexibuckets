export interface Bucket {
    id: string;
    name: string;
    provider: string;
    storageUsed: bigint;
    createdAt: Date;
    team?: {
      id: string;
      name: string;
    } | null;
    isShared?: boolean;
    permissions?: 'READ_ONLY' | 'READ_WRITE';
  }