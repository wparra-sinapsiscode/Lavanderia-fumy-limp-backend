-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "repartidorId" TEXT NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "totalDistance" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "serviceId" TEXT,
    "hotelId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledTime" TIMESTAMP(3),
    "actualTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Route_repartidorId_idx" ON "Route"("repartidorId");

-- CreateIndex
CREATE INDEX "Route_date_idx" ON "Route"("date");

-- CreateIndex
CREATE INDEX "Route_status_idx" ON "Route"("status");

-- CreateIndex
CREATE INDEX "RouteStop_routeId_idx" ON "RouteStop"("routeId");

-- CreateIndex
CREATE INDEX "RouteStop_hotelId_idx" ON "RouteStop"("hotelId");

-- CreateIndex
CREATE INDEX "RouteStop_serviceId_idx" ON "RouteStop"("serviceId");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
