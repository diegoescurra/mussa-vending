BEGIN;

-- Existing machines remain unconfigured until edited through the API.
ALTER TABLE maquinas
  ADD COLUMN modelo text NOT NULL DEFAULT '',
  ADD COLUMN sistemas_pago text[] NOT NULL DEFAULT '{}'::text[],
  ADD CONSTRAINT maquinas_modelo_check CHECK (modelo = btrim(modelo)),
  ADD CONSTRAINT maquinas_sistemas_pago_check CHECK (
    CASE
      WHEN cardinality(sistemas_pago) = 0 THEN true
      WHEN array_ndims(sistemas_pago) = 1 THEN
        sistemas_pago <@ ARRAY['MONEDA', 'BILLETE', 'TARJETA']::text[]
        AND array_position(sistemas_pago, NULL) IS NULL
        AND cardinality(sistemas_pago) =
          (CASE WHEN 'MONEDA' = ANY(sistemas_pago) THEN 1 ELSE 0 END)
          + (CASE WHEN 'BILLETE' = ANY(sistemas_pago) THEN 1 ELSE 0 END)
          + (CASE WHEN 'TARJETA' = ANY(sistemas_pago) THEN 1 ELSE 0 END)
      ELSE false
    END
  );

COMMIT;
