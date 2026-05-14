-- Drop the old unique constraint on (bucket, accessKey, secretKey)
-- This constraint is replaced by credentialHash for duplicate detection
-- First, find and drop the existing unique constraint
DO $$ 
BEGIN
    -- Find the constraint name dynamically
    DECLARE constraint_name TEXT;
    BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'S3Credential'
        AND con.contype = 'u'
        AND EXISTS (
            SELECT 1 FROM pg_attribute attr
            JOIN pg_class cls ON cls.oid = attr.attrelid
            WHERE attr.attnum = ANY(con.conkey)
            AND cls.relname = 'S3Credential'
            AND attr.attname IN ('bucket', 'accessKey', 'secretKey')
        );

        IF constraint_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE "S3Credential" DROP CONSTRAINT %I', constraint_name);
        END IF;
    END;
END $$;

-- Add credentialHash column (nullable initially, will be populated by migration script)
ALTER TABLE "S3Credential" ADD COLUMN "credentialHash" TEXT;

-- Create unique index on credentialHash (allows NULLs - multiple NULLs are allowed in unique indexes in Postgres)
CREATE UNIQUE INDEX "S3Credential_credentialHash_key" ON "S3Credential" ("credentialHash");