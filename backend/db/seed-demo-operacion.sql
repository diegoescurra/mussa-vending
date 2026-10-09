-- Manual Neon SQL editor execution only: migrations 000..007, then real catalog.
BEGIN;
SELECT pg_advisory_xact_lock(734821, 1);
SET LOCAL TIME ZONE 'America/Santiago';

DO $demo$
DECLARE
  names text[] := ARRAY['CHOCMAN', 'TUAREG (CASO)', 'PAPAS', 'COCA COLA LATA', 'CACHANTUN SIN GAS', 'WILD PROTEIN'];
  products integer[];
  users integer[] := ARRAY[]::integer[];
  vans integer[] := ARRAY[]::integer[];
  machines integer[] := ARRAY[]::integer[];
  base_date date := current_date;
  stamp timestamptz;
  missing text;
  admin_id integer;
  new_id integer;
  movement_id integer;
  visit_id integer;
  p integer;
  v integer;
  m integer;
  round_no integer;
  found integer;
  refill integer;
  removed integer;
  sold integer;
  final_stock integer;
  balance integer;
  expected numeric;
  cash_difference numeric;
  slot record;
BEGIN
  -- Fail before touching data if 006/007 or the singular slot table are missing.
  SELECT string_agg(req.t || '.' || req.c, ', ' ORDER BY req.t, req.c) INTO missing
  FROM (VALUES
    ('proveedores','id_proveedor'), ('productos','id_proveedor'), ('productos','costo_compra'),
    ('maquinas','codigo'), ('usuarios','email'), ('camionetas','id_repartidor'),
    ('maquina_productos','id_maquina_producto'), ('maquina_productos','stock_actual'),
    ('bodega_productos','stock_actual'), ('bodega_movimientos','stock_final'),
    ('camioneta_productos','stock_actual'), ('camioneta_movimientos','tipo'),
    ('camioneta_movimientos','id_reposicion'), ('camioneta_movimientos','id_maquina'),
    ('camioneta_movimientos','id_movimiento_bodega'), ('reposiciones','id_camioneta'),
    ('reposiciones','id_repartidor'), ('reposicion_detalles','stock_sistema'),
    ('reposicion_detalles','cantidad_retirada'), ('reposicion_detalles','venta_esperada'),
    ('conteos','diferencia')
  ) req(t,c)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = to_regclass(req.t) AND a.attname = req.c
      AND a.attnum > 0 AND NOT a.attisdropped
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'DEMO-V1: esquema incompleto (%). Aplicar migraciones 000..007; se requiere maquina_productos singular y migraciones 006/007.', missing;
  END IF;

  -- Also exclude application writes between the guard and the final completion marker.
  LOCK TABLE productos, proveedores, usuarios, camionetas, maquinas, maquina_productos,
    bodega_productos, bodega_movimientos, camioneta_productos, camioneta_movimientos,
    reposiciones, reposicion_detalles, conteos IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (SELECT 1 FROM conteos WHERE observacion = 'DEMO-V1 COMPLETE') THEN
    IF (SELECT count(*) FROM conteos WHERE observacion = 'DEMO-V1 COMPLETE') <> 1
      OR NOT EXISTS (
        SELECT 1 FROM conteos c JOIN camionetas v USING (id_camioneta)
        JOIN productos p USING (id_producto) JOIN usuarios u ON u.id_usuario = c.id_responsable
        WHERE c.observacion = 'DEMO-V1 COMPLETE' AND v.patente = 'DEMO-V1-B'
          AND p.nombre = 'WILD PROTEIN' AND u.email = 'demo-v1-admin@example.invalid'
      )
      OR (SELECT count(*) FROM usuarios WHERE email IN ('demo-v1-admin@example.invalid', 'demo-v1-a@example.invalid', 'demo-v1-b@example.invalid')) <> 3
      OR (SELECT count(*) FROM camionetas WHERE patente IN ('DEMO-V1-A','DEMO-V1-B')) <> 2
      OR (SELECT count(*) FROM maquinas WHERE codigo IN ('DEMO-V1-M1','DEMO-V1-M2','DEMO-V1-M3','DEMO-V1-M4','DEMO-V1-M5')) <> 5
      OR (SELECT count(*) FROM reposiciones WHERE observacion LIKE 'DEMO-V1 visita %') <> 12
      OR (SELECT count(*) FROM reposicion_detalles d JOIN reposiciones r USING (id_reposicion) WHERE r.observacion LIKE 'DEMO-V1 visita %') <> 72
      OR (SELECT count(*) FROM bodega_movimientos WHERE observacion LIKE 'DEMO-V1 %') <> 24
      OR (SELECT count(*) FROM camioneta_movimientos WHERE observacion LIKE 'DEMO-V1 %') <> 72
      OR (SELECT count(*) FROM conteos WHERE observacion LIKE 'DEMO-V1 %') <> 18
      OR (SELECT count(*) FROM maquina_productos s JOIN maquinas m USING (id_maquina)
          JOIN productos p USING (id_producto) WHERE m.codigo IN ('DEMO-V1-M1','DEMO-V1-M2','DEMO-V1-M3') AND p.nombre = ANY(names)) <> 18
    THEN
      RAISE EXCEPTION 'DEMO-V1: demo parcial o marcador COMPLETE en colision; no se adopta, repara ni reinicia. Revisar manualmente.';
    END IF;
    RAISE NOTICE 'DEMO-V1 completo: se conserva tal cual, incluidos uso manual, saldos, precios y fechas; no se inserta ni reinicia nada.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM usuarios WHERE email LIKE 'demo-v1-%' OR nombre LIKE 'DEMO-V1%')
    OR EXISTS (SELECT 1 FROM maquinas WHERE codigo LIKE 'DEMO-V1%' OR nombre LIKE 'DEMO-V1%' OR descripcion LIKE 'DEMO-V1%')
    OR EXISTS (SELECT 1 FROM camionetas WHERE patente LIKE 'DEMO-V1%' OR nombre LIKE 'DEMO-V1%')
    OR EXISTS (SELECT 1 FROM bodega_movimientos WHERE observacion LIKE 'DEMO-V1%')
    OR EXISTS (SELECT 1 FROM camioneta_movimientos WHERE observacion LIKE 'DEMO-V1%')
    OR EXISTS (SELECT 1 FROM reposiciones WHERE observacion LIKE 'DEMO-V1%')
    OR EXISTS (SELECT 1 FROM conteos WHERE observacion LIKE 'DEMO-V1%')
  THEN
    RAISE EXCEPTION 'DEMO-V1: identificador reservado en colision o demo parcial sin COMPLETE; no se adoptan entidades existentes. Revisar manualmente.';
  END IF;

  SELECT array_agg(p.id_producto ORDER BY array_position(names, p.nombre)) INTO products
  FROM productos p WHERE p.nombre = ANY(names);
  IF coalesce(array_length(products, 1), 0) <> 6 THEN
    RAISE EXCEPTION 'DEMO-V1: faltan productos reales; ejecutar seed-productos-reales.sql primero.';
  END IF;
  IF EXISTS (SELECT 1 FROM productos p LEFT JOIN proveedores pr USING (id_proveedor)
             WHERE p.id_producto = ANY(products) AND (NOT p.estado OR pr.id_proveedor IS NULL OR NOT pr.estado)) THEN
    RAISE EXCEPTION 'DEMO-V1: los seis productos deben estar activos y tener proveedor activo; el seed no modifica el catalogo.';
  END IF;
  IF (SELECT sum(precio_venta) FROM productos WHERE id_producto = ANY(products)) < 125 THEN
    RAISE EXCEPTION 'DEMO-V1: precios insuficientes para diferencia de caja -500 sin caja negativa; revisar catalogo manualmente.';
  END IF;
  IF EXISTS (SELECT 1 FROM bodega_productos WHERE id_producto = ANY(products) AND stock_actual <> 0)
    OR EXISTS (SELECT 1 FROM camioneta_productos WHERE id_producto = ANY(products) AND stock_actual <> 0)
    OR EXISTS (SELECT 1 FROM maquina_productos WHERE id_producto = ANY(products) AND stock_actual <> 0)
    OR EXISTS (SELECT 1 FROM bodega_movimientos WHERE id_producto = ANY(products))
    OR EXISTS (SELECT 1 FROM camioneta_movimientos WHERE id_producto = ANY(products))
    OR EXISTS (SELECT 1 FROM conteos WHERE id_producto = ANY(products))
    OR EXISTS (SELECT 1 FROM reposicion_detalles d JOIN maquina_productos s USING (id_maquina_producto) WHERE s.id_producto = ANY(products))
    OR EXISTS (SELECT 1 FROM reposiciones r JOIN maquina_productos s USING (id_maquina) WHERE s.id_producto = ANY(products))
  THEN
    RAISE EXCEPTION 'DEMO-V1: los seis productos requieren stock cero en central, todas las camionetas y maquinas, y ningun historial/uso previo (incluidos conteos y visitas). No se sobrescribe ni inventa historia.';
  END IF;

  FOR v IN 1..3 LOOP
    INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, fecha_creacion)
    VALUES ('DEMO-V1 ' || CASE v WHEN 1 THEN 'Admin' WHEN 2 THEN 'Ruta A' ELSE 'Ruta B' END,
      'Operacion', (ARRAY['demo-v1-admin@example.invalid','demo-v1-a@example.invalid','demo-v1-b@example.invalid'])[v],
      '!DEMO-V1-NO-LOGIN', CASE WHEN v = 1 THEN 'ADMIN' ELSE 'REPONEDOR' END,
      (base_date - 13 + time '08:00') AT TIME ZONE 'America/Santiago')
    RETURNING id_usuario INTO new_id;
    users := array_append(users, new_id);
  END LOOP;
  admin_id := users[1];
  FOR v IN 1..2 LOOP
    INSERT INTO camionetas (patente, nombre, id_repartidor, fecha_creacion)
    VALUES ('DEMO-V1-' || CASE v WHEN 1 THEN 'A' ELSE 'B' END,
      'DEMO-V1 Ruta ' || v, users[v+1], (base_date - 13 + time '08:10') AT TIME ZONE 'America/Santiago')
    RETURNING id_camioneta INTO new_id;
    vans := array_append(vans, new_id);
  END LOOP;
  FOR m IN 1..5 LOOP
    INSERT INTO maquinas (codigo, nombre, descripcion, ubicacion, estado, fecha_creacion)
    VALUES ('DEMO-V1-M' || m, 'DEMO-V1 ' || (ARRAY['Hospital','Universidad','Oficinas','Taller','Reserva'])[m],
      'DEMO-V1 operacion sintetica con productos reales',
      (ARRAY['Santiago Centro','Providencia','Las Condes','Bodega tecnica','Bodega reserva'])[m],
      CASE WHEN m <= 3 THEN 'ACTIVA' WHEN m = 4 THEN 'MANTENCION' ELSE 'INACTIVA' END,
      (base_date - 13 + time '08:20') AT TIME ZONE 'America/Santiago')
    RETURNING id_maquina INTO new_id;
    machines := array_append(machines, new_id);
    IF m <= 3 THEN
      INSERT INTO maquina_productos (id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual)
      SELECT new_id, id_producto, 18, 0, precio_venta FROM productos WHERE id_producto = ANY(products);
    END IF;
  END LOOP;

  -- Initial purchase, then initial loads: 200 received, 60 to each van, per product.
  FOR p IN 1..6 LOOP
    stamp := (base_date - 13 + time '09:00') AT TIME ZONE 'America/Santiago' + p * interval '1 minute';
    IF EXISTS (SELECT 1 FROM bodega_productos WHERE id_producto = products[p]) THEN
      UPDATE bodega_productos SET stock_actual = 200 WHERE id_producto = products[p];
    ELSE
      INSERT INTO bodega_productos VALUES (products[p], 200);
    END IF;
    INSERT INTO bodega_movimientos (id_producto,tipo,cantidad,stock_final,observacion,fecha_creacion)
    VALUES (products[p],'ENTRADA',200,200,'DEMO-V1 compra inicial proveedor',stamp);
  END LOOP;

  FOR round_no IN 1..4 LOOP
    -- Round 1 loads both vans; before round 3, recharge A by 20 per product.
    IF round_no IN (1,3) THEN
      FOR v IN 1..CASE WHEN round_no = 1 THEN 2 ELSE 1 END LOOP
        FOR p IN 1..6 LOOP
          refill := CASE WHEN round_no = 1 THEN 60 ELSE 20 END;
          stamp := (base_date - CASE WHEN round_no = 1 THEN 12 ELSE 3 END + time '08:00') AT TIME ZONE 'America/Santiago'
            + (v * 10 + p) * interval '1 minute';
          UPDATE bodega_productos SET stock_actual = stock_actual - refill
          WHERE id_producto = products[p] RETURNING stock_actual INTO balance;
          INSERT INTO bodega_movimientos (id_producto,tipo,cantidad,stock_final,observacion,fecha_creacion)
          VALUES (products[p],'SALIDA',refill,balance,'DEMO-V1 carga ruta ' || v,stamp) RETURNING id_movimiento INTO movement_id;
          IF round_no = 1 THEN
            INSERT INTO camioneta_productos VALUES (vans[v],products[p],refill);
            balance := refill;
          ELSE
            UPDATE camioneta_productos SET stock_actual = stock_actual + refill
            WHERE id_camioneta = vans[v] AND id_producto = products[p] RETURNING stock_actual INTO balance;
          END IF;
          INSERT INTO camioneta_movimientos (id_camioneta,id_producto,id_bodeguero,id_repartidor,id_movimiento_bodega,tipo,cantidad,stock_final,observacion,fecha_creacion)
          VALUES (vans[v],products[p],admin_id,users[v+1],movement_id,'ENTRADA',refill,balance,'DEMO-V1 carga ruta ' || v,stamp);
        END LOOP;
      END LOOP;
    END IF;

    FOR m IN 1..3 LOOP
      v := CASE WHEN m <= 2 THEN 1 ELSE 2 END;
      stamp := (base_date - (ARRAY[9,6,3,1])[round_no] + time '10:00') AT TIME ZONE 'America/Santiago' + m * interval '1 hour';
      INSERT INTO reposiciones (id_maquina,id_camioneta,id_repartidor,dinero_retirado,venta_esperada,diferencia_dinero,observacion,fecha_creacion)
      VALUES (machines[m],vans[v],users[v+1],0,0,0,'DEMO-V1 visita ronda ' || round_no || ' maquina ' || m,stamp)
      RETURNING id_reposicion INTO visit_id;
      FOR p IN 1..6 LOOP
        SELECT * INTO STRICT slot FROM maquina_productos WHERE id_maquina = machines[m] AND id_producto = products[p];
        found := CASE round_no WHEN 1 THEN 0 WHEN 2 THEN 8 WHEN 3 THEN 9 ELSE (ARRAY[0,2,8])[1 + mod(m+p,3)] END;
        refill := CASE round_no WHEN 1 THEN 12 WHEN 2 THEN 6 WHEN 3 THEN 5 ELSE 0 END;
        removed := CASE WHEN round_no = 3 THEN 1 ELSE 0 END;
        sold := greatest(slot.stock_actual - found,0);
        final_stock := found + refill - removed;
        INSERT INTO reposicion_detalles (id_reposicion,id_maquina_producto,stock_sistema,stock_encontrado,cantidad_vendida,cantidad_repuesta,cantidad_retirada,stock_final,precio_venta_actual,venta_esperada)
        VALUES (visit_id,slot.id_maquina_producto,slot.stock_actual,found,sold,refill,removed,final_stock,slot.precio_venta_actual,sold * slot.precio_venta_actual);
        UPDATE maquina_productos SET stock_actual = final_stock WHERE id_maquina_producto = slot.id_maquina_producto;
      END LOOP;
      -- One aggregate movement per product and visit; never zero-quantity history.
      FOR slot IN
        SELECT s.id_producto, sum(d.cantidad_repuesta)::integer AS quantity
        FROM reposicion_detalles d JOIN maquina_productos s USING (id_maquina_producto)
        WHERE d.id_reposicion = visit_id GROUP BY s.id_producto HAVING sum(d.cantidad_repuesta) > 0
      LOOP
        UPDATE camioneta_productos SET stock_actual = stock_actual - slot.quantity
        WHERE id_camioneta = vans[v] AND id_producto = slot.id_producto RETURNING stock_actual INTO balance;
        INSERT INTO camioneta_movimientos (id_camioneta,id_producto,id_repartidor,tipo,id_reposicion,id_maquina,cantidad,stock_final,observacion,fecha_creacion)
        VALUES (vans[v],slot.id_producto,users[v+1],'SALIDA',visit_id,machines[m],slot.quantity,balance,'DEMO-V1 reposicion ronda ' || round_no,stamp);
      END LOOP;
      SELECT sum(venta_esperada) INTO expected FROM reposicion_detalles WHERE id_reposicion = visit_id;
      cash_difference := CASE WHEN round_no = 1 THEN 0 WHEN m = 1 THEN 0 WHEN m = 2 THEN 300 ELSE -500 END;
      UPDATE reposiciones SET venta_esperada = expected, dinero_retirado = expected + cash_difference,
        diferencia_dinero = cash_difference WHERE id_reposicion = visit_id;
    END LOOP;
  END LOOP;

  -- Counts capture current expected balances; generated differences do not adjust stocks.
  FOR p IN 1..6 LOOP
    stamp := (base_date - 1 + time '17:00') AT TIME ZONE 'America/Santiago' + p * interval '1 minute';
    SELECT stock_actual INTO balance FROM bodega_productos WHERE id_producto = products[p];
    INSERT INTO conteos (id_producto,id_responsable,stock_esperado,stock_fisico,observacion,fecha_creacion)
    VALUES (products[p],admin_id,balance,balance + (ARRAY[0,1,-1])[1+mod(p,3)],'DEMO-V1 conteo central',stamp);
    FOR v IN 1..2 LOOP
      SELECT stock_actual INTO balance FROM camioneta_productos WHERE id_camioneta = vans[v] AND id_producto = products[p];
      INSERT INTO conteos (id_camioneta,id_producto,id_responsable,stock_esperado,stock_fisico,observacion,fecha_creacion)
      VALUES (vans[v],products[p],CASE WHEN v = 1 THEN users[2] ELSE admin_id END,
        balance,balance + (ARRAY[0,1,-1])[1+mod(p+v,3)],
        CASE WHEN p = 6 AND v = 2 THEN 'DEMO-V1 COMPLETE' ELSE 'DEMO-V1 conteo ruta ' || v END,stamp + v * interval '10 minutes');
    END LOOP;
  END LOOP;
  RAISE NOTICE 'DEMO-V1 creado: 6 productos, 3 usuarios, 2 camionetas, 5 maquinas, 18 slots, 12 visitas/72 detalles, 24 movimientos central, 72 camioneta, 18 conteos. Fechas Santiago % a %.', base_date - 13, base_date - 1;
END
$demo$;

COMMIT;
