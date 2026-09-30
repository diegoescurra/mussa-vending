BEGIN;

-- Las reposiciones historicas conservan sus datos; las nuevas registran responsables.
ALTER TABLE reposiciones
  ADD COLUMN id_camioneta integer REFERENCES camionetas(id_camioneta),
  ADD COLUMN id_repartidor integer REFERENCES usuarios(id_usuario),
  ADD CONSTRAINT reposiciones_asignacion_check
    CHECK ((id_camioneta IS NULL) = (id_repartidor IS NULL));

ALTER TABLE camioneta_movimientos
  ALTER COLUMN id_bodeguero DROP NOT NULL,
  ALTER COLUMN id_movimiento_bodega DROP NOT NULL,
  ADD COLUMN tipo text NOT NULL DEFAULT 'ENTRADA' CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  ADD COLUMN id_reposicion integer REFERENCES reposiciones(id_reposicion),
  ADD COLUMN id_maquina integer REFERENCES maquinas(id_maquina),
  ADD CONSTRAINT camioneta_movimientos_origen_check CHECK (
    (tipo = 'ENTRADA' AND id_bodeguero IS NOT NULL AND id_movimiento_bodega IS NOT NULL
      AND id_reposicion IS NULL AND id_maquina IS NULL)
    OR
    (tipo = 'SALIDA' AND id_bodeguero IS NULL AND id_movimiento_bodega IS NULL
      AND id_reposicion IS NOT NULL AND id_maquina IS NOT NULL)
  );

CREATE UNIQUE INDEX camioneta_movimientos_reposicion_producto_idx
  ON camioneta_movimientos (id_reposicion, id_producto) WHERE id_reposicion IS NOT NULL;

COMMIT;
