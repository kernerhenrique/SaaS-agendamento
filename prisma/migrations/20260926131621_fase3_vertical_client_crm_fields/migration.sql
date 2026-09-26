-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "businessType" TEXT NOT NULL DEFAULT 'barbershop';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "color" TEXT,
ADD COLUMN     "specialty" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visibleOnline" BOOLEAN NOT NULL DEFAULT true;
