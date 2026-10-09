// Only docker exec against an explicitly named local container. Never DATABASE_URL.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const [container, user = 'postgres', database = 'postgres'] = process.argv.slice(2);
if (!container || !/^[a-zA-Z0-9_.-]+$/.test(container)
  || !/^[a-zA-Z_][a-zA-Z0-9_$-]*$/.test(user) || !/^[a-zA-Z_][a-zA-Z0-9_$-]*$/.test(database)) {
  console.error('Usage: node backend/db/verify-demo-operacion.mjs LOCAL_CONTAINER [USER] [DATABASE]');
  process.exit(1);
}
const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
// Keep all actual SQL statements, but remove file-level transaction envelopes so
// migrations, successful seeds, and failure scenarios can ALL be rolled back.
const body = (sql) => sql.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gm, '');
const migrations = [
  '000_create_schema.sql', '001_create_reposiciones.sql', '002_create_bodega.sql',
  '003_create_camionetas.sql', '004_create_camioneta_inventario.sql',
  '005_create_conteos.sql', '006_reposicion_camioneta.sql',
  '007_create_missing_reposicion_detalles.sql',
].map((name) => body(read(`migrations/${name}`)));
const demo = body(read('seed-demo-operacion.sql'));
const real = body(read('seed-productos-reales.sql'));
const legacy = body(read('seed.sql'));
const schema = `verify_demo_${randomBytes(8).toString('hex')}`;
const assert = (condition, label) => `DO $assert$ BEGIN
  IF NOT (${condition}) THEN RAISE EXCEPTION 'FAIL: ${label}'; END IF;
END $assert$; SELECT 'PASS: ${label}';`;
const reject = (setup, message, label) => `SAVEPOINT scenario;
${setup}
DO $reject$ BEGIN
  BEGIN
    EXECUTE $seed_sql$${demo}$seed_sql$;
    RAISE EXCEPTION 'FAIL: seed accepted ${label}';
  EXCEPTION WHEN OTHERS THEN
    IF position('${message}' IN SQLERRM) = 0 THEN RAISE; END IF;
  END;
END $reject$;
ROLLBACK TO SAVEPOINT scenario; RELEASE SAVEPOINT scenario;
SELECT 'PASS: ${label}';`;
const selected = `SELECT id_producto FROM productos WHERE nombre IN
  ('CHOCMAN','TUAREG (CASO)','PAPAS','COCA COLA LATA','CACHANTUN SIN GAS','WILD PROTEIN')`;
const product = `(SELECT id_producto FROM productos WHERE nombre = 'CHOCMAN')`;

const sql = [
  'BEGIN;',
  "SET LOCAL TIME ZONE 'America/Santiago';",
  `CREATE SCHEMA ${schema}; SET LOCAL search_path TO ${schema};`,
  ...migrations,
  legacy,
  // A preexisting catalog entry must keep its values, including zero cost.
  `INSERT INTO productos(nombre,precio_venta,costo_compra,id_proveedor)
   VALUES ('CHOCMAN',550,0,(SELECT id_proveedor FROM proveedores WHERE nombre='Snacks Demo'));`,
  real, real,
  assert(`(SELECT precio_venta=550 AND costo_compra=0 AND pr.nombre='Snacks Demo'
    FROM productos p JOIN proveedores pr USING(id_proveedor) WHERE p.nombre='CHOCMAN')`, 'catalog preserves existing price cost and provider'),
  assert(`(SELECT count(*) FROM productos WHERE id_producto IN (${selected}))=6`, 'six distinct real products'),
  reject(`UPDATE productos SET nombre='Other CHOCMAN' WHERE id_producto=${product};`, 'faltan productos reales', 'missing real product guard'),
  reject(`UPDATE productos SET estado=false WHERE id_producto=${product};`, 'deben estar activos', 'inactive catalog guard'),
  reject(`UPDATE productos SET precio_venta=0 WHERE id_producto IN (${selected});`, 'precios insuficientes', 'cash nonnegative preflight'),
  reject(`INSERT INTO bodega_productos VALUES (${product},1);`, 'requieren stock cero', 'central nonzero guard'),
  reject(`UPDATE maquina_productos SET id_producto=${product} WHERE id_maquina_producto=(SELECT min(id_maquina_producto) FROM maquina_productos);`, 'requieren stock cero', 'existing machine nonzero guard'),
  reject(`INSERT INTO usuarios(nombre,apellido,email,password_hash,rol) VALUES ('Other','User','other@example.invalid','!', 'REPONEDOR');
    INSERT INTO camionetas(patente,nombre,id_repartidor) SELECT 'OTHER','Other',id_usuario FROM usuarios WHERE email='other@example.invalid';
    INSERT INTO camioneta_productos SELECT id_camioneta,${product},1 FROM camionetas WHERE patente='OTHER';`, 'requieren stock cero', 'existing van nonzero guard'),
  reject(`INSERT INTO bodega_movimientos(id_producto,tipo,cantidad,stock_final) VALUES (${product},'ENTRADA',1,1),(${product},'SALIDA',1,0);`, 'requieren stock cero', 'zero balance with central history guard'),
];

// Independent zero-stock history cases with valid FKs.
const actor = `INSERT INTO usuarios(nombre,apellido,email,password_hash,rol)
  VALUES ('Other','Admin','other-admin@example.invalid','!','ADMIN');`;
const otherVan = `${actor}
  INSERT INTO usuarios(nombre,apellido,email,password_hash,rol) VALUES ('Other','Driver','other-driver@example.invalid','!','REPONEDOR');
  INSERT INTO camionetas(patente,nombre,id_repartidor) SELECT 'OTHER','Other',id_usuario FROM usuarios WHERE email='other-driver@example.invalid';`;
sql.push(
  reject(`${otherVan}
    INSERT INTO bodega_movimientos(id_producto,tipo,cantidad,stock_final) VALUES (${product},'ENTRADA',1,1),(${product},'SALIDA',1,0);
    INSERT INTO camioneta_productos SELECT id_camioneta,${product},0 FROM camionetas WHERE patente='OTHER';
    INSERT INTO camioneta_movimientos(id_camioneta,id_producto,id_bodeguero,id_repartidor,id_movimiento_bodega,cantidad,stock_final)
    SELECT v.id_camioneta,${product},u.id_usuario,v.id_repartidor,
      (SELECT max(id_movimiento) FROM bodega_movimientos),1,1
    FROM camionetas v CROSS JOIN usuarios u WHERE v.patente='OTHER' AND u.email='other-admin@example.invalid';
    UPDATE bodega_movimientos SET id_producto=(SELECT id_producto FROM productos WHERE nombre='DINDON');`,
    'requieren stock cero', 'zero-stock van history guard independent of central history'),
  reject(`${actor} INSERT INTO conteos(id_producto,id_responsable,stock_esperado,stock_fisico)
    SELECT ${product},id_usuario,0,0 FROM usuarios WHERE email='other-admin@example.invalid';`, 'requieren stock cero', 'zero-stock count history guard'),
  reject(`INSERT INTO maquina_productos(id_maquina,id_producto,capacidad_maxima,stock_actual,precio_venta_actual)
    SELECT min(id_maquina),${product},18,0,550 FROM maquinas;
    INSERT INTO reposiciones(id_maquina,dinero_retirado,venta_esperada,diferencia_dinero)
    SELECT min(id_maquina),0,0,0 FROM maquinas;`, 'requieren stock cero', 'zero-stock existing machine visit guard'),
  reject(`INSERT INTO maquinas(codigo,nombre,ubicacion) VALUES ('DEMO-V1-M1','Unrelated','Elsewhere');`, 'colision', 'reserved machine collision'),
  reject(`INSERT INTO usuarios(nombre,apellido,email,password_hash,rol)
    VALUES ('Unrelated','User','demo-v1-a@example.invalid','!','REPONEDOR');`, 'colision', 'reserved email collision'),
  reject(`${otherVan} UPDATE camionetas SET patente='DEMO-V1-A' WHERE patente='OTHER';`, 'colision', 'reserved van collision'),
  reject(`${actor} INSERT INTO conteos(id_producto,id_responsable,stock_esperado,stock_fisico,observacion)
    SELECT ${product},id_usuario,0,0,'DEMO-V1 COMPLETE' FROM usuarios WHERE email='other-admin@example.invalid';`, 'parcial', 'completion marker collision'),
  reject(`INSERT INTO bodega_movimientos(id_producto,tipo,cantidad,stock_final,observacion)
    VALUES (${product},'ENTRADA',1,1,'DEMO-V1 partial');`, 'parcial', 'partial demo marker guard'),
  // Existing empty balance rows are allowed, but must acquire accurate history.
  `INSERT INTO bodega_productos VALUES (${product},0);`,
  `CREATE TEMP TABLE catalog_snapshot ON COMMIT DROP AS SELECT to_jsonb(p) AS row FROM productos p;
    CREATE TEMP TABLE provider_snapshot ON COMMIT DROP AS SELECT to_jsonb(p) AS row FROM proveedores p;`,
  demo,
  assert(`NOT EXISTS ((SELECT row FROM catalog_snapshot) EXCEPT (SELECT to_jsonb(p) FROM productos p))
    AND NOT EXISTS ((SELECT to_jsonb(p) FROM productos p) EXCEPT (SELECT row FROM catalog_snapshot))
    AND NOT EXISTS ((SELECT row FROM provider_snapshot) EXCEPT (SELECT to_jsonb(p) FROM proveedores p))
    AND NOT EXISTS ((SELECT to_jsonb(p) FROM proveedores p) EXCEPT (SELECT row FROM provider_snapshot))`, 'operational seed leaves entire catalog unchanged'),
  assert(`(SELECT count(*) FROM usuarios WHERE email LIKE 'demo-v1-%')=3
    AND (SELECT count(*) FROM usuarios WHERE email LIKE 'demo-v1-%' AND rol='ADMIN')=1
    AND (SELECT count(*) FROM camionetas WHERE patente LIKE 'DEMO-V1-%')=2
    AND (SELECT count(*) FROM maquinas WHERE codigo LIKE 'DEMO-V1-%')=5
    AND (SELECT count(*) FROM maquinas WHERE codigo LIKE 'DEMO-V1-%' AND estado='ACTIVA')=3
    AND (SELECT count(*) FROM maquinas WHERE codigo LIKE 'DEMO-V1-%' AND estado='MANTENCION')=1
    AND (SELECT count(*) FROM maquinas WHERE codigo LIKE 'DEMO-V1-%' AND estado='INACTIVA')=1`, 'entities and states'),
  assert(`(SELECT count(*) FROM reposiciones WHERE observacion LIKE 'DEMO-V1 %')=12
    AND (SELECT count(*) FROM reposicion_detalles)=72
    AND (SELECT count(*) FROM maquina_productos s JOIN maquinas m USING(id_maquina) WHERE m.codigo LIKE 'DEMO-V1-%')=18
    AND (SELECT count(*) FROM bodega_movimientos)=24
    AND (SELECT count(*) FROM camioneta_movimientos)=72
    AND (SELECT count(*) FROM conteos)=18`, 'exact visits details slots movements counts'),
  assert(`NOT EXISTS (SELECT 1 FROM bodega_productos WHERE id_producto IN (${selected}) AND stock_actual<>60)
    AND NOT EXISTS (SELECT 1 FROM camioneta_productos cp JOIN camionetas c USING(id_camioneta)
      WHERE cp.stock_actual <> CASE c.patente WHEN 'DEMO-V1-A' THEN 34 ELSE 37 END)`, 'final central 60 van A 34 van B 37 per product'),
  assert(`NOT EXISTS (
    SELECT 1 FROM (SELECT *, sum(CASE tipo WHEN 'ENTRADA' THEN cantidad ELSE -cantidad END)
      OVER(PARTITION BY id_producto ORDER BY fecha_creacion,id_movimiento) AS chain
      FROM bodega_movimientos) x WHERE chain<0 OR chain<>stock_final)
    AND NOT EXISTS (SELECT 1 FROM (SELECT *,sum(CASE tipo WHEN 'ENTRADA' THEN cantidad ELSE -cantidad END)
      OVER(PARTITION BY id_camioneta,id_producto ORDER BY fecha_creacion,id_movimiento) AS chain
      FROM camioneta_movimientos) x WHERE chain<0 OR chain<>stock_final)`, 'chronological FIFO balance chains nonnegative'),
  assert(`NOT EXISTS (SELECT 1 FROM reposicion_detalles d WHERE stock_final<>stock_encontrado+cantidad_repuesta-cantidad_retirada
      OR cantidad_vendida<>greatest(stock_sistema-stock_encontrado,0)
      OR venta_esperada<>cantidad_vendida*precio_venta_actual)
    AND NOT EXISTS (SELECT 1 FROM (SELECT *,coalesce(lag(stock_final) OVER(
      PARTITION BY id_maquina_producto ORDER BY r.fecha_creacion,r.id_reposicion),0) AS previous
      FROM reposicion_detalles d JOIN reposiciones r USING(id_reposicion)) x WHERE stock_sistema<>previous)
    AND NOT EXISTS (SELECT 1 FROM maquina_productos s JOIN LATERAL (
      SELECT d.stock_final FROM reposicion_detalles d JOIN reposiciones r USING(id_reposicion)
      WHERE d.id_maquina_producto=s.id_maquina_producto ORDER BY r.fecha_creacion DESC,r.id_reposicion DESC LIMIT 1
    ) last ON true WHERE s.stock_actual<>last.stock_final)`, 'machine detail equations chronological chains and current balance'),
  assert(`NOT EXISTS (SELECT 1 FROM camioneta_movimientos c JOIN bodega_movimientos b ON b.id_movimiento=c.id_movimiento_bodega
    JOIN camionetas v USING(id_camioneta) JOIN usuarios u ON u.id_usuario=c.id_bodeguero
    WHERE c.tipo<>'ENTRADA' OR b.tipo<>'SALIDA' OR b.id_producto<>c.id_producto OR b.cantidad<>c.cantidad
      OR b.fecha_creacion<>c.fecha_creacion OR c.id_repartidor<>v.id_repartidor OR u.rol<>'ADMIN')
    AND (SELECT count(*) FROM camioneta_movimientos WHERE tipo='ENTRADA')=18
    AND (SELECT count(*) FROM bodega_movimientos WHERE tipo='SALIDA')=18`, 'load FK links amounts and actors'),
  assert(`NOT EXISTS (SELECT 1 FROM camioneta_movimientos c JOIN reposiciones r USING(id_reposicion)
    WHERE c.id_camioneta<>r.id_camioneta OR c.id_maquina<>r.id_maquina OR c.id_repartidor<>r.id_repartidor
      OR c.cantidad<>(SELECT sum(d.cantidad_repuesta) FROM reposicion_detalles d
        JOIN maquina_productos s USING(id_maquina_producto) WHERE d.id_reposicion=r.id_reposicion AND s.id_producto=c.id_producto))
    AND NOT EXISTS (SELECT 1 FROM (SELECT d.id_reposicion,s.id_producto,sum(d.cantidad_repuesta) AS qty
      FROM reposicion_detalles d JOIN maquina_productos s USING(id_maquina_producto)
      GROUP BY d.id_reposicion,s.id_producto) x LEFT JOIN camioneta_movimientos c USING(id_reposicion,id_producto)
      WHERE (x.qty>0 AND (c.id_movimiento IS NULL OR c.cantidad<>x.qty)) OR (x.qty=0 AND c.id_movimiento IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM camioneta_movimientos WHERE cantidad<=0)`, 'aggregated positive-only replenishment FK links'),
  assert(`NOT EXISTS (SELECT 1 FROM productos p WHERE p.id_producto IN (${selected}) AND
    200 <> (SELECT stock_actual FROM bodega_productos WHERE id_producto=p.id_producto)
      + (SELECT sum(stock_actual) FROM camioneta_productos WHERE id_producto=p.id_producto)
      + (SELECT sum(stock_actual) FROM maquina_productos WHERE id_producto=p.id_producto)
      + (SELECT sum(d.cantidad_vendida+d.cantidad_retirada) FROM reposicion_detalles d
        JOIN maquina_productos s USING(id_maquina_producto) WHERE s.id_producto=p.id_producto))`, 'received equals central vans machines sales and retirements'),
  assert(`NOT EXISTS (SELECT 1 FROM reposiciones r WHERE r.venta_esperada<>(SELECT sum(venta_esperada)
    FROM reposicion_detalles d WHERE d.id_reposicion=r.id_reposicion)
    OR r.dinero_retirado<0 OR r.diferencia_dinero<>r.dinero_retirado-r.venta_esperada)
    AND (SELECT sum(venta_esperada) FROM reposiciones)=(SELECT sum(venta_esperada) FROM reposicion_detalles)
    AND (SELECT sum(diferencia_dinero) FROM reposiciones)=-600
    AND (SELECT count(DISTINCT diferencia_dinero) FROM reposiciones)=3`, 'header money totals zero plus300 minus500 no negative cash'),
  assert(`(SELECT count(*) FROM maquina_productos s JOIN maquinas m USING(id_maquina) WHERE m.codigo LIKE 'DEMO-V1-%' AND stock_actual=0)=6
    AND (SELECT count(*) FROM maquina_productos s JOIN maquinas m USING(id_maquina) WHERE m.codigo LIKE 'DEMO-V1-%' AND stock_actual=2)=6
    AND (SELECT count(*) FROM maquina_productos s JOIN maquinas m USING(id_maquina) WHERE m.codigo LIKE 'DEMO-V1-%' AND stock_actual=8)=6`, 'six exhausted six low six healthy slots'),
  assert(`NOT EXISTS (SELECT 1 FROM conteos c JOIN usuarios u ON u.id_usuario=c.id_responsable
    LEFT JOIN camionetas v USING(id_camioneta) WHERE c.diferencia<>c.stock_fisico-c.stock_esperado
    OR (c.id_camioneta IS NULL AND (u.rol<>'ADMIN' OR c.stock_esperado<>60))
    OR (c.id_camioneta IS NOT NULL AND (c.stock_esperado<>CASE v.patente WHEN 'DEMO-V1-A' THEN 34 ELSE 37 END
      OR NOT (u.rol='ADMIN' OR c.id_responsable=v.id_repartidor))))
    AND (SELECT count(DISTINCT diferencia) FROM conteos)=3`, 'informative counts expected balances generated differences and authorized actors'),
  assert(`(SELECT min((fecha_creacion AT TIME ZONE 'America/Santiago')::date) FROM bodega_movimientos)=current_date-13
    AND (SELECT max((fecha_creacion AT TIME ZONE 'America/Santiago')::date) FROM reposiciones)=current_date-1
    AND (SELECT count(DISTINCT (fecha_creacion AT TIME ZONE 'America/Santiago')::date) FROM reposiciones)=4`, 'relative Santiago dates and four chart days'),
  // Full row snapshots, not merely counts: repeat must preserve dates and identity values.
  `CREATE TEMP TABLE demo_snapshot ON COMMIT DROP AS SELECT 'bodega' AS kind,to_jsonb(b) AS row FROM bodega_productos b
    UNION ALL SELECT 'bmov',to_jsonb(b) FROM bodega_movimientos b
    UNION ALL SELECT 'van',to_jsonb(b) FROM camioneta_productos b
    UNION ALL SELECT 'vmov',to_jsonb(b) FROM camioneta_movimientos b
    UNION ALL SELECT 'slot',to_jsonb(b) FROM maquina_productos b
    UNION ALL SELECT 'visit',to_jsonb(b) FROM reposiciones b
    UNION ALL SELECT 'detail',to_jsonb(b) FROM reposicion_detalles b
    UNION ALL SELECT 'count',to_jsonb(b) FROM conteos b
    UNION ALL SELECT 'user',to_jsonb(b) FROM usuarios b
    UNION ALL SELECT 'machine',to_jsonb(b) FROM maquinas b
    UNION ALL SELECT 'vehicle',to_jsonb(b) FROM camionetas b;`,
  demo,
  assert(`NOT EXISTS ((TABLE demo_snapshot) EXCEPT (SELECT 'bodega',to_jsonb(b) FROM bodega_productos b
    UNION ALL SELECT 'bmov',to_jsonb(b) FROM bodega_movimientos b UNION ALL SELECT 'van',to_jsonb(b) FROM camioneta_productos b
    UNION ALL SELECT 'vmov',to_jsonb(b) FROM camioneta_movimientos b UNION ALL SELECT 'slot',to_jsonb(b) FROM maquina_productos b
    UNION ALL SELECT 'visit',to_jsonb(b) FROM reposiciones b UNION ALL SELECT 'detail',to_jsonb(b) FROM reposicion_detalles b
    UNION ALL SELECT 'count',to_jsonb(b) FROM conteos b UNION ALL SELECT 'user',to_jsonb(b) FROM usuarios b
    UNION ALL SELECT 'machine',to_jsonb(b) FROM maquinas b UNION ALL SELECT 'vehicle',to_jsonb(b) FROM camionetas b))
    AND (SELECT count(*) FROM bodega_movimientos)=24 AND (SELECT count(*) FROM camioneta_movimientos)=72
    AND (SELECT count(*) FROM reposicion_detalles)=72 AND (SELECT count(*) FROM conteos)=18
    AND (SELECT count(*) FROM demo_snapshot)=(SELECT
      (SELECT count(*) FROM bodega_productos)+(SELECT count(*) FROM bodega_movimientos)
      +(SELECT count(*) FROM camioneta_productos)+(SELECT count(*) FROM camioneta_movimientos)
      +(SELECT count(*) FROM maquina_productos)+(SELECT count(*) FROM reposiciones)
      +(SELECT count(*) FROM reposicion_detalles)+(SELECT count(*) FROM conteos)
      +(SELECT count(*) FROM usuarios)+(SELECT count(*) FROM maquinas)+(SELECT count(*) FROM camionetas))`, 'repeat preserves entire existing rows and counts'),
  // Simulate later manual use: keep its new history and new balance on repeat.
  `UPDATE bodega_productos SET stock_actual=stock_actual-1 WHERE id_producto=${product};
    INSERT INTO bodega_movimientos(id_producto,tipo,cantidad,stock_final,observacion)
    VALUES (${product},'SALIDA',1,59,'Manual after demo');`,
  demo,
  assert(`(SELECT stock_actual FROM bodega_productos WHERE id_producto=${product})=59
    AND (SELECT count(*) FROM bodega_movimientos WHERE observacion='Manual after demo')=1
    AND (SELECT count(*) FROM bodega_movimientos)=25`, 'repeat preserves manual use'),
  reject(`UPDATE conteos SET observacion='Manual marker removed' WHERE observacion='DEMO-V1 COMPLETE';`, 'parcial', 'partial demo after lost completion marker'),
  reject(`UPDATE reposiciones SET observacion='Manual marker removed' WHERE id_reposicion=(SELECT min(id_reposicion) FROM reposiciones);`, 'parcial', 'partial demo with missing original visit'),
  reject(`UPDATE conteos SET id_camioneta=NULL WHERE observacion='DEMO-V1 COMPLETE';`, 'colision', 'completion marker ownership collision'),
);

// Separate schemas cover missing migrations without ever addressing public.
for (const [label, indexes] of [
  ['missing006', [0,1,2,3,4,5,7]],
  ['missing007details', [0,2,3,4,5,6]],
  ['pluralonly', []],
]) {
  sql.push(`CREATE SCHEMA ${schema}_${label}; SET LOCAL search_path TO ${schema}_${label};`);
  if (label === 'missing007details') {
    sql.push(migrations[0], migrations[1].split('CREATE TABLE reposicion_detalles')[0]);
    sql.push(...indexes.filter((i) => i !== 0).map((i) => migrations[i]));
  } else if (label === 'pluralonly') {
    sql.push(migrations[0].replace('CREATE TABLE maquina_productos', 'CREATE TABLE maquinas_productos'));
  } else {
    sql.push(...indexes.map((i) => migrations[i]));
  }
  sql.push(reject('', 'esquema incompleto', `${label} preflight`));
  if (label === 'missing007details') {
    sql.push(migrations[7], real, demo,
      assert('(SELECT count(*) FROM reposicion_detalles)=72', '007 repairs missing details with no other state required'));
  }
}
sql.push('ROLLBACK;', "SELECT 'PASS: all isolated schema objects and data rolled back; public untouched';");
const result = spawnSync('docker', ['exec', '-i', container, 'psql', '-X', '-h', '/var/run/postgresql', '-U', user, '-d', database,
  '-v', 'ON_ERROR_STOP=1', '-q', '-A', '-t'], { input: sql.join('\n'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
