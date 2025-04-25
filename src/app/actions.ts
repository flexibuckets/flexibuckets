'use server';
import {
  verifyTeamAccess,
  verifyTeamRole,
  getUserTeams,
  addTeamMember,
  createTeam,
} from '@/lib/db/teams';
import {
  getTeamBuckets,
  addTeamBucket,
  removeTeamMember,
  updateTeamMemberRole,
} from '@/lib/db/teams';
import { getTeamSharedFiles, isTeamSharingAllowed } from '@/lib/db/teams.share';
import {
  verifyS3Credentials,
  addS3Credentials,
  getBucketDetails,
  getAllBuckets,
  getpresignedPutUrl,
  deleteFile,
  createFolder,
  deleteFolder,
  getFileFromS3,
  deleteTeamFile,
  getTeamBucketFiles,
  handleTeamFileUpload,
} from '@/lib/s3';
import {
  getS3Credentials,
  getUserS3Buckets,
  createManyFiles,
  getBucketFiles,
  shareFile,
  getSharedFiles,
  getSharedFileInfo,
  getSingleCredential,
  getUserS3Credential,
  getUserTotalFileUpload,
  getUserFolders,
  getFolderContents,
  updateFolderName,
  moveFile,
  getParentKey,
  getBreadcrumbsLinks,
  deleteSharedItem,
  getSharedFolderInfo,
  updateBatchFolderSize,
  shareFolder,
  isAllowedToShare,
  updateUserName,
  verifyBucketUser,
  getUserUsage,
  deleteBucket,
  createManyTeamFiles,
  deleteCompleteBucket,
} from '@/lib/dboperations';
import { checkForUpdates, executeUpdate } from '@/lib/version-checker';

export {
  checkForUpdates,
  executeUpdate,
  getUserUsage,
  getS3Credentials,
  verifyS3Credentials,
  addS3Credentials,
  getBucketDetails,
  getUserS3Buckets,
  getAllBuckets,
  getpresignedPutUrl,
  createManyFiles,
  getBucketFiles,
  createFolder,
  shareFile,
  deleteFile,
  getSharedFiles,
  getSharedFileInfo,
  getUserS3Credential,
  getSingleCredential,
  getUserTotalFileUpload,
  getUserFolders,
  getFolderContents,
  updateFolderName,
  moveFile,
  getParentKey,
  getBreadcrumbsLinks,
  deleteSharedItem,
  deleteFolder,
  updateBatchFolderSize,
  getFileFromS3,
  getSharedFolderInfo,
  shareFolder,
  isAllowedToShare,
  updateUserName,
  verifyBucketUser,
  deleteBucket,
  removeTeamMember,
  updateTeamMemberRole,
  getTeamBuckets,
  addTeamBucket,
  verifyTeamAccess,
  verifyTeamRole,
  getUserTeams,
  addTeamMember,
  createTeam,
  getTeamBucketFiles,
  deleteTeamFile,
  createManyTeamFiles,
  getTeamSharedFiles,
  isTeamSharingAllowed,
  deleteCompleteBucket,
};

export async function uploadTeamFileAction(formData: FormData) {
  const file = formData.get('file') as File;
  const bucketId = formData.get('bucketId') as string;
  const userId = formData.get('userId') as string;
  const parentId = formData.get('parentId') as string;

  const bucket = await verifyBucketUser({ userId, bucketId });

  return handleTeamFileUpload({
    file,
    bucket,
    userId,
    parentId: parentId || undefined,
  });
}
