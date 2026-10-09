BEGIN;
SELECT pg_advisory_xact_lock(734821, 1);

INSERT INTO proveedores (nombre)
VALUES
  ('CASO'),
  ('CANVI'),
  ('EVERCRISP'),
  ('IDEAL'),
  ('PROALIMENTOS'),
  ('SERFEL'),
  ('SANO DELEITE'),
  ('TRES MONTES'),
  ('COCA COLA'),
  ('CCU'),
  ('COLUN')
ON CONFLICT (nombre) DO NOTHING;

-- Product names are unique; distinguish the two supplier-specific TUAREG entries.
WITH data (proveedor, nombre, costo_compra, precio_venta) AS (
  VALUES
    ('CASO', 'TUAREG (CASO)', 285, 600),
    ('CASO', 'CHOCMAN', 183, 500),
    ('CASO', 'DINDON', 285, 600),
    ('CASO', 'SODA', 294, 750),
    ('CASO', 'IN-KAT', 239, 600),
    ('CASO', 'FRAC', 289, 600),
    ('CASO', 'TRES NEGRITOS', 190, 500),
    ('CASO', 'CEREAL BAR', 163, 500),
    ('CASO', 'ALFAJOR PREMIUM', 397, 900),
    ('CASO', 'JUMEX BOTELLA', 1250, 2500),
    ('CASO', 'RICOLATE', 213, 600),
    ('CASO', 'GOLAZO', 190, 500),
    ('CASO', 'PICNIC', 251, 600),
    ('CASO', 'MINICOSTA', 240, 600),
    ('CASO', 'GODEN NUSS', 483, 1100),
    ('CASO', 'SAFARI', 220, 500),
    ('CASO', 'AMBERRIES', 190, 600),

    ('CANVI', 'BIGTIME', 311, 600),
    ('CANVI', 'TURRON GALLETA', 234, 600),
    ('CANVI', 'TURRON MANI', 306, 700),
    ('CANVI', 'CRACKLET', 230, 600),
    ('CANVI', 'SELZ', 241, 600),
    ('CANVI', 'GOMITAS BOMBOMBUM', 441, 900),
    ('CANVI', 'ALOE VERA FRESH', 996, 1800),
    ('CANVI', 'ITALIANO', 381, 900),

    ('EVERCRISP', 'PAPAS', 770, 1400),
    ('EVERCRISP', 'DETODITO', 770, 1400),
    ('EVERCRISP', 'DORITOS', 770, 1400),
    ('EVERCRISP', 'MANI SALADO', 387, 900),

    ('IDEAL', 'BROWNIE CHOC', 390, 900),
    ('IDEAL', 'BROWNIE CHIP', 563, 1200),
    ('IDEAL', 'MARMOL', 583, 1200),
    ('IDEAL', 'PINGUINOS', 605, 1200),
    ('IDEAL', 'RAYITAS', 445, 1000),
    ('IDEAL', 'MAGDALENAS', 635, 1300),

    ('PROALIMENTOS', 'SEMBOL', 370, 800),
    ('PROALIMENTOS', 'WILD PROTEIN', 887, 1900),
    ('PROALIMENTOS', 'WILD PROTEIN SHAKE LATA', 1582, 2600),

    ('SERFEL', 'SODA CUBO', 316, 750),
    ('SERFEL', 'TUAREG (SERFEL)', 289, 600),
    ('SERFEL', 'DIN DON', 253, 600),
    ('SERFEL', 'MIX FRUTOS', 770, 1500),

    ('SANO DELEITE', 'GALLETON', 500, 1000),
    ('SANO DELEITE', 'MINI CHIPS', 450, 900),
    ('SANO DELEITE', 'MINI ZANAHORIA', 450, 900),

    ('TRES MONTES', 'MUIBON FLOW LECHE', 468, 1000),

    ('COCA COLA', 'COCA COLA LATA', 952, 1200),
    ('COCA COLA', 'COCA ZERO LATA', 952, 1200),
    ('COCA COLA', 'COCA LIGHT LATA', 0, 1200),
    ('COCA COLA', 'MONSTER', 0, 2500),
    ('COCA COLA', 'COCA COLA PET', 890, 1800),
    ('COCA COLA', 'COCA ZERO PET', 890, 1800),
    ('COCA COLA', 'ANDINA PET 400', 902, 1500),

    ('CCU', 'GATORADE', 885, 1500),
    ('CCU', 'REDBULL 250cc', 1214, 2000),
    ('CCU', 'KEM EXTREME LATA', 692, 1200),
    ('CCU', 'CANADA LATA', 692, 1200),
    ('CCU', 'PIÑA LATA', 692, 1200),
    ('CCU', 'LIMON LATA', 692, 1200),
    ('CCU', 'PAP LATA', 692, 1200),
    ('CCU', 'PEPSI ZERO LATA', 692, 1200),
    ('CCU', 'CACHANTUN CON GAS', 470, 1200),
    ('CCU', 'CACHANTUN SIN GAS', 470, 1200),
    ('CCU', 'MAS VARIEDADES', 0, 1200),
    ('CCU', 'NESCAFÉ LATA', 1462, 2500),
    ('CCU', 'CANADA PET', 0, 1800),
    ('CCU', 'PIÑA PET', 771, 1800),
    ('CCU', 'LIMON SODA PET', 771, 1800),
    ('CCU', 'PEPSI PET', 766, 1800),
    ('CCU', 'KEM EXTREME PET', 815, 1800),

    ('COLUN', 'JUGO COLUN', 247, 700),
    ('COLUN', 'LECHE COLUN', 399, 900),
    ('COLUN', 'PRISMA VARIEDADES', 715, 1500),
    ('COLUN', 'SQUEEZE', 471, 1000)
)
INSERT INTO productos (nombre, id_proveedor, costo_compra, precio_venta)
SELECT d.nombre, p.id_proveedor, d.costo_compra, d.precio_venta
FROM data d
JOIN proveedores p ON p.nombre = d.proveedor
ON CONFLICT (nombre) DO NOTHING;

COMMIT;
