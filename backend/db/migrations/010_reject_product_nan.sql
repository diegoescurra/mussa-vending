ALTER TABLE productos
  ADD CONSTRAINT productos_importes_sin_nan
  CHECK (precio_venta <> 'NaN'::numeric AND costo_compra <> 'NaN'::numeric);
