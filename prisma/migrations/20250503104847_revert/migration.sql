/*
  Warnings:

  - You are about to drop the column `storageQuota` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `storageUsed` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Agent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AgentStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BackupJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BackupSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_TeamAdmins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_TeamUsers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_apiKeyId_fkey";

-- DropForeignKey
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_userId_fkey";

-- DropForeignKey
ALTER TABLE "AgentStats" DROP CONSTRAINT "AgentStats_agentId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_teamId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "BackupJob" DROP CONSTRAINT "BackupJob_agentId_fkey";

-- DropForeignKey
ALTER TABLE "BackupJob" DROP CONSTRAINT "BackupJob_teamId_fkey";

-- DropForeignKey
ALTER TABLE "BackupJob" DROP CONSTRAINT "BackupJob_userId_fkey";

-- DropForeignKey
ALTER TABLE "BackupSchedule" DROP CONSTRAINT "BackupSchedule_agentId_fkey";

-- DropForeignKey
ALTER TABLE "UserStats" DROP CONSTRAINT "UserStats_userId_fkey";

-- DropForeignKey
ALTER TABLE "_TeamAdmins" DROP CONSTRAINT "_TeamAdmins_A_fkey";

-- DropForeignKey
ALTER TABLE "_TeamAdmins" DROP CONSTRAINT "_TeamAdmins_B_fkey";

-- DropForeignKey
ALTER TABLE "_TeamUsers" DROP CONSTRAINT "_TeamUsers_A_fkey";

-- DropForeignKey
ALTER TABLE "_TeamUsers" DROP CONSTRAINT "_TeamUsers_B_fkey";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "storageQuota",
DROP COLUMN "storageUsed";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropTable
DROP TABLE "Agent";

-- DropTable
DROP TABLE "AgentStats";

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "BackupJob";

-- DropTable
DROP TABLE "BackupSchedule";

-- DropTable
DROP TABLE "UserStats";

-- DropTable
DROP TABLE "_TeamAdmins";

-- DropTable
DROP TABLE "_TeamUsers";

-- DropEnum
DROP TYPE "AgentStatus";

-- DropEnum
DROP TYPE "BackupJobStatus";

-- DropEnum
DROP TYPE "UserRole";
