-- Enforce active-only uniqueness for landlord number:
-- multiple PASSIVE rows can share landlordNumber, but only one ACTIVE row can.
CREATE UNIQUE INDEX IF NOT EXISTS "Landlord_landlordNumber_active_unique"
ON "Landlord" ("landlordNumber")
WHERE "status" = 'ACTIVE'::"LandlordStatus";

-- Normalize lock behavior:
-- 1) when a row transitions to PASSIVE, stamp lockedAt if missing
-- 2) once PASSIVE, reject any future updates
CREATE OR REPLACE FUNCTION "enforce_landlord_passive_lock"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = 'PASSIVE'::"LandlordStatus" AND NEW."lockedAt" IS NULL THEN
    NEW."lockedAt" := NOW();
  END IF;

  IF OLD."status" = 'PASSIVE'::"LandlordStatus" THEN
    RAISE EXCEPTION 'PASSIVE landlord is locked and cannot be updated';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_landlord_passive_lock" ON "Landlord";
CREATE TRIGGER "trg_landlord_passive_lock"
BEFORE UPDATE ON "Landlord"
FOR EACH ROW
EXECUTE FUNCTION "enforce_landlord_passive_lock"();
