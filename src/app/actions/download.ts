 'use server'

import { prisma } from "@/lib/prisma";
import { getMinioClient } from "@/lib/s3";

export async function getFileDownloadUrl(fileId: string): Promise<{ url: string; fileName: string }> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { s3Credential: true },
  });

  if (!file || !file.s3Credential) {
    throw new Error("File not found or missing credentials");
  }

  const minioClient = await getMinioClient(file.s3CredentialId);
  const presignedUrl = await minioClient.presignedGetObject(
    file.s3Credential.bucket,
    file.s3Key,
    60 * 60
  );

  return { url: presignedUrl, fileName: file.name };
}

export async function getFolderDownloadUrls(folderId: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { 
      files: {
        include: { s3Credential: true }
      },
      children: {
        include: {
          files: {
            include: { s3Credential: true }
          }
        }
      }
    }
  });

  if (!folder) throw new Error("Folder not found");

  const urls: { path: string; url: string; name: string }[] = [];
  
  const processFolder = async (currentFolder: any, path: string = '') => {
    for (const file of currentFolder.files) {
      const minioClient = await getMinioClient(file.s3CredentialId);
      const presignedUrl = await minioClient.presignedGetObject(
        file.s3Credential.bucket,
        file.s3Key,
        60 * 60
      );
      urls.push({ 
        path: path,
        url: presignedUrl,
        name: file.name
      });
    }

    for (const subfolder of currentFolder.children || []) {
      await processFolder(subfolder, `${path}${subfolder.name}/`);
    }
  };

  await processFolder(folder);
  return { urls, folderName: folder.name };
}