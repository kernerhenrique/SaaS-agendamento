-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PROFESSIONAL';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "cancelledByUserId" TEXT,
ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "notesUpdatedAt" TIMESTAMPTZ(6),
ADD COLUMN     "notesUpdatedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "professionalId" TEXT;

-- CreateTable
CREATE TABLE "StaffInvite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvite_tokenHash_key" ON "StaffInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffInvite_professionalId_idx" ON "StaffInvite"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_professionalId_key" ON "User"("professionalId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvite" ADD CONSTRAINT "StaffInvite_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

