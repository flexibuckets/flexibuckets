-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('SMTP', 'RESEND');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "allowSignups" BOOLEAN NOT NULL DEFAULT false,
    "emailProvider" "EmailProvider" DEFAULT 'SMTP',
    "emailFrom" TEXT,
    "smtpConfig" JSONB,
    "resendConfig" JSONB,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
