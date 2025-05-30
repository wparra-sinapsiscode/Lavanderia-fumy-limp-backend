-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'REPARTIDOR');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('NORTE', 'SUR', 'CENTRO', 'ESTE', 'OESTE', 'ADMINISTRACION');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING_PICKUP', 'PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServicePriority" AS ENUM ('ALTA', 'MEDIA', 'NORMAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('SERVICIO_LAVANDERIA', 'PAGO_HOTEL', 'SERVICIO_PREMIUM', 'RECARGO_URGENTE', 'OTRO_INGRESO');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('SUMINISTROS_LAVANDERIA', 'COMBUSTIBLE_TRANSPORTE', 'MANTENIMIENTO_EQUIPOS', 'SALARIOS_PERSONAL', 'SERVICIOS_PUBLICOS', 'MARKETING_PUBLICIDAD', 'OTRO_GASTO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TRANSFERENCIA_BANCARIA', 'YAPE', 'PLIN', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'OTRO');

-- CreateEnum
CREATE TYPE "BagLabelStatus" AS ENUM ('LABELED', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BagLabelGeneratedAt" AS ENUM ('LAVANDERIA', 'HOTEL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "zone" "Zone" NOT NULL,
    "phone" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "zone" "Zone" NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "bagInventory" INTEGER NOT NULL DEFAULT 0,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "guestName" VARCHAR(100) NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "bagCount" INTEGER NOT NULL,
    "weight" DECIMAL(10,2),
    "observations" TEXT,
    "specialInstructions" TEXT,
    "priority" "ServicePriority" NOT NULL DEFAULT 'NORMAL',
    "pickupDate" TIMESTAMP(3),
    "estimatedPickupDate" TIMESTAMP(3) NOT NULL,
    "labeledDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "estimatedDeliveryDate" TIMESTAMP(3),
    "status" "ServiceStatus" NOT NULL DEFAULT 'PENDING_PICKUP',
    "photos" TEXT[],
    "signature" TEXT,
    "collectorName" TEXT,
    "geolocation" JSONB,
    "repartidorId" TEXT,
    "deliveryRepartidorId" TEXT,
    "partialDeliveryPercentage" INTEGER,
    "price" DECIMAL(10,2),
    "pickupTimeSlot" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "labelingPhotos" TEXT[],
    "deliveryPhotos" TEXT[],
    "deliveredBagCount" INTEGER,
    "remainingBags" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BagLabel" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bagNumber" INTEGER NOT NULL,
    "photo" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BagLabelStatus" NOT NULL DEFAULT 'LABELED',
    "generatedAt" "BagLabelGeneratedAt" NOT NULL DEFAULT 'LAVANDERIA',
    "observations" TEXT,
    "labeledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BagLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "incomeCategory" "IncomeCategory",
    "expenseCategory" "ExpenseCategory",
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "hotelId" TEXT,
    "serviceId" TEXT,
    "notes" TEXT,
    "registeredById" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceId" TEXT,
    "bagLabelId" TEXT,
    "transactionId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_zone_idx" ON "User"("zone");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_name_key" ON "Hotel"("name");

-- CreateIndex
CREATE INDEX "Hotel_zone_idx" ON "Hotel"("zone");

-- CreateIndex
CREATE INDEX "Service_hotelId_idx" ON "Service"("hotelId");

-- CreateIndex
CREATE INDEX "Service_repartidorId_idx" ON "Service"("repartidorId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- CreateIndex
CREATE INDEX "Service_priority_idx" ON "Service"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "BagLabel_label_key" ON "BagLabel"("label");

-- CreateIndex
CREATE INDEX "BagLabel_serviceId_idx" ON "BagLabel"("serviceId");

-- CreateIndex
CREATE INDEX "BagLabel_hotelId_idx" ON "BagLabel"("hotelId");

-- CreateIndex
CREATE INDEX "BagLabel_label_idx" ON "BagLabel"("label");

-- CreateIndex
CREATE UNIQUE INDEX "BagLabel_serviceId_bagNumber_key" ON "BagLabel"("serviceId", "bagNumber");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_hotelId_idx" ON "Transaction"("hotelId");

-- CreateIndex
CREATE INDEX "Transaction_serviceId_idx" ON "Transaction"("serviceId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_token_key" ON "RevokedToken"("token");

-- CreateIndex
CREATE INDEX "RevokedToken_token_idx" ON "RevokedToken"("token");

-- CreateIndex
CREATE INDEX "RevokedToken_userId_idx" ON "RevokedToken"("userId");

-- CreateIndex
CREATE INDEX "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_repartidorId_fkey" FOREIGN KEY ("repartidorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_deliveryRepartidorId_fkey" FOREIGN KEY ("deliveryRepartidorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BagLabel" ADD CONSTRAINT "BagLabel_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BagLabel" ADD CONSTRAINT "BagLabel_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BagLabel" ADD CONSTRAINT "BagLabel_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BagLabel" ADD CONSTRAINT "BagLabel_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_bagLabelId_fkey" FOREIGN KEY ("bagLabelId") REFERENCES "BagLabel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevokedToken" ADD CONSTRAINT "RevokedToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
