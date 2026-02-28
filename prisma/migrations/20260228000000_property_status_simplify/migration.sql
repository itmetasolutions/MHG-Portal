-- Migration: Simplify PropertyStatus to DRAFT | AVAILABLE | CLOSED
-- Replaces: DRAFT | LIVE | UNDER_OFFER | SOLD | WITHDRAWN

-- Step 1: Temporarily convert the status column to TEXT so we can freely update values
ALTER TABLE "Property" ALTER COLUMN "status" TYPE TEXT;

-- Step 2: Migrate existing data to new status values
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

-- Step 6: Re-apply the NOT NULL constraint with default (in case it was affected)
ALTER TABLE "Property" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
