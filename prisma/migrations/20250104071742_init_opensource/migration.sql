-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('free', 'active', 'cancelled', 'past_due', 'failed');

-- CreateEnum
CREATE TYPE "S3Provider" AS ENUM ('CLOUDFLARE', 'MINIO', 'FLYTIGRIS', 'WASABI', 'TEBI', 'IDRIVE', 'BACKBLAZE', 'STORJ', 'HETZNER', 'VULTR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "totalUploadSize" TEXT NOT NULL DEFAULT '0',
    "totalFileShares" INTEGER NOT NULL DEFAULT 0,
    "totalSharedStorage" TEXT NOT NULL DEFAULT '0',
    "totalDownloadedSize" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "s3CredentialId" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '0',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "s3CredentialId" TEXT NOT NULL DEFAULT '',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shortUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedFile" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isSharedInfinitely" BOOLEAN NOT NULL DEFAULT false,
    "downloadedSize" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "S3Credential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessKey" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'auto',
    "provider" "S3Provider",
    "endpointUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "S3Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "SharedFolder" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isSharedInfinitely" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Folder_userId_parentId_idx" ON "Folder"("userId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "File_s3Key_key" ON "File"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "File_shortUrl_key" ON "File"("shortUrl");

-- CreateIndex
CREATE INDEX "File_userId_folderId_idx" ON "File"("userId", "folderId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedFile_fileId_key" ON "SharedFile"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedFile_downloadUrl_key" ON "SharedFile"("downloadUrl");

-- CreateIndex
CREATE INDEX "S3Credential_userId_bucket_idx" ON "S3Credential"("userId", "bucket");

-- CreateIndex
CREATE UNIQUE INDEX "S3Credential_bucket_accessKey_secretKey_key" ON "S3Credential"("bucket", "accessKey", "secretKey");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "SharedFolder_folderId_key" ON "SharedFolder"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedFolder_downloadUrl_key" ON "SharedFolder"("downloadUrl");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_s3CredentialId_fkey" FOREIGN KEY ("s3CredentialId") REFERENCES "S3Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_s3CredentialId_fkey" FOREIGN KEY ("s3CredentialId") REFERENCES "S3Credential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "S3Credential" ADD CONSTRAINT "S3Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFolder" ADD CONSTRAINT "SharedFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedFolder" ADD CONSTRAINT "SharedFolder_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
