-- Valor do atendimento gravado no próprio agendamento (Fase 4).
-- Escrita à mão por causa do backfill: a coluna nasce opcional, recebe o
-- preço ATUAL do serviço para os agendamentos que já existem e só então vira
-- obrigatória. Daqui em diante o valor é gravado na criação
-- (insertAppointment) e editar o preço do serviço não reescreve o passado.

-- 1. Coluna opcional
ALTER TABLE "Appointment" ADD COLUMN "priceCents" INTEGER;

-- 2. Backfill com o preço atual do serviço de cada agendamento
UPDATE "Appointment" a
SET "priceCents" = s."priceCents"
FROM "Service" s
WHERE s."id" = a."serviceId";

-- 3. Obrigatória (todo agendamento tem serviço: FK NOT NULL com ON DELETE RESTRICT)
ALTER TABLE "Appointment" ALTER COLUMN "priceCents" SET NOT NULL;
