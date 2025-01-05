import { PlanConfig } from '@/config/dodo';

// Simplified billing stats props without subscription
export type BillingStatsProps = {
  billingStats: UsageType;
  subscriptionPlan: PlanConfig;
};

// Simplified usage type
export type UsageType = {
  totalUploadSize: string;
  totalFileShares: number;
  totalSharedStorage: string;
  totalDownloadedSize: string;
};

// Remove all subscription-related types that are no longer needed
export type ManageSubscriptionProps = {
  subscriptionPlan: PlanConfig;
};

// Keep only the basic types needed for file operations
export interface HandleUploadParams {
  file: File;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}
