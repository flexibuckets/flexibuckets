import { prisma } from "@/lib/prisma";

export async function getUserBucketCount(userId: string): Promise<number> {
  return await prisma.s3Credential.count({
    where: { userId }
  });
}

export async function getUserFileCount(userId: string): Promise<number> {
  return await prisma.file.count({
    where: { userId }
  });
}

export async function getUserFolderCount(userId: string): Promise<number> {
  return await prisma.folder.count({
    where: { userId }
  });
} 