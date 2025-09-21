-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "roomId" TEXT,
    "alarmCode" TEXT,
    "resetToken" TEXT,
    "resetTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "project" TEXT,
    "floorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPresent" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uncheckout_penalties" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uncheckout_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_settings" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "pendingFrequency" TEXT,
    "pendingFromPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cleaning_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_rotations" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cleaning_rotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_records" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photos" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "floors_number_key" ON "floors"("number");

-- CreateIndex
CREATE UNIQUE INDEX "presence_userId_key" ON "presence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "uncheckout_penalties_userId_date_key" ON "uncheckout_penalties"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "cleaning_settings_floorId_key" ON "cleaning_settings"("floorId");

-- CreateIndex
CREATE UNIQUE INDEX "cleaning_rotations_floorId_roomId_key" ON "cleaning_rotations"("floorId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_codes_code_key" ON "registration_codes"("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence" ADD CONSTRAINT "presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uncheckout_penalties" ADD CONSTRAINT "uncheckout_penalties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_settings" ADD CONSTRAINT "cleaning_settings_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_rotations" ADD CONSTRAINT "cleaning_rotations_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_rotations" ADD CONSTRAINT "cleaning_rotations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_records" ADD CONSTRAINT "cleaning_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
