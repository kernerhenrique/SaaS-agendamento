-- Padroniza Client.phone para só dígitos. Telefone é a chave de deduplicação
-- do cliente ((businessId, phone) único), então "(11) 99999-0001" e
-- "11999990001" precisam virar o mesmo cadastro. Duplicados são unidos no
-- cadastro mais antigo: agendamentos são repontados e o e-mail é aproveitado
-- quando o mais antigo não tiver.

CREATE TEMP TABLE client_phone_merge ON COMMIT DROP AS
SELECT
  id,
  first_value(id) OVER (
    PARTITION BY "businessId", regexp_replace(phone, '\D', '', 'g')
    ORDER BY "createdAt", id
  ) AS keep_id
FROM "Client";

UPDATE "Client" AS keep
SET email = dup.email
FROM client_phone_merge AS m
JOIN "Client" AS dup ON dup.id = m.id
WHERE keep.id = m.keep_id
  AND m.id <> m.keep_id
  AND keep.email IS NULL
  AND dup.email IS NOT NULL;

UPDATE "Appointment" AS a
SET "clientId" = m.keep_id
FROM client_phone_merge AS m
WHERE a."clientId" = m.id
  AND m.id <> m.keep_id;

DELETE FROM "Client" AS c
USING client_phone_merge AS m
WHERE c.id = m.id
  AND m.id <> m.keep_id;

UPDATE "Client"
SET phone = regexp_replace(phone, '\D', '', 'g')
WHERE phone ~ '\D';
