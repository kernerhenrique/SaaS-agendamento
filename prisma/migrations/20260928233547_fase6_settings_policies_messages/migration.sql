-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('CONFIRMATION', 'REMINDER', 'FOLLOW_UP');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "maxBookingWindowDays" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "minBookingNoticeMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BusinessWorkingHours" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessWorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "sentAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWorkingHours_businessId_weekday_key" ON "BusinessWorkingHours"("businessId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_businessId_kind_key" ON "MessageTemplate"("businessId", "kind");

-- CreateIndex
CREATE INDEX "MessageLog_businessId_idx" ON "MessageLog"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageLog_appointmentId_kind_key" ON "MessageLog"("appointmentId", "kind");

-- AddForeignKey
ALTER TABLE "BusinessWorkingHours" ADD CONSTRAINT "BusinessWorkingHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
