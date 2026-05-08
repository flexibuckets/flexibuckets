-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('FILE_UPLOAD', 'FILE_DOWNLOAD', 'FILE_DELETE', 'FILE_RENAME', 'FILE_MOVE', 'FILE_SHARE', 'FILE_UNSHARE', 'FOLDER_CREATE', 'FOLDER_DELETE', 'FOLDER_RENAME', 'FOLDER_SHARE', 'FOLDER_UNSHARE', 'BUCKET_ADD', 'BUCKET_DELETE', 'BUCKET_CORS_UPDATE', 'BUCKET_IMPORT_OBJECTS', 'TEAM_CREATE', 'TEAM_JOIN', 'TEAM_LEAVE', 'TEAM_MEMBER_ADD', 'TEAM_MEMBER_REMOVE', 'TEAM_MEMBER_ROLE_UPDATE', 'TEAM_BUCKET_ADD', 'TEAM_BUCKET_REMOVE', 'API_KEY_CREATE', 'API_KEY_DELETE', 'USER_SIGNIN', 'USER_SIGNUP', 'USER_SETTINGS_UPDATE', 'SHARE_DOWNLOAD');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
