BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 1;
-- Si existen emails duplicados por mayúsculas/espacios, resolverlos antes de migrar.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_normalizado_idx ON usuarios (lower(btrim(email)));
CREATE TABLE IF NOT EXISTS sesiones (
  sid varchar PRIMARY KEY,
  sess json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_expire_idx ON sesiones (expire);
COMMIT;
