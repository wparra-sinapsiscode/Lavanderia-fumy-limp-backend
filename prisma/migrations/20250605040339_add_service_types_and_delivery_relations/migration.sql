-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('PICKUP', 'DELIVERY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "ServiceStatus" ADD VALUE 'DELIVERED';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "isDeliveryService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalServiceId" TEXT,
ADD COLUMN     "serviceType" "ServiceType" NOT NULL DEFAULT 'PICKUP';

-- CreateIndex
CREATE INDEX "Service_serviceType_idx" ON "Service"("serviceType");

-- CreateIndex
CREATE INDEX "Service_originalServiceId_idx" ON "Service"("originalServiceId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_originalServiceId_fkey" FOREIGN KEY ("originalServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
