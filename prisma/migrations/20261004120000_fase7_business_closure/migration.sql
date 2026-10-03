-- Fase 7 (D2): dias em que o negócio fecha (feriados, férias coletivas).
-- CreateTable
CREATE TABLE "BusinessClosure" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessClosure_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "BusinessClosure_businessId_endDate_idx" ON "BusinessClosure"("businessId", "endDate");
-- AddForeignKey
ALTER TABLE "BusinessClosure" ADD CONSTRAINT "BusinessClosure_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
