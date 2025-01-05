export interface PlanConfig {
  storage: number;
  fileShares: number;
  sharedStorageLimit: number;
  downloadLimit: number;
  buckets: number;
  maxFileUpload: number;
  maxFileUploadSize: number;
  addFreeSharing: boolean;
}

export const DEFAULT_CONFIG: PlanConfig = {
  storage: 1024, // 1TB
  fileShares: 1000000,
  sharedStorageLimit: 2000000,
  downloadLimit: 2000000,
  buckets: 20,
  maxFileUpload: 3000000,
  maxFileUploadSize: 2000000,
  addFreeSharing: true,
};


