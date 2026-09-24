-- Impede, no nível do banco, dois agendamentos ativos sobrepostos para o mesmo
-- profissional. A aplicação já faz uma checagem otimista antes de inserir, mas
-- só esta constraint garante a invariante sob concorrência (duas confirmações
-- simultâneas para o mesmo horário).
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tstzrange("startAt", "endAt") WITH &&
  )
  WHERE (status != 'CANCELLED');
