-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "hasTeamAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamIds" TEXT[];
