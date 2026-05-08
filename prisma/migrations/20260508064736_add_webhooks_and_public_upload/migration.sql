-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('FILE_UPLOAD', 'FILE_DELETE', 'FILE_SHARE', 'FILE_UNSHARE', 'FOLDER_CREATE', 'FOLDER_DELETE', 'FOLDER_SHARE', 'BUCKET_ADD', 'BUCKET_DELETE', 'PUBLIC_UPLOAD_RECEIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PUBLIC_UPLOAD_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'WEBHOOK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'WEBHOOK_DELETED';

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" "WebhookEvent"[],
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicUploadLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "s3CredentialId" TEXT NOT NULL,
    "folderId" TEXT,
    "token" TEXT NOT NULL,
    "maxFileSize" INTEGER NOT NULL DEFAULT 104857600,
    "maxFileCount" INTEGER,
    "currentFileCount" INTEGER NOT NULL DEFAULT 0,
    "allowedTypes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicUploadLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Webhook_userId_idx" ON "Webhook"("userId");

-- CreateIndex
CREATE INDEX "Webhook_events_idx" ON "Webhook"("events");

-- CreateIndex
CREATE UNIQUE INDEX "PublicUploadLink_token_key" ON "PublicUploadLink"("token");

-- CreateIndex
CREATE INDEX "PublicUploadLink_userId_idx" ON "PublicUploadLink"("userId");

-- CreateIndex
CREATE INDEX "PublicUploadLink_token_idx" ON "PublicUploadLink"("token");

-- CreateIndex
CREATE INDEX "PublicUploadLink_s3CredentialId_idx" ON "PublicUploadLink"("s3CredentialId");

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicUploadLink" ADD CONSTRAINT "PublicUploadLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicUploadLink" ADD CONSTRAINT "PublicUploadLink_s3CredentialId_fkey" FOREIGN KEY ("s3CredentialId") REFERENCES "S3Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
