// dboperations.ts - Handles all database operations except authentication

import { prisma } from "@/lib/prisma";
import { S3Provider } from "@prisma/client";
import { getBucketDetails, getSharedFolderStructure } from "./s3";
import {
DEFAULT_CONFIG
} from "@/config/dodo";
import { CompleteBucket } from "./types";

// Create a new file entry in the database
export async function createFile({
  userId,
  name,
  type,
  s3Key,
  size,
  s3CredentialId,
  folderId,
}: {
  userId: string;
  name: string;
  type: string;
  s3Key: string;
  size: string;
  s3CredentialId: string;
  folderId?: string;
}) {
  return await prisma.file.create({
    data: {
      userId,
      name,
      type,
      s3Key,
      size,
      s3CredentialId,
      folderId,
    },
  });
}

export async function updateUserTotalFileUploadSize({
  sizeToUpdate,
  userId,
}: {
  userId: string;
  sizeToUpdate: number;
}) {
  if (sizeToUpdate === 0) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalUploadSize: true,
      totalFileShares: true,
    },
  });

  if (!user?.totalUploadSize) return;

  const currentSize = BigInt(user.totalUploadSize);
  const newSize = (currentSize + BigInt(sizeToUpdate)).toString();

  await prisma.user.update({
    where: { id: userId },
    data: { totalUploadSize: newSize },
  });
}


export async function updateUserName({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const newName = await prisma.user.update({
    where: { id: userId },
    select: { name: true },
    data: { name },
  });
  return newName?.name;
}

export async function getNearExpiryFilesAndFolders({
  userId,
  daysThreshold = 3,
}: {
  userId: string;
  daysThreshold?: number;
}) {
  const thresholdDate = new Date(
    Date.now() + daysThreshold * 24 * 60 * 60 * 1000
  );

  const nearExpiryFiles = await prisma.sharedFile.findMany({
    where: {
      sharedById: userId,
      expiresAt: {
        not: null,
        lte: thresholdDate,
        gt: new Date(),
      },
    },
    include: {
      file: true,
    },
  });

  const nearExpiryFolders = await prisma.sharedFolder.findMany({
    where: {
      sharedById: userId,
      expiresAt: {
        not: null,
        lte: thresholdDate,
        gt: new Date(),
      },
    },
    include: {
      folder: true,
    },
  });

  return { nearExpiryFiles, nearExpiryFolders };
}

export async function getParentKey({
  folderId,
}: {
  folderId: string;
}): Promise<string> {
  const folderNames: string[] = [];
  const visitedFolders = new Set<string>(); // To avoid circular references

  while (true) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { parentId: true, name: true },
    });

    // If folder is not found, return the path we built so far
    if (!folder) return folderNames.reverse().join("/");

    // Prevent infinite loops in case of circular references
    if (visitedFolders.has(folderId)) {
      throw new Error("Circular folder structure detected.");
    }
    visitedFolders.add(folderId);

    // Handle null or empty folder names if needed
    if (folder.name) {
      folderNames.push(folder.name);
    } else {
      folderNames.push("Unnamed Folder"); // Fallback if folder name is null or empty
    }

    // If no more parent, return the built path
    if (!folder.parentId) return folderNames.reverse().join("/");

    // Move up the folder hierarchy
    folderId = folder.parentId;
  }
}

export async function createManyFiles(
  files: {
    userId: string;
    name: string;
    type: string;
    s3Key: string;
    size: string;
    s3CredentialId: string;
    folderId?: string;
  }[]
) {
  const createdFiles = [];
  let totalUploadSize = 0;

  for (const file of files) {
    const pathParts = file.name.split("/");
    const fileName = pathParts.pop() || "";

    const folderId = file.folderId;

    let attempt = 0;
    let uniqueS3Key = file.s3Key;
    let uniqueName = fileName;

    const addAttemptBeforeExtension = (name: string) => {
      const dotIndex = name.lastIndexOf(".");
      if (dotIndex === -1) {
        return `${name}(${attempt})`;
      } else {
        const baseName = name.substring(0, dotIndex);
        const extension = name.substring(dotIndex);
        return `${baseName}(${attempt})${extension}`;
      }
    };

    while (true) {
      try {
        const createdFile = await prisma.file.create({
          data: {
            userId: file.userId,
            name: uniqueName,
            type: file.type,
            s3Key: uniqueS3Key,
            size: file.size,
            s3CredentialId: file.s3CredentialId,
            folderId: folderId,
          },
        });
        createdFiles.push(createdFile);
        totalUploadSize += parseInt(file.size);
        break;
      } catch (error) {
        if (error instanceof Error && "code" in error && "meta" in error) {
          if (
            error.code === "P2002" &&
            typeof error.meta === "object" &&
            error.meta !== null &&
            "target" in error.meta &&
            Array.isArray(error.meta.target) &&
            error.meta.target.includes("s3Key")
          ) {
            attempt++;
            uniqueS3Key = addAttemptBeforeExtension(file.s3Key);
            uniqueName = addAttemptBeforeExtension(fileName);
          } else {
            throw error;
          }
        }
      }
    }
  }

  if (totalUploadSize > 0) {
    await updateUserTotalFileUploadSize({
      userId: files[0].userId,
      sizeToUpdate: totalUploadSize,
    });
  }

  return createdFiles;
}


export async function getUserTotalFileUpload({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalUploadSize: true, totalFileShares: true, totalSharedStorage: true, totalDownloadedSize: true },
  });
  if (!user) return 0;
  const totalUploadSize = user.totalUploadSize;
  return parseInt(totalUploadSize) > 0 ? totalUploadSize : 0;
}

// Get all files uploaded by a specific user
export async function getUserFiles(userId: string, folderId?: string) {
  return await prisma.file.findMany({
    where: { userId, folderId },
    orderBy: { createdAt: "desc" },
    include: { folder: true, s3Credential: true },
  });
}

export async function deleteFile(fileId: string) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    select: { size: true, folderId: true },
  });

  if (file && file.folderId) {
    await updateParentFolderSize(file.folderId, -file.size);
  }

  return await prisma.file.delete({
    where: { id: fileId },
  });
}

// Update a file entry (e.g., rename a file)
export async function updateFileName(fileId: string, newName: string) {
  return await prisma.file.update({
    where: { id: fileId },
    data: { name: newName },
  });
}

async function updateParentFolderSize(folderId: string, sizeChange: number) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { size: true, parentId: true },
  });

  if (!folder) return;

  const currentSize = BigInt(folder.size);
  const newSize = (currentSize + BigInt(sizeChange)).toString();

  await prisma.folder.update({
    where: { id: folderId },
    data: { size: newSize },
  });

  if (folder.parentId) {
    await updateParentFolderSize(folder.parentId, sizeChange);
  }
}

export async function createFolder({
  id,
  name,
  userId,
  parentId,
  s3CredentialId,
  size = 0,
}: {
  id: string;
  name: string;
  userId: string;
  parentId?: string;
  s3CredentialId: string;
  size?: number;
}) {
  const folder = await prisma.folder.create({
    data: {
      id,
      name,
      userId,
      parentId,
      s3CredentialId,
      size: size.toString(),
    },
  });

  // If there's a parent folder, update its size
  if (parentId) {
    await updateParentFolderSize(parentId, size);
  }

  return folder;
}

// Get user's folders
export async function getUserFolders(userId: string, parentId?: string) {
  return await prisma.folder.findMany({
    where: { userId, parentId },
    include: { children: true, files: true },
  });
}

// Get a specific folder with its contents
export async function getFolderContents(folderId: string, userId: string) {
  return await prisma.folder.findFirst({
    where: { id: folderId, userId },
    include: {
      files: true,
      children: true,
    },
  });
}

// Update folder name
export async function updateFolderName(folderId: string, newName: string) {
  return await prisma.folder.update({
    where: { id: folderId },
    data: { name: newName },
  });
}

// Delete a folder and its contents

// Share a file
export async function shareFile({
  fileId,
  userId,
  shortUrl,
  expiresAt,
  isSharedInfinitely,
}: {
  fileId: string;
  userId: string;
  shortUrl: string;
  expiresAt: Date | null;
  isSharedInfinitely?: boolean;
}) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      sharedFile: true,
    },
  });

  if (!file) throw new Error("File not found");

  return await prisma.$transaction(async (prisma) => {
    const sharedFile = await prisma.sharedFile.create({
      data: {
        fileId,
        sharedById: userId,
        downloadUrl: shortUrl,
        expiresAt,
        isSharedInfinitely: isSharedInfinitely ?? false,
        downloadedSize: "0",
      },
    });

    await prisma.file.update({
      where: { id: fileId },
      data: { isShared: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalFileShares: true, totalSharedStorage: true },
    });

    if (!user) throw new Error("User not found");

    const newSharedStorage = (
      BigInt(user.totalSharedStorage) + BigInt(file.size)
    ).toString();

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalFileShares: { increment: 1 },
        totalSharedStorage: newSharedStorage,
      },
    });

    return sharedFile;
  });
}

// Get shared file info
export async function getSharedFileInfo(shortUrl: string) {
  const sharedFile = await prisma.sharedFile.findUnique({
    where: { downloadUrl: shortUrl },
    include: { file: true },
  });

  if (
    !sharedFile ||
    (sharedFile.expiresAt && new Date(sharedFile.expiresAt) <= new Date())
  ) {
    return null;
  }
  return sharedFile;
}

export async function getSharedFiles(userId: string) {
  const sharedFiles = await prisma.sharedFile.findMany({
    where: {
      sharedById: userId,
    },
    include: {
      file: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const sharedFolders = await prisma.sharedFolder.findMany({
    where: {
      sharedById: userId,
    },
    include: {
      folder: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return { sharedFolders, sharedFiles };
}
// Create new S3 credentials for a user
export async function createS3Credentials({
  userId,
  accessKey,
  secretKey,
  bucketName,
  region,
  provider,
  endpointUrl,
}: {
  userId: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  region?: string; // Make region optional
  provider?: string; // Make provider optional
  endpointUrl: string;
}) {
  return await prisma.s3Credential.create({
    data: {
      userId,
      accessKey,
      secretKey,
      bucket: bucketName, // Ensure this matches the new schema
      region,
      provider: provider as S3Provider | null, // Ensure provider is of the correct type,
      endpointUrl,
    },
  });
}

// Get S3 credentials for a user
export async function getS3Credentials(userId: string) {
  return await prisma.s3Credential.findMany({
    where: { userId: userId },
  });
}

export async function getUserS3Credential(s3CredentialId: string) {
  return await prisma.s3Credential.findUnique({
    where: { id: s3CredentialId },
  });
}

// Delete S3 credentials by ID
export async function deleteS3Credentials(s3CredentialId: string) {
  return await prisma.s3Credential.delete({
    where: { id: s3CredentialId },
  });
}

export const getUserS3Buckets = async (userId: string) => {
  try {
    const credentials = await prisma.s3Credential.findMany({
      where: { userId },
      select: {
        id: true,
        bucket: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return credentials;
  } catch (error) {
    console.error("Error fetching S3 credentials:", error);
    throw new Error("Failed to fetch user S3 credentials");
  }
};

export const getBucketFiles = async ({
  userId,
  s3CredentialId,
  parentId,
  searchQuery,
}: {
  userId: string;
  s3CredentialId: string;
  parentId: string | null;
  searchQuery?: string;
}) => {
  const whereClause = {
    userId,
    s3CredentialId,
    folderId: parentId,
    ...(searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" as const } },
            { type: { contains: searchQuery, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const files = await prisma.file.findMany({
    where: whereClause,
    include: { sharedFile: true },
  });

  const folders = await prisma.folder.findMany({
    where: {
      userId,
      s3CredentialId,
      parentId: parentId,
      ...(searchQuery
        ? { name: { contains: searchQuery, mode: "insensitive" } }
        : {}),
    },
    include: { sharedFolder: true },
  });

  return { files, folders };
};
export async function getSharedFolderInfo(downloadUrl: string) {
  const sharedFolder = await prisma.sharedFolder.findUnique({
    where: {
      downloadUrl,
    },
  });

  if (
    !sharedFolder ||
    (sharedFolder.expiresAt && new Date(sharedFolder.expiresAt) <= new Date())
  ) {
    throw new Error("File expired or not found");
  }
  const folderStructure = await getSharedFolderStructure(sharedFolder.id);
  return { folderStructure, sharedFolderId: sharedFolder.id };
}

export async function getSingleCredential(id: string) {
  const cred = await prisma.s3Credential.findUnique({
    where: { id },
  });

  return cred;
}

// Get all files in a specific folder
export async function getFolderFiles(folderId: string, userId: string) {
  return await prisma.file.findMany({
    where: { folderId, userId },
  });
}

// Move a file to a different folder
export async function moveFile(fileId: string, newFolderId: string | null) {
  return await prisma.file.update({
    where: { id: fileId },
    data: { folderId: newFolderId },
  });
}

export async function getBreadcrumbsLinks({
  parentId,
}: {
  parentId: string;
}): Promise<Array<{ name: string; id: string }>> {
  const breadcrumbs: Array<{ name: string; id: string }> = [];
  const visitedFolders = new Set<string>(); // To avoid circular references

  while (true) {
    const folder = await prisma.folder.findUnique({
      where: { id: parentId },
      select: { parentId: true, name: true, id: true },
    });

    // If folder is not found, return the breadcrumbs we built so far
    if (!folder) return breadcrumbs.reverse();

    // Prevent infinite loops in case of circular references
    if (visitedFolders.has(parentId)) {
      throw new Error("Circular folder structure detected.");
    }
    visitedFolders.add(parentId);

    // Add the current folder to breadcrumbs (ensure name exists)
    breadcrumbs.push({
      name: folder.name || "Unnamed Folder", // Fallback if folder name is null or empty
      id: folder.id,
    });

    // If no more parent, return the built breadcrumbs
    if (!folder.parentId) return breadcrumbs.reverse();

    // Move up the folder hierarchy
    parentId = folder.parentId;
  }
}

// Get Size of Folders
export async function getFolderSize(folderId: string): Promise<string> {
  const files = await prisma.file.findMany({
    where: { folderId },
    select: { size: true },
  });

  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId },
  });

  let totalSize = files.reduce(
    (sum, file) => sum + BigInt(file.size),
    BigInt(0)
  );

  for (const subfolder of subfolders) {
    totalSize += BigInt(await getFolderSize(subfolder.id));
  }

  return totalSize.toString();
}

type updateBatchFolderSizeParams = { folderId: string; size: string }[];

export async function updateBatchFolderSize({
  foldersWithSizes,
}: {
  foldersWithSizes: updateBatchFolderSizeParams;
}) {
  try {
    // Assuming you have a database update function to handle the batch update
    const updatePromises = foldersWithSizes.map(
      ({ folderId, size }) => updateFolderSizeInDb(folderId, size) // Hypothetical function to update folder size
    );

    // Wait for all folder sizes to be updated
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error updating folder sizes: ", error);
  }
}

// Hypothetical function that updates a folder's size in the database
async function updateFolderSizeInDb(folderId: string, size: string) {
  // Database logic to update the folder size
  return await prisma.folder.update({
    where: { id: folderId },
    data: { size },
  });
}

export async function shareFolder({
  folderId,
  userId,
  shortUrl,
  expiresAt,
  teamId,
}: {
  folderId: string;
  userId: string;
  shortUrl: string;
  expiresAt: Date | null;
  teamId?: string | null;
}) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      sharedFolder: true, // Include existing share info
    },
  });

  if (!folder) throw new Error("Folder not found");

  // Check if folder is already shared
  if (folder.sharedFolder) {
    return await prisma.sharedFolder.update({
      where: { folderId },
      data: {
        downloadUrl: shortUrl,
        expiresAt,
      },
    });
  }


    // Update folder status
    await prisma.folder.update({
      where: { id: folderId },
      data: { isShared: true },
    });

    const sharedFolder = await prisma.sharedFolder.create({
      data: {
        folderId,
        sharedById: userId,
        downloadUrl: shortUrl,
        expiresAt,
      },
    });

      // Update user storage if teamId is not provided
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalFileShares: true, totalSharedStorage: true },
      });

      if (!user) throw new Error("User not found");

      const newSharedStorage = (
        BigInt(user.totalSharedStorage) + BigInt(folder.size)
      ).toString();

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalFileShares: { increment: 1 },
          totalSharedStorage: newSharedStorage,
        },
    });

    return sharedFolder;
  }


export const deleteSharedItem = async ({
  id,
  type,
}: {
  id: string;
  type: "file" | "folder";
}) => {
  const result =
    type === "file"
      ? await deleteSharedFile({ fileId: id })
      : await deleteSharedFolder({ folderId: id });
  return {
    message: "Shared file deleted successfully",
    file: result,
  };
};

export const deleteSharedFile = async ({ fileId }: { fileId: string }) => {
  return await prisma.$transaction(async (prisma) => {
    // Get the shared file with team info before deleting
    const sharedFile = await prisma.sharedFile.findUnique({
      where: { fileId },
      include: {
        file: true,
      },
    });

    if (!sharedFile) throw new Error("Shared file not found");

    // Delete the shared file entry
    await prisma.sharedFile.delete({
      where: { fileId },
    });

    // Update the file entry
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        isShared: false,
        shortUrl: null,
      },
    });

    return updatedFile;

        
  });
};

export const deleteSharedFolder = async ({
  folderId,
}: {
  folderId: string;
}) => {
  return await prisma.$transaction(async (prisma) => {
    // Get the shared folder with team info before deleting
    const sharedFolder = await prisma.sharedFolder.findUnique({
      where: { folderId },
      include: {
        folder: true,
      },
    });

    if (!sharedFolder) throw new Error("Shared folder not found");

    // Delete the shared folder entry
    await prisma.sharedFolder.delete({
      where: { folderId },
    });

    // Update the folder entry
    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: {
        isShared: false,
      },
    });

    return updatedFolder;
  });
};

export async function isAllowedToShare({
  userId,
  fileSize,
}: {
  userId: string;
  fileSize: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalFileShares: true,
      totalSharedStorage: true,
    },
  });

  if (!user) return false;
  const { totalFileShares, totalSharedStorage } = user;

  // Use DEFAULT_CONFIG instead of subscription plan
  if (totalFileShares >= DEFAULT_CONFIG.fileShares) {
    return false;
  }

  // Check shared storage limit
  const currentSharedStorage = BigInt(totalSharedStorage);
  const newFileSize = BigInt(fileSize);
  const totalAfterShare = currentSharedStorage + newFileSize;

  const sharedStorageLimitInBytes =
    BigInt(DEFAULT_CONFIG.sharedStorageLimit) * BigInt(1024 * 1024 * 1024); // GB to bytes

  return totalAfterShare <= sharedStorageLimitInBytes;
}

export async function isAllowedToUpload({
  userId,
  fileSize,
  fileCount,
}: {
  userId: string;
  fileSize: number;
  fileCount: number;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalUploadSize: true },
  });

  if (!user) return false;
  const { totalUploadSize } = user;

  const currentUploadSize = BigInt(totalUploadSize);
  const fileSizeBigInt = BigInt(fileSize);
  const finUpload = currentUploadSize + fileSizeBigInt;

  // Use DEFAULT_CONFIG for limits
  const uploadStorageLimitInBytes =
    BigInt(DEFAULT_CONFIG.storage) * BigInt(1024 * 1024 * 1024); // GB to bytes
  
  if (finUpload >= uploadStorageLimitInBytes) {
    return false;
  }

  // Check file count limit
  if (fileCount > DEFAULT_CONFIG.maxFileUpload) {
    return false;
  }

  return true;
}

export async function isDownloadAllowed({
  userId,
  fileSize,
}: {
  userId: string;
  fileSize: number;
}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalDownloadedSize: true },
  });
  
  if (!user) return false;

  const currentDownloadSize = BigInt(user.totalDownloadedSize);
  const fileSizeBigInt = BigInt(fileSize);
  const finDownload = currentDownloadSize + fileSizeBigInt;

  const downloadStorageLimitInBytes =
    BigInt(DEFAULT_CONFIG.downloadLimit) * BigInt(1024 * 1024 * 1024); // GB to bytes

  return finDownload < downloadStorageLimitInBytes;
}
export async function verifyBucketUser({
  userId,
  bucketId,
}: {
  userId: string;
  bucketId: string;
}) {
  const bucket = await prisma.s3Credential.findFirst({
    where: { 
      AND: [
        { id: bucketId },
        { userId: userId }
      ]
    },
  });

  if (!bucket) {
   return false
  }

  return bucket;
}

export const getUserUsage = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      s3Credentials: {
        select: {
          id: true, // Ensure we are selecting the bucket ID
          _count: {
            select: {
              files: true,
              folders: true,
            },
          },
        },
      },
      totalDownloadedSize: true,
      totalFileShares: true,
      totalSharedStorage: true,
      totalUploadSize: true,
    },
  });

  if (!user) {
    throw new Error("No User Found!");
  }

  const { s3Credentials: buckets, ...rest } = user;

  // Ensure buckets is an array and not null
  const bucketCount = buckets ? buckets.length : 0;

  // Calculate file and folder counts safely
  const fileCount = buckets
    ? buckets.reduce((total, bucket) => total + (bucket._count.files || 0), 0)
    : 0;

  const folderCount = buckets
    ? buckets.reduce((total, bucket) => total + (bucket._count.folders || 0), 0)
    : 0;

  return {
    bucketCount,
    fileCount,
    folderCount,
    ...rest,
  };
};

export async function isAllowedToAddBucket(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      
      s3Credentials: {
        select: { id: true },
      },
    },
  });

  if (!user) return false;

  const plan = DEFAULT_CONFIG;
  if (!plan) return false;

  return user.s3Credentials.length < plan.buckets;
}

export async function deleteBucket({ bucketId }: { bucketId: string }) {
  try {
    // Use a transaction to ensure all operations complete or none do
    return await prisma.$transaction(async (tx) => {
      // 1. First delete all shared files associated with this bucket's files
      await tx.sharedFile.deleteMany({
        where: {
          file: {
            s3CredentialId: bucketId
          }
        }
      });

      // 2. Delete all shared folders associated with this bucket's folders
      await tx.sharedFolder.deleteMany({
        where: {
          folder: {
            s3CredentialId: bucketId
          }
        }
      });

      // 3. Delete all files in the bucket
      await tx.file.deleteMany({
        where: {
          s3CredentialId: bucketId
        }
      });

      // 4. Delete all folders in the bucket
      await tx.folder.deleteMany({
        where: {
          s3CredentialId: bucketId
        }
      });

      // 5. Finally delete the bucket (s3Credential) itself
      const deletedBucket = await tx.s3Credential.delete({
        where: {
          id: bucketId
        }
      });

      return deletedBucket;
    });
  } catch (error) {
    console.error("Error deleting bucket:", error);
    throw new Error("Failed to delete bucket and its contents");
  }
}