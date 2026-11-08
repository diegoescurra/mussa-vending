# Base de datos

## Archivos que se mantienen

- `schema.sql`: esquema completo, compartido por local y produccion, consolidado de las migraciones 000..011.
- `seed-productos-reales.sql`: unico seed; carga inicial opcional del catalogo real de proveedores y productos.
- `migrations/`: historial de cambios y referencia para las actualizaciones futuras. Las pruebas de integracion tambien usan estas migraciones.

Los datos de los tests se preparan en sus propias fixtures. No se necesitan seeds
de demostracion para ejecutar la aplicacion ni las pruebas de integracion.
Ningun SQL se ejecuta automaticamente al iniciar el backend.

## Produccion: completar el esquema existente

En Neon, abre el editor SQL de la base y rama que usa `DATABASE_URL` en Render.
Puedes confirmar la conexion y la presencia de las tablas con:

```sql
SELECT current_database(), current_schema();
SELECT to_regclass('public.proveedores') AS proveedores,
       to_regclass('public.productos') AS productos,
       to_regclass('public.reposiciones') AS reposiciones;
```

Ejecuta **todo `schema.sql`**. Sirve si solo existen las tablas de proveedores y
productos del esquema base, si existen mas tablas vacias o si ya hay actividad.
Conserva IDs, nombres, precios, costos, estados, relaciones y filas existentes.
Crea las tablas faltantes y agrega las columnas, restricciones, indices y el
trigger de version de las migraciones actuales. No carga stock ni historial.

Si el catalogo ya esta cargado, **no necesitas ejecutar el seed**. Si no hay
reposiciones, el dashboard mostrara cero visitas y ventas; los saldos sin
movimientos se muestran en cero. Usuarios, camionetas y maquinas se registran
desde la aplicacion con los datos reales.

El archivo es transaccional y puede repetirse. Si falla, no se confirma ningun
cambio de esa ejecucion; ejecuta `ROLLBACK;` si el editor deja la transaccion
abierta, corrige la causa y vuelve a ejecutar el archivo completo.

El consolidado admite el esquema definido por las migraciones del proyecto;
no corrige modificaciones manuales arbitrarias. Si solo existe la antigua tabla
`maquinas_productos` (plural), aborta para que se revise su estructura. La tabla
que usa la aplicacion es `maquina_productos` (singular).

## Local

Ejecuta el mismo `schema.sql` en el editor conectado a tu PostgreSQL local.
Con `psql`, desde `backend`, usando los valores de `docker-compose.yml`:

```sh
psql -h localhost -p 5434 -U inventario_user -d inventario_maquinas -v ON_ERROR_STOP=1 -f db/schema.sql
```

Ajusta la conexion si tu instalacion usa otros valores.

## Catalogo inicial opcional

Para una base nueva, ejecuta primero `schema.sql` y despues, por separado,
`seed-productos-reales.sql`. El seed crea proveedores y vincula productos por
nombre. Conserva los costos y precios informados, incluidos los costos cero.
Los dos TUAREG se distinguen como `TUAREG (CASO)` y `TUAREG (SERFEL)` porque
los nombres de producto son unicos.

Puede repetirse sin duplicados: los proveedores y productos con el mismo nombre
se conservan sin modificar ni reactivar. No es un script de sincronizacion de
catalogo, no cambia precios existentes ni carga existencias o responsables.

## Actualizaciones futuras

Mantener `schema.sql` sincronizado al agregar migraciones. Para una base existente
se pueden aplicar solamente las migraciones pendientes, en orden numerico,
en lugar del consolidado. No reaplicar todas las migraciones individuales sobre
una base ya actualizada: algunas no son repetibles. La 007 repara la tabla de
detalles faltante y la 010 rechaza importes `NaN`.

Si la restriccion de importes falla, identifica y corrige los valores reales:

```sql
SELECT id_producto, nombre, precio_venta, costo_compra
FROM productos
WHERE precio_venta = 'NaN'::numeric OR costo_compra = 'NaN'::numeric;
```

## Maquinas

`GET /api/maquinas` y `GET /api/maquinas/:id` incluyen `modelo` y `sistemas_pago`.
`POST /api/maquinas` y `PUT /api/maquinas/:id` requieren todos los campos:

```json
{
  "codigo": "M-001",
  "nombre": "Maquina 1",
  "descripcion": "Maquina de snacks",
  "ubicacion": "Local",
  "estado": "ACTIVA",
  "modelo": "Modelo real",
  "sistemas_pago": ["MONEDA", "TARJETA"]
}
```

`modelo` debe ser un string no vacio tras recortar espacios; se guarda recortado.
`sistemas_pago` debe ser un array no vacio, sin duplicados, con valores exactos
`MONEDA`, `BILLETE` o `TARJETA`. Campos omitidos o invalidos devuelven 400.
PUT sigue siendo una actualizacion completa, no parcial.

`schema.sql` incluye este cambio. Si actualizas mediante migraciones individuales,
ejecuta la 008 completa despues de las anteriores y una sola vez. No se ejecuta
automaticamente. Conserva las maquinas existentes con `modelo = ''` y `sistemas_pago = []`
hasta editarlas con datos reales; no inventa configuracion ni modifica inventario
o historia. La BD permite esos defaults legacy, pero rechaza arrays con valores
fuera del enum, duplicados, elementos null o multiples dimensiones. La API exige
configuracion no vacia al crear y en cada PUT, incluso para maquinas legacy.

## Bodega

- `GET /api/bodega`: saldo de todos los productos, incluyendo los que aun tienen stock cero.
- `GET /api/bodega/movimientos`: historial de entradas y salidas.
- `POST /api/bodega/movimientos`: registra un movimiento y actualiza su saldo.

```json
{
  "id_producto": 1,
  "tipo": "ENTRADA",
  "cantidad": 90,
  "observacion": "Compra inicial"
}
```

Para descontar stock usa `SALIDA`. No se permiten saldos negativos.
Los movimientos no se editan ni eliminan; las correcciones se registran con otro movimiento.
Las entregas a camionetas se registran con el endpoint de cargas, no como una salida manual.

## Camionetas

- `GET /api/camionetas` y `GET /api/camionetas/:id`: consultar camionetas y repartidor asignado.
- `POST /api/camionetas` y `PUT /api/camionetas/:id`: crear o editar enviando todos los campos.
- `DELETE /api/camionetas/:id`: eliminar una camioneta y liberar su asignacion.

```json
{
  "patente": "ABCD12",
  "nombre": "Camioneta 1",
  "id_repartidor": 1,
  "estado": true
}
```

El repartidor debe estar activo y tener rol `REPONEDOR`. Su asignacion es unica,
incluso en camionetas inactivas; se libera al reasignar o eliminar la camioneta.
Las camionetas con inventario o entregas registradas no se eliminan; se desactivan.

## Entregas a camioneta

- `GET /api/camionetas/:id/inventario`: saldo por producto, incluyendo productos con stock cero.
- `GET /api/camionetas/:id/movimientos`: historial con bodeguero y repartidor que recibio cada entrega.
- `POST /api/camionetas/:id/cargas`: entrega aprobada de un producto desde bodega central.

```json
{
  "id_bodeguero": 1,
  "id_producto": 2,
  "cantidad": 10,
  "observacion": "Carga aprobada para la ruta"
}
```

El bodeguero se selecciona manualmente y debe ser un ADMIN activo; el repartidor
se obtiene de la camioneta y debe ser un REPONEDOR activo. La camioneta y producto
tambien deben estar activos. La identidad del bodeguero se toma de la sesión autenticada.

La entrega descuenta de central, suma a camioneta y registra ambos movimientos en
una sola transaccion. No permite saldos negativos y revierte todo si algo falla.
El repartidor se guarda en cada movimiento para conservar la asignacion historica.
Por ahora no incluye devoluciones ni limites de carga.

## Conteos fisicos

- `GET /api/conteos`: historial solamente de bodega central.
- `GET /api/conteos?id_camioneta=1`: historial de una camioneta existente (tambien inactiva).

Los historiales de movimientos de bodega, movimientos de camioneta y conteos
devuelven hasta 50 registros por solicitud en `data.items`, en orden descendente
por ID. Para leer la pagina siguiente, envia `data.nextCursor` como `antes_de`
en la misma ruta y conserva los filtros. `nextCursor: null` indica el final.
- `POST /api/conteos`: registra un conteo y la diferencia `stock_fisico - stock_esperado`.

```json
{
  "id_responsable": 1,
  "id_producto": 2,
  "stock_fisico": 0,
  "observacion": "Conteo al cierre"
}
```

Incluye `id_camioneta` para contar una camioneta; omitirlo cuenta central.
El responsable de central debe ser ADMIN activo. En camioneta puede ser un ADMIN
activo o el REPONEDOR activo asignado. Productos y camionetas inactivos se admiten
para auditoria. Identificadores son enteros positivos y el stock fisico es entero
entre 0 y 2147483647. El responsable se toma de la sesión autenticada.

La respuesta incluye `id_conteo`, ubicacion, producto, responsable, `stock_esperado`,
`stock_fisico`, `diferencia`, `observacion` y `fecha_creacion`. El historial agrega
`producto_nombre` y `responsable_nombre`. El esperado se captura en una transaccion
con bloqueo del saldo; un saldo ausente se inicializa en cero.
Los conteos NO ajustan stock automaticamente ni crean movimientos. No incluyen
tolerancias ni clasificacion de perdidas. Sus claves foraneas impiden eliminar
productos, responsables o camionetas con historia; no hay borrado en cascada.

## Reposicion desde camioneta

`schema.sql` incluye el registro de operaciones y la version del inventario.
Si actualizas mediante migraciones individuales, aplica la 009 completa una sola
vez despues de las anteriores. Conserva los saldos y el historial existentes.
No se ejecuta automaticamente al iniciar el backend.
Actualizar backend y frontend juntos: los clientes anteriores deben recargarse.

Cada POST requiere `id_operacion` (UUID generado por el cliente). Un reintento debe
usar el mismo UUID y cuerpo: devuelve la respuesta guardada sin repetir movimientos,
incluso si ambas solicitudes llegan simultaneamente. Reutilizar el UUID con otro
cuerpo devuelve 409. Una transaccion fallida libera el UUID al hacer rollback.
El formulario conserva el cuerpo enviado ante errores de red o servidor y ofrece
reintentar; solo una nueva operacion o una correccion tras rechazo validado usa otro UUID.

Las lecturas de `maquina_productos` incluyen `version`; cada PUT debe enviarla junto
a los campos modificados. Si cambio desde la lectura devuelve 409. Un trigger incrementa
la version en cada actualizacion, incluidas las reposiciones que dejan el mismo stock.
El formulario de edicion no reenvia cantidades sin cambios; ante conflicto, cerrarlo
y volver a abrirlo despues de actualizar el inventario.

`POST /api/reposiciones` requiere `id_repartidor` junto a los datos de reposicion.
Cada detalle de una reposicion nueva requiere la `version` que el formulario leyo
al revisar la maquina. Si la version cambio, devuelve 409 y revierte la operacion.
El backend obtiene su camioneta asignada; no acepta una camioneta elegida por el cliente.
Repartidor, camioneta y maquina deben estar activos.

La reposicion descuenta de camioneta solo `cantidad_repuesta`, actualiza el saldo
de maquina y registra la salida enlazada a la reposicion en una transaccion.
Se suman las cantidades de todos los espacios del mismo producto antes de descontar.
No se permite reponer mas del stock disponible ni superar la capacidad de la maquina.

Las unidades retiradas se registran, pero no vuelven automaticamente al stock
utilizable de camioneta. No se consideran ventas: las ventas estimadas son
`max(stock_sistema - stock_encontrado, 0)`. Las diferencias en maquinas no se
clasifican como faltantes porque pueden corresponder a ventas.

`stock_encontrado` es el conteo ANTES de retirar o reponer, incluidas las unidades
vencidas o danadas. Si se conto despues de retirarlas, se deben sumar al conteo
encontrado y registrar tambien en `cantidad_retirada`. El backend no puede detectar
el orden fisico del conteo. El saldo final es
`stock_encontrado + cantidad_repuesta - cantidad_retirada`.

Cada detalle guarda el precio vigente del slot en `precio_venta_actual` y el importe
calculado en `venta_esperada`. El backend comprueba el precio enviado contra el slot
bloqueado y rechaza con 409 un formulario desactualizado. El dashboard suma los
importes guardados, sin recalcular visitas anteriores con el precio actual del
catalogo. Esto no reconstruye cambios de precio ocurridos entre visitas.

La migracion 006 conserva reposiciones historicas sin asignacion; las nuevas
guardan camioneta y repartidor. El historial de camioneta muestra entradas desde
central y salidas a maquina. Los conteos de central y camionetas siguen siendo
informativos, sin tolerancias ni cambios de saldo.

## Dashboard

`GET /api/dashboard?desde=2026-10-01&hasta=2026-10-08` devuelve
`{ "status": "success", "data": { ... } }`, igual que los otros endpoints.
Ambas fechas son obligatorias, reales y con formato `YYYY-MM-DD`.
Desde no puede ser posterior a hasta; ambos dias se incluyen en horario
`America/Santiago`, incluso cuando cambia el horario de verano.
El periodo admite hasta 30 dias calendario contando ambas fechas.
Si supera el limite, la API devuelve `400` antes de consultar PostgreSQL.

La respuesta contiene `periodo`, `indicadores`, `maquinas`, `stock`, `atencion`,
`ultimas_visitas`, `evolucion`, `diferencias_maquinas` y `proveedores`.
Los indicadores, evolucion diaria, diferencias por maquina, margen por
proveedor y ultimas 10 visitas corresponden al periodo. Los estados, alertas,
conteos de catalogo y ultima visita por maquina no se limitan al filtro.

- Venta estimada: suma de `venta_esperada` registrada en las visitas, no ventas en tiempo real.
- Diferencia de caja: dinero retirado menos venta estimada; no confirma una perdida.
- Visitas: incluye registros sin unidades repuestas.
- Agotados: slots activos con stock cero, en maquinas y productos activos.
- Bajos: slots activos con stock positivo y hasta el 20 % de capacidad positiva.
- Atencion: maquinas activas con alertas, primero por agotados y luego por bajos.

Una solicitud HTTP ejecuta diez consultas independientes en paralelo:
indicadores de cabeceras, estados de maquinas, alertas, visitas recientes,
evolucion diaria, diferencias por maquina, resumen actual de proveedores y
detalle de ventas/margen por proveedor, indicadores del periodo anterior y
ranking de productos. Los importes de caja se suman sin unir
detalles para evitar duplicar dinero por producto. Los graficos reutilizan
esta respuesta, no realizan llamadas adicionales.

`anterior` contiene los indicadores del periodo inmediatamente anterior de igual
cantidad de dias calendario, con limites de medianoche en Santiago. No se muestra
variacion porcentual si no hubo visitas anteriores o la base anterior es cero.
`productos` contiene los cinco productos con mas unidades vendidas estimadas,
desempatados por venta estimada e ID. Suma los importes historicos de los detalles,
sin recalcular con precios actuales; las visitas sin detalles no contribuyen.
Las prioridades de reposicion son alta si hay slots agotados y media si solo hay
slots bajos. Los enlaces abren `/admin/inventario?maquina=ID` para revisar esa maquina.

El margen bruto estimado es la venta esperada de detalles menos cantidad
vendida estimada por costo de compra actual. La atribucion usa el proveedor
actual; cambiar costo o proveedor cambia la estimacion, no existe costo ni
proveedor historico capturado. No es ganancia neta y no distribuye caja por
proveedor. Si faltan detalles historicos, esos registros no aportan al margen,
aunque su cabecera siga aportando a caja. Los productos vendidos de costo cero
se identifican para revision sin tratarlos automaticamente como desconocidos.

La evolucion muestra solo fechas con visitas en Santiago: dias sin visitas
no se rellenan con ventas cero. Las barras muestran hasta ocho proveedores
con unidades vendidas estimadas; todos los grupos quedan en la tabla completa.
El dashboard no modifica saldos ni requiere tablas nuevas; necesita las tablas
de reposiciones y las columnas de la migracion 006 del backend actual.

El frontend separa el servicio HTTP (`dashboard.service.ts`), la consulta y cache
(`useDashboard.ts`) y la presentacion (`DashboardPage.tsx`). Consultar al entrar,
aplicar un rango o pulsar Actualizar no requiere descargar todos los inventarios.
Editar una fecha no llama a la API hasta aplicar el formulario. React Query
identifica cada resumen con `['dashboard', desde, hasta]`, actualiza al montar
y tambien puede reconsultar al recuperar foco o conexion si el dato esta vencido.

## Proveedores

La pantalla `/admin/proveedores` consume los endpoints existentes: GET de lista,
POST con `{ nombre }`, PUT completo con `{ nombre, estado }` y DELETE por ID.
El nombre se recorta y no puede quedar vacio; estado debe ser booleano al
editar. Un nombre duplicado devuelve 409 con mensaje visible en el modal.

Desactivar/reactivar conserva la relacion con productos. El DELETE es fisico:
por `ON DELETE SET NULL` los productos quedan sin proveedor, pero no se borran.
La confirmacion informa este efecto. Tras una mutacion se invalidan proveedores,
productos, inventario de maquinas y dashboard para actualizar datos relacionados.
El selector de productos no ofrece proveedores inactivos para nuevas
asignaciones; al editar conserva visible el proveedor actual. Esa restriccion
del selector no modifica todavia la validacion del endpoint de productos.

## Autenticación (011)

La migración `011_auth_sessions.sql` añade sesiones en PostgreSQL, la versión de acceso de los usuarios y la unicidad de correo normalizado. Está incluida en `schema.sql`. No asigna contraseñas a usuarios existentes. Ver [configuración y primer administrador](../AUTH.md).

## Rol de bodeguero (012)

Aplicar `012_bodeguero_role.sql` antes de crear usuarios BODEGUERO. También está incluida en `schema.sql`; conserva usuarios, contraseñas e historial. El administrador asigna el nuevo rol desde Usuarios. No convierte cuentas existentes automáticamente.

Si `usuarios.rol` aún usa un enum antiguo, la migración lo convierte a texto con la restricción de roles del esquema actual, conservando sus valores.

El bodeguero ingresa a `/admin/bodega` y comparte el panel existente. Puede usar Bodega, Inventario, Camionetas y Máquinas, incluidos sus movimientos, entregas y conteos. Productos, Proveedores, Usuarios y el dashboard quedan restringidos al administrador. Las consultas de opciones para los selectores solo devuelven identificadores y nombres. Los permisos se verifican tanto en las rutas del frontend como en el backend.
