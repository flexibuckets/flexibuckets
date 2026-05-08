/*
  Warnings:

  - You are about to drop the column `folderId` on the `PublicUploadLink` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PublicUploadLink" DROP COLUMN "folderId",
ADD COLUMN     "folderName" TEXT NOT NULL DEFAULT 'public-uploads';
