// File Worker - Handles all file operations and S3 credential management

import { z } from "zod";

import { Client } from "minio";
import {
  createFile,
  updateFileName,
  getUserFiles,
  createS3Credentials,
  deleteS3Credentials,
  getS3Credentials,
  getSingleCredential,
  createFolder as dbCreateFolder,
  isAllowedToAddBucket,
} from "./dboperations";
import { Readable } from "stream";
import { Bucket, CompleteBucket, FolderStructure } from "@/lib/types";
import { addBucketFormSchema as formSchema } from "@/lib/schemas";
import { prisma } from "./prisma";
import JSZip from "jszip";


const MAX_UPLOAD_LIMIT_BYTES = 100 * 1024 * 1024 * 1024;
// Add this utility function at the top of the file
function handleMinioError(error: unknown): never {
  // Log the full error for debugging (only visible in server logs)
  console.error("MinIO operation failed:", error);

  // Determine appropriate user-facing error message
  let errorMessage = "Unable to complete operation";
  
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED')) {
      errorMessage = "Cannot connect to storage endpoint. Please check your endpoint URL and network connection.";
    } else if (error.message.includes('AccessDenied')) {
      errorMessage = "Access denied. Please check your credentials.";
    } else if (error.message.includes('NoSuchBucket')) {
      errorMessage = "Bucket not found. Please verify the bucket name.";
    } else if (error.message.includes('InvalidAccessKeyId')) {
      errorMessage = "Invalid access key. Please check your credentials.";
    }
  }

  throw new Error(errorMessage);
}

// Function to initialize MinIO client using user's credentials
export async function getMinioClient(s3CredentialId: string) {
  try {
    const credentials = await getSingleCredential(s3CredentialId);
    if (!credentials) {
      throw new Error("No S3 credentials found");
    }

    const { accessKey, secretKey, endpointUrl, region } = credentials;

    return new Client({
      endPoint: endpointUrl,
      port: 443,
      useSSL: true,
      accessKey,
      secretKey,
      region: region || "auto",
    });
  } catch (error) {
    handleMinioError(error);
  }
}

// Upload file to MinIO and create a record in the database

export async function uploadFile({
  userId,
  fileStream,
  fileName,
  mimeType,
  bucket,
  fileSize, // fileSize in bytes as a string
  s3CredentialId,
  folderId,
}: {
  userId: string;
  fileStream: Readable;
  fileName: string;
  mimeType: string;
  bucket: string;
  fileSize: string;
  s3CredentialId: string;
  folderId?: string;
}) {
  try {
    // Fetch the user's current total uploaded size
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalUploadSize: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const currentTotalSize = BigInt(user.totalUploadSize);
    const newFileSize = BigInt(fileSize);

    // Check if the new file size will exceed the limit
    if (currentTotalSize + newFileSize > BigInt(MAX_UPLOAD_LIMIT_BYTES)) {
      throw new Error(
        "Upload limit exceeded. You can only upload up to 100GB in total."
      );
    }

    // Proceed with file upload to MinIO
    const minioClient = await getMinioClient(s3CredentialId);
    const objectName = folderId ? `${folderId}/${fileName}` : fileName;

    // Upload file to MinIO (S3-compatible)
    await minioClient.putObject(
      bucket,
      objectName,
      fileStream,
      Number(fileSize),
      {
        "Content-Type": mimeType,
      }
    );

    // After successful upload, update the user's total uploaded size
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalUploadSize: (currentTotalSize + newFileSize).toString(),
      },
    });

    return await createFile({
      userId,
      name: fileName,
      type: mimeType,
      size: fileSize,
      s3Key: objectName,
      s3CredentialId: s3CredentialId,
      folderId,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("File upload failed");
  }
}

// Delete file from MinIO and remove record from the database
export async function deleteFile({
  userId,
  fileId,
  s3CredentialId,
}: {
  userId: string;
  fileId: string;
  s3CredentialId: string;
}) {
  try {
    // Step 1: Fetch the file record with size, s3Key, bucket, and folderId (if it's part of a folder)
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: {
        size: true,
        s3Key: true,
        userId: true,
        folderId: true, // Added folderId to check if the file is part of a folder
        s3Credential: { select: { bucket: true } },
      },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Ensure that the file belongs to the user
    if (file.userId !== userId) {
      throw new Error("Unauthorized file deletion");
    }

    // Step 2: Delete the file from MinIO
    const minioClient = await getMinioClient(s3CredentialId);
    await minioClient.removeObject(file.s3Credential.bucket, file.s3Key);

    // Step 3: Subtract the file size from the user's total uploaded size
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalUploadSize: true },
    });

    if (user) {
      const currentTotalSize = BigInt(user.totalUploadSize);
      const fileSizeToRemove = BigInt(file.size);
      const newTotalSize = (currentTotalSize - fileSizeToRemove).toString();

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalUploadSize: newTotalSize,
        },
      });
    }

    // Step 4: If the file is part of a folder, recursively update folder and parent folder sizes
    if (file.folderId) {
      await updateParentFoldersSizeRecursively(file.folderId, file.size);
    }

    // Step 5: Delete any shared file references
    await prisma.sharedFile.deleteMany({
      where: { fileId },
    });

    // Step 6: Delete the file record from the database
    await prisma.file.delete({
      where: { id: fileId },
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("File deletion failed");
  }
}
async function updateParentFoldersSizeRecursively(
  folderId: string,
  fileSize: string
) {
  // Step 1: Update the current folder size
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { size: true, parentId: true },
  });

  if (folder) {
    const currentSize = BigInt(folder.size);
    const sizeToRemove = BigInt(fileSize);
    const newSize = (currentSize - sizeToRemove).toString();

    await prisma.folder.update({
      where: { id: folderId },
      data: {
        size: newSize,
      },
    });

    // Step 2: If the folder has a parent, recursively update the parent folder's size
    if (folder.parentId) {
      await updateParentFoldersSizeRecursively(folder.parentId, fileSize);
    }
  }
}

// Rename a file in the database (not on MinIO)
export async function renameFile({
  fileId,
  newName,
}: {
  fileId: string;
  newName: string;
}) {
  return await updateFileName(fileId, newName);
}

// List all files uploaded by a specific user
export async function listUserFiles(userId: string) {
  return await getUserFiles(userId);
}

// Download a file from MinIO
export async function downloadFile({
  userId,
  bucket,
  s3Key,
}: {
  userId: string;
  bucket: string;
  s3Key: string;
}) {
  const minioClient = await getMinioClient(userId);

  // Get file from MinIO
  return await minioClient.getObject(bucket, s3Key);
}

// Add new S3 credentials for a user
export async function addS3Credentials({
  userId,
  values,
}: {
  userId: string;
  values: z.infer<typeof formSchema>;
}) {
  
  return await prisma.s3Credential.create({
    data: {
      userId,
      ...values,
    },
  });
}

// Remove S3 credentials by ID
export async function removeS3Credentials(s3CredentialId: string) {
  return await deleteS3Credentials(s3CredentialId);
}

// Get S3 credentials for a specific user
export async function getUserS3Credentials(userId: string) {
  return await getS3Credentials(userId);
}

// Verify S3 credentials by attempting to list buckets
export async function verifyS3Credentials(values: z.infer<typeof formSchema>) {
  let { endpointUrl, accessKey, secretKey, bucket, region, provider } = values;
  
  if (endpointUrl.startsWith("https://")) {
    endpointUrl = endpointUrl.replace("https://", "");
  }

  try {
    /* Temporarily removed AWS provider support
    if (provider === 'AWS') {
      // AWS specific handling code removed
    }
    */

    // For non-AWS providers, use the existing verification logic
    const minioClient = new Client({
      endPoint: endpointUrl,
      port: 443,
      useSSL: true,
      accessKey,
      secretKey,
      region: region || "auto",
    });

    // Verify credentials by listing buckets
    const buckets = await minioClient.listBuckets();
    const bucketExists = buckets.some((b) => b.name === bucket);
    if (!bucketExists) {
      return {
        isVerified: false,
        ...values,
        endpointUrl,
        error: `Bucket "${bucket}" not found. Please check the bucket name.`,
      };
    }

    // Verify bucket access by trying to list objects
    try {
      await minioClient.listObjects(bucket, "", true);
    } catch (bucketError) {
      console.error("Error accessing bucket:", bucketError);
      return {
        isVerified: false,
        ...values,
        endpointUrl,
        error: "Unable to access bucket. Please check your permissions.",
      };
    }

    return {
      isVerified: true,
      ...values,
      endpointUrl,
    };
  } catch (error) {
    console.error("Error verifying S3 credentials:", error);
    let errorMessage = "Failed to verify credentials";
    if (error instanceof Error) {
      if (error.message.includes('wrong; expecting')) {
        const match = error.message.match(/expecting '([^']+)'/);
        const expectedRegion = match ? match[1] : 'unknown';
        errorMessage = `Invalid region. The bucket is in ${expectedRegion} region.`;
      } else if (error.message.includes('InvalidAccessKeyId')) {
        errorMessage = "Invalid access key. Please check your credentials.";
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        errorMessage = "Invalid secret key. Please check your credentials.";
      }
    }

    return {
      isVerified: false,
      ...values,
      endpointUrl,
      error: errorMessage,
    };
  }
}

type BucketDetailsParams = {
  accessKey: string;
  secretKey: string;
  endpointUrl: string;
  bucketName: string;
  region: string | null;
};

export async function getBucketDetails({
  bucketName,
  accessKey,
  secretKey,
  endpointUrl,
  region,
}: {
  bucketName: string;
  accessKey: string;
  secretKey: string;
  endpointUrl: string;
  region: string;
}) {
  try {
    const minioClient = new Client({
      endPoint: endpointUrl,
      port: 443,
      useSSL: true,
      accessKey,
      secretKey,
      region,
    });

    let totalFiles = 0;
    let totalSize = 0;

    const objectsStream = minioClient.listObjects(bucketName, "", true);

    for await (const obj of objectsStream) {
      if (obj.size !== undefined) {
        totalFiles++;
        totalSize += obj.size;
      }
    }

    return {
      totalFiles,
      totalSizeInMB: Math.round(totalSize / (1024 * 1024)),
      isAccessible: true,
    };
  } catch (error) {
    // Don't throw here, just return the status
    return {
      totalFiles: 0,
      totalSizeInMB: 0,
      isAccessible: false,
      errorMessage: error instanceof Error 
        ? error.message.includes('ECONNREFUSED')
          ? "Cannot connect to storage endpoint"
          : "Unable to access bucket"
        : "Unable to access bucket",
    };
  }
}

export async function getAllBuckets({ userId }: { userId: string }) {
  const bucketData: (Bucket & { isAccessible?: boolean; errorMessage?: string })[] = [];
  const bucketsDetails = await getS3Credentials(userId);

  for (const da of bucketsDetails) {
    const bucketdetails = await getBucketDetails({
      bucketName: da.bucket,
      accessKey: da.accessKey,
      secretKey: da.secretKey,
      endpointUrl: da.endpointUrl,
      region: da.region,
    });

    const formattedBucket = {
      id: da.id,
      name: da.bucket,
      filesCount: bucketdetails.totalFiles,
      size: bucketdetails.totalSizeInMB.toString(),
      endpointUrl: da.endpointUrl,
      isShared: false,
      permissions: "READ_WRITE",
      isAccessible: bucketdetails.isAccessible,
      errorMessage: bucketdetails.errorMessage,
    } as const;

    bucketData.push(formattedBucket);
  }
  return bucketData;
}

export async function createFolder({
  id,
  userId,
  folderName,
  parentFolderId,
  s3CredentialId,
}: {
  id: string;
  userId: string;
  folderName: string;
  parentFolderId?: string;
  s3CredentialId: string;
}) {
  try {
    const s3Credential = await getSingleCredential(s3CredentialId);

    if (!s3Credential) {
      throw new Error("S3 credential not found");
    }

    // Create the folder entry in the database
    const folder = await dbCreateFolder({
      id,
      name: folderName,
      userId,
      parentId: parentFolderId,
      s3CredentialId,
    });

    return folder;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw new Error("Failed to create folder");
  }
}

export async function getpresignedPutUrl({
  endpointUrl,
  accessKey,
  secretKey,
  fileName,
  bucketName,
  expiresIn = 300,
  region,
}: BucketDetailsParams & { fileName: string; expiresIn?: number }) {
  const minioClient = new Client({
    endPoint: endpointUrl,
    port: 443,
    useSSL: true,
    accessKey,
    secretKey,
    region: region || "auto",
  });
  const presignedUrl = await minioClient.presignedPutObject(
    bucketName,
    fileName,
    expiresIn
  );
  return presignedUrl;
}

export { getSingleCredential };

export async function deleteFolder({
  userId,
  folderId,
  s3CredentialId,
}: {
  userId: string;
  folderId: string;
  s3CredentialId: string;
}) {
  const minioClient = await getMinioClient(s3CredentialId);
  const s3Credential = await getSingleCredential(s3CredentialId);

  if (!s3Credential) {
    throw new Error("S3 credential not found");
  }

  let totalDeletedSize = BigInt(0); // To track the total size of deleted files

  // Recursive function to delete folders and files
  async function deleteFolderRecursive(folderId: string) {
    // Get all subfolders
    const subfolders = await prisma.folder.findMany({
      where: { parentId: folderId },
    });

    // Recursively delete subfolders
    for (const subfolder of subfolders) {
      await deleteFolderRecursive(subfolder.id);
    }

    // Get all files in the current folder
    const files = await prisma.file.findMany({
      where: { folderId },
    });

    // Delete files from S3 and database, and accumulate their sizes
    for (const file of files) {
      //@ts-expect-error - minioClient.removeObject is not fully typed
      await minioClient.removeObject(s3Credential.bucket, file.s3Key);

      // Accumulate total deleted size
      totalDeletedSize += BigInt(file.size);

      // Delete file record from the database
      await prisma.file.delete({ where: { id: file.id } });
    }

    // Delete the current folder
    await prisma.folder.delete({ where: { id: folderId } });
  }

  // Start the recursive deletion
  await deleteFolderRecursive(folderId);

  // Update parent folder size if it has a parent
  const parentFolder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { parentId: true },
  });

  if (parentFolder && parentFolder.parentId) {
    // Find all files in the parent folder
    const parentFolderFiles = await prisma.file.findMany({
      where: { folderId: parentFolder.parentId },
      select: { size: true },
    });

    // Calculate the total size manually
    const parentFolderSize = parentFolderFiles.reduce(
      (sum, file) => sum + BigInt(file.size),
      BigInt(0)
    );

    // Update the size of the parent folder
    await prisma.folder.update({
      where: { id: parentFolder.parentId },
      data: { size: parentFolderSize.toString() },
    });
  }

  // Update totalUploadSize for the user after all deletions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalUploadSize: true },
  });

  if (user) {
    const currentTotalSize = BigInt(user.totalUploadSize);
    const newTotalSize = (currentTotalSize - totalDeletedSize).toString();

    await prisma.user.update({
      where: { id: userId },
      data: { totalUploadSize: newTotalSize },
    });
  }
}

export async function getFileFromS3({
  bucketName,
  s3Key,
  s3CredentialId,
}: {
  bucketName: string;
  s3Key: string;
  s3CredentialId: string;
}) {
  const minioClient = await getMinioClient(s3CredentialId);

  return await minioClient.getObject(bucketName, s3Key);
}

export async function getSharedFolderStructure(sharedFolderId: string) {
  const sharedFolder = await prisma.sharedFolder.findUnique({
    where: { id: sharedFolderId },
    include: { folder: true },
  });

  if (
    !sharedFolder ||
    (sharedFolder.expiresAt && sharedFolder.expiresAt < new Date())
  ) {
    throw new Error("Shared folder not found or expired");
  }

  return await getFolderStructure(sharedFolder.folder.id);
}

async function getFolderStructure(
  folderId: string,
  parentFolder: FolderStructure | null = null
) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      files: {
        select: {
          id: true,
          name: true,
          type: true,
          size: true,
          s3Key: true,
        },
      },
      children: true,
    },
  });

  if (!folder) {
    throw new Error("Folder not found");
  }

  const structure: FolderStructure = {
    id: folder.id,
    name: folder.name,
    type: "folder",
    size: folder.size,
    children: [],
    parentFolder,
  };

  // Recursively add subfolders
  if (structure.children) {
    structure.children.push(
      ...folder.files.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        s3Key: file.s3Key,
        size: file.size,
        parentFolder: structure,
      }))
    );
  }

  // Recursively add subfolders
  for (const childFolder of folder.children) {
    const childStructure = await getFolderStructure(childFolder.id, structure);
    structure.children!.push(childStructure);
  }

  return structure;
}

export async function refreshShareLinks(itemIds: string[], isFolder: boolean) {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (isFolder) {
      await prisma.sharedFolder.updateMany({
        where: { id: { in: itemIds } },
        data: { expiresAt: sevenDaysFromNow },
      });
    } else {
      await prisma.sharedFile.updateMany({
        where: { id: { in: itemIds } },
        data: { expiresAt: sevenDaysFromNow },
      });
    }

    return { message: "Share links refreshed successfully" };
  } catch (error) {
    console.error("Error refreshing share links:", error);
    throw new Error("Failed to refresh share links");
  }
}


export async function getPresignedUrl(
  s3CredentialId: string,
  key: string,
  expiryTime = 60 * 60
) {
  const  minioClient = await getMinioClient(s3CredentialId);
  const credentials = await getSingleCredential(s3CredentialId);

  if (!credentials) {
    throw new Error("No S3 credentials found for the provided ID");
  }

  const presignedUrl = await minioClient.presignedGetObject(
    credentials.bucket,
    key,
    expiryTime
  ); // URL valid for 1 hour
  return presignedUrl;
}

export async function getFolderDownloadUrls(folderId: string, userId: string) {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId, userId },
      include: { s3Credential: true },
    });

    if (!folder) {
      throw new Error("Folder not found or unauthorized");
    }

    const minioClient = await getMinioClient(folder.s3CredentialId);
    const urls: { name: string; url: string }[] = [];

    const getFolderContentsUrls = async (
      folderId: string,
      folderPath: string
    ) => {
      const folderContents = await prisma.folder.findUnique({
        where: { id: folderId },
        include: { files: true, children: true },
      });

      if (!folderContents) return;

      // Get presigned URLs for files in the current folder
      for (const file of folderContents.files) {
        const presignedUrl = await minioClient.presignedGetObject(
          folder.s3Credential.bucket,
          file.s3Key,
          60 * 60 // 1 hour expiry
        );
        urls.push({
          name: `${folderPath}/${file.name}`,
          url: presignedUrl,
        });
      }

      // Recursively get URLs for subfolders
      for (const subfolder of folderContents.children) {
        await getFolderContentsUrls(
          subfolder.id,
          `${folderPath}/${subfolder.name}`
        );
      }
    };

    await getFolderContentsUrls(folderId, folder.name);
    return urls;
  } catch (error) {
    console.error("Error getting folder download URLs:", error);
    throw new Error("Failed to get folder download URLs");
  }
}

export async function getPresignedUrlUsingParamClient(
  minioClient: Client,
  bucketName: string,
  objectKey: string,
  expiryTime = 60 * 60
) {
  return await minioClient.presignedGetObject(
    bucketName,
    objectKey,
    expiryTime
  );
}


export const createZipFromFiles = async (files: File[]) => {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file);
  }

  return await zip.generateAsync({ type: "blob" });
};

export async function deleteTeamFile(fileId: string) {
  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { s3Credential: true },
    });

    if (!file) throw new Error("File not found");

    const minioClient = await getMinioClient(file.s3CredentialId);
    await minioClient.removeObject(file.s3Credential.bucket, file.s3Key);

    await prisma.file.delete({
      where: { id: fileId },
    });

    return true;
  } catch (error) {
    handleMinioError(error);
  }
}


export async function deleteS3Bucket(s3CredentialId: string) {
  const s3Credential = await getSingleCredential(s3CredentialId);
  if (!s3Credential) {
    throw new Error("S3 credential not found");
  }
  const minioClient = await getMinioClient(s3CredentialId);
  
  await minioClient.removeBucket(s3Credential.bucket);
}