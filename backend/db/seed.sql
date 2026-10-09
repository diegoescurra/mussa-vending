INSERT INTO proveedores (nombre)
VALUES ('Bebidas Demo'), ('Snacks Demo')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO maquinas (codigo, nombre, descripcion, ubicacion)
VALUES
  ('M-001', 'Maquina recepcion', 'Maquina de demostracion', 'Recepcion'),
  ('M-002', 'Maquina oficina', 'Maquina de demostracion', 'Oficina')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO productos (nombre, precio_venta, costo_compra, id_proveedor)
VALUES
  ('Agua mineral 500 ml', 1000, 500, (SELECT id_proveedor FROM proveedores WHERE nombre = 'Bebidas Demo')),
  ('Bebida cola 500 ml', 1500, 800, (SELECT id_proveedor FROM proveedores WHERE nombre = 'Bebidas Demo')),
  ('Papas fritas', 1200, 600, (SELECT id_proveedor FROM proveedores WHERE nombre = 'Snacks Demo'))
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO maquina_productos (id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual)
VALUES
  ((SELECT id_maquina FROM maquinas WHERE codigo = 'M-001'), (SELECT id_producto FROM productos WHERE nombre = 'Agua mineral 500 ml'), 20, 12, 1000),
  ((SELECT id_maquina FROM maquinas WHERE codigo = 'M-001'), (SELECT id_producto FROM productos WHERE nombre = 'Bebida cola 500 ml'), 20, 10, 1500),
  ((SELECT id_maquina FROM maquinas WHERE codigo = 'M-002'), (SELECT id_producto FROM productos WHERE nombre = 'Papas fritas'), 15, 8, 1200)
ON CONFLICT (id_maquina, id_producto) DO NOTHING;
