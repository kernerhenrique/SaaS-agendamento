-- Fase 7 (B2): negócios de demonstração (pública e prévias por prospect).
ALTER TABLE "Business" ADD COLUMN     "demoExpiresAt" TIMESTAMPTZ(6),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;
