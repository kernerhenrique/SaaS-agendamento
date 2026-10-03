-- Fase 7 (D5): agendamento recorrente (série de agendamentos normais).
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "seriesId" TEXT;
-- CreateTable
CREATE TABLE "AppointmentSeries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "frequencyWeeks" INTEGER NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentSeries_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "AppointmentSeries_businessId_idx" ON "AppointmentSeries"("businessId");
-- CreateIndex
CREATE INDEX "Appointment_seriesId_idx" ON "Appointment"("seriesId");
-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "AppointmentSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AppointmentSeries" ADD CONSTRAINT "AppointmentSeries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
