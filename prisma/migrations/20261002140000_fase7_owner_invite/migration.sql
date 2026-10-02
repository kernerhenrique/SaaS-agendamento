-- Fase 7 (B1): primeiro acesso do dono pelo mesmo mecanismo de convite.
-- Convite de dono não tem cadastro da agenda, então professionalId fica opcional.
ALTER TABLE "StaffInvite" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'PROFESSIONAL',
ALTER COLUMN "professionalId" DROP NOT NULL;

-- Cor padrão de negócio sem cor escolhida: o primary da marca Aprazzo.
ALTER TABLE "Business" ALTER COLUMN "accentColor" SET DEFAULT '#0F766E';
