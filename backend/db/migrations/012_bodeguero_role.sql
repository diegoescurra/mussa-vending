BEGIN;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
-- Las instalaciones antiguas usaban un enum; normalizar al tipo del esquema actual.
ALTER TABLE usuarios ALTER COLUMN rol TYPE text USING rol::text;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('ADMIN', 'REPONEDOR', 'BODEGUERO'));

COMMIT;
