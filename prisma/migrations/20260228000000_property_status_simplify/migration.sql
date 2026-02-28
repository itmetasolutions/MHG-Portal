-- Migration: Simplify PropertyStatus to DRAFT | AVAILABLE | CLOSED
-- Idempotent: only performs changes if old enum values still exist in the database

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum pe
    JOIN pg_type pt ON pe.enumtypid = pt.oid
    WHERE pt.typname = 'PropertyStatus'
      AND pe.enumlabel IN ('SOLD', 'LIVE', 'UNDER_OFFER', 'WITHDRAWN')
  ) THEN
    -- Step 1: Convert column to TEXT so values can be freely updated
    ALTER TABLE "Property" ALTER COLUMN "status" TYPE TEXT;

    -- Step 2: Map old values to new values
    UPDATE "Property" SET status = 'AVAILABLE' WHERE status IN ('LIVE', 'UNDER_OFFER');
    UPDATE "Property" SET status = 'CLOSED'    WHERE status = 'SOLD';
    UPDATE "Property" SET status = 'DRAFT'     WHERE status = 'WITHDRAWN';

    -- Step 3: Drop the old enum type
    DROP TYPE "PropertyStatus";

    -- Step 4: Create the new simplified enum type
    CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'CLOSED');

    -- Step 5: Restore the column to use the new enum type
    ALTER TABLE "Property"
      ALTER COLUMN "status" TYPE "PropertyStatus"
      USING status::"PropertyStatus";

    -- Step 6: Re-apply the default
    ALTER TABLE "Property" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
  END IF;
END $$;
