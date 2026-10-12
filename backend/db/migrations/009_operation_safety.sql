BEGIN;

CREATE TABLE reposicion_operaciones (
  id_operacion uuid PRIMARY KEY,
  solicitud jsonb NOT NULL,
  respuesta jsonb
);

ALTER TABLE maquina_productos ADD COLUMN version integer NOT NULL DEFAULT 1;

CREATE FUNCTION incrementar_version_inventario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER maquina_productos_version
BEFORE UPDATE ON maquina_productos
FOR EACH ROW EXECUTE FUNCTION incrementar_version_inventario();

COMMIT;
