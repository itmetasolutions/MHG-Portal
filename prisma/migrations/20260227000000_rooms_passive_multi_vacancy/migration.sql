-- AlterTable: Add isPassive and passiveMarkedAt to Landlord
ALTER TABLE "Landlord" ADD COLUMN "isPassive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Landlord" ADD COLUMN "passiveMarkedAt" TIMESTAMP(3);

-- CreateEnum: VacancyType
CREATE TYPE "VacancyType" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateEnum: RoomStatus
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'UNDER_OFFER', 'CLOSED');

-- AlterTable: Add vacancyType to Property
ALTER TABLE "Property" ADD COLUMN "vacancyType" "VacancyType" NOT NULL DEFAULT 'SINGLE';

-- AlterTable: Sale - remove unique on propertyId, add roomId
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_propertyId_key";
ALTER TABLE "Sale" ADD COLUMN "roomId" UUID;
CREATE UNIQUE INDEX "Sale_roomId_key" ON "Sale"("roomId") WHERE "roomId" IS NOT NULL;
CREATE INDEX "Sale_propertyId_idx" ON "Sale"("propertyId");

-- CreateTable: PropertyRoom
CREATE TABLE "PropertyRoom" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "roomName" TEXT NOT NULL,
    "landlordDemand" DECIMAL(14,2),
    "expectedCommissionPct" DECIMAL(5,2),
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyRoom_propertyId_idx" ON "PropertyRoom"("propertyId");

-- AddForeignKey: PropertyRoom -> Property
ALTER TABLE "PropertyRoom" ADD CONSTRAINT "PropertyRoom_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Sale -> PropertyRoom
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PropertyRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
