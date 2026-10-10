# Base de datos

En una base vacia, ejecuta estos archivos en orden desde el editor SQL de Neon:

1. `migrations/000_create_schema.sql`
2. `migrations/001_create_reposiciones.sql`
3. `migrations/002_create_bodega.sql`
4. `migrations/003_create_camionetas.sql`
5. `migrations/004_create_camioneta_inventario.sql`
6. `migrations/005_create_conteos.sql`
7. `migrations/006_reposicion_camioneta.sql`
8. `migrations/007_create_missing_reposicion_detalles.sql`
9. `migrations/008_add_maquina_modelo_sistemas_pago.sql`
10. `seed-productos-reales.sql` para cargar el catalogo real.
11. Opcional, separado y manual: `seed-demo-operacion.sql` para movimientos DEMO-V1.

La URL de conexion de Neon se configura como `DATABASE_URL` en Render.

Si la base ya existe, ejecuta solamente las migraciones que aun no hayas aplicado.
La 007 es una reparacion idempotente de detalles faltantes y tambien funciona
despues de la 001 en una instalacion nueva. La 006 no requiere reposiciones previas.
La tabla correcta es `maquina_productos` (singular). Se corrigio el typo en las
fuentes 000 y `seed.sql`; esto NO renombra ni modifica tablas ya desplegadas.
Si una base solo tiene `maquinas_productos`, revisar su esquema antes de continuar;
el seed operativo aborta, no intenta reparar una base existente.

`seed.sql` es el antiguo ejemplo minimo con productos ficticios, no es un paso
necesario ni el seed operativo. DEMO-V1 puede coexistir con ese ejemplo sin tocarlo.
Ningun seed se ejecuta automaticamente al iniciar el backend o aplicar migraciones.

## Catalogo real

Para cargar los proveedores y productos reales en Neon, ejecuta
`seed-productos-reales.sql` desde el editor SQL, despues de crear las tablas
`proveedores` y `productos`. No requiere ejecutar el seed de demostracion.

El script crea primero los proveedores y luego vincula cada producto usando
su nombre de proveedor. Usa `proveedores` (plural), como el esquema de Neon.
Conserva los costos y precios informados, incluidos los costos cero.
Los dos TUAREG se identifican como `TUAREG (CASO)` y `TUAREG (SERFEL)`
porque los nombres de productos son unicos.

La carga es transaccional y puede repetirse sin duplicados. Si ya existe un
proveedor o producto con el mismo nombre, no se modifica ni se reactiva.
No elimina productos de demostracion ni asigna productos a maquinas, bodega
o camionetas. Tampoco carga existencias.

## Demo operativo real (DEMO-V1)

Desde el editor SQL de Neon, despues de las migraciones 000..008 y del catalogo
real, ejecutar **por separado** `seed-demo-operacion.sql` completo. Es una carga
opcional para una base de demostracion, no para agregar historia a productos que
ya se usan en produccion. No usa la URL configurada ni ejecuta escrituras por si
solo. No borra datos ni crea tablas auxiliares persistentes.

Ambos seeds reales tienen transaccion y el mismo advisory lock transaccional.
El operativo comprueba columnas de 006, detalles de 007 y la tabla singular,
y bloquea las tablas implicadas contra escrituras concurrentes durante la carga.
Conviene ejecutarlo fuera de actividad: esos bloqueos pueden esperar o hacer
esperar escrituras de la aplicacion. Cualquier error revierte la carga entera.

### Condiciones antes de la primera carga

- Deben existir `CHOCMAN`, `TUAREG (CASO)`, `PAPAS`, `COCA COLA LATA`, `CACHANTUN SIN GAS` y `WILD PROTEIN`, activos y con proveedor activo.
- Los seis deben tener stock cero o saldo ausente en central, **todas** las camionetas y **todas** las maquinas existentes. Las asignaciones vacias sin uso previo son admisibles y se conservan.
- No deben tener movimientos centrales/de camioneta, conteos, detalles ni visitas de maquinas a las que esten asignados, aunque el saldo haya vuelto a cero. Una visita sin detalles tambien cuenta como uso previo.
- Si se incumple alguna condicion, aborta con mensaje claro. No sobrescribe saldos ni agrega una compra ficticia a historia previa. No limpiar ni resetear la base para forzarlo; usar una rama/base demo vacia o revisar manualmente.
- No deben existir identificadores reservados `DEMO-V1*`, emails `demo-v1-*` ni observaciones `DEMO-V1*`. Una colision o carga parcial aborta; no se adopta ninguna entidad mediante `ON CONFLICT`.
- El catalogo existente conserva precio, costo, proveedor y estado. La suma de precios de los seis debe ser al menos 125 CLP para soportar la diferencia de caja -500 sin dinero negativo.

Los usuarios tienen emails `demo-v1-admin@example.invalid`,
`demo-v1-a@example.invalid` y `demo-v1-b@example.invalid`, y hashes deliberadamente
no utilizables para login (`!DEMO-V1-NO-LOGIN`). Los responsables son datos demo,
no credenciales ni verificacion de identidad. Camionetas: `DEMO-V1-A/B`;
maquinas: `DEMO-V1-M1` a `DEMO-V1-M5`. Las observaciones identifican compras,
cargas, visitas, reposiciones y conteos como sinteticos.

### Datos y cronologia

| Entidad / historial DEMO-V1 | Cantidad |
| --- | ---: |
| Productos reales utilizados (no productos nuevos) | 6 |
| Usuarios: 1 ADMIN y 2 REPONEDOR | 3 |
| Camionetas asignadas a los dos reponedores | 2 |
| Maquinas: 3 ACTIVA, 1 MANTENCION, 1 INACTIVA | 5 |
| Slots activos: 3 maquinas x 6 productos, capacidad 18 | 18 |
| Visitas: 4 rondas x 3 maquinas | 12 |
| Detalles: 6 por visita, incluida la ronda sin reposicion | 72 |
| Movimientos central: 6 entradas y 18 salidas | 24 |
| Movimientos camioneta: 18 cargas y 54 salidas agregadas | 72 |
| Conteos: 6 central y 6 por camioneta | 18 |

Las fechas se calculan una sola vez en la primera carga desde `current_date` en
`America/Santiago`, con horarios locales y orden cronologico de movimientos:

1. Dia -13: compra de 200 unidades de cada producto (1.200 recibidas).
2. Dia -12: carga de 60 por producto a cada camioneta, con salida central enlazada.
3. Dia -9: primera visita a las 3 maquinas; sistema/encontrado 0, repuesto 12, final 12.
4. Dia -6: encontrado 8, venta estimada 4, repuesto 6, final 14.
5. Dia -3: recarga de 20 por producto a A; luego encontrado 9, venta 5, repuesto 5 y retiro 1, final 13.
6. Dia -1: encontrado 0, 2 u 8 segun maquina/producto, repuesto 0; despues conteos informativos de cierre.

A atiende M1/M2; B atiende M3. Cada maquina termina con dos productos agotados,
dos bajos (2/18) y dos sanos (8/18). M4/M5 no tienen slots ni visitas.
Los movimientos de camioneta se agregan por producto/visita y solo se generan
si la cantidad repuesta es positiva, con sus FK a visita/maquina. Los retiros
no vuelven a stock utilizable ni cuentan como ventas.

Saldo final **por producto**: central 60, A 34, B 37, maquinas 10;
ventas estimadas 56 unidades y retiros 3. Conservacion:
`200 = 60 + 34 + 37 + 10 + 56 + 3`. Las cadenas de saldos parten de cero y no
son negativas. Se usan los precios actuales del catalogo en los slots y se
capturan en cada detalle, no se inventan precios historicos de produccion.

Las primeras visitas tienen venta/caja/diferencia cero; las siguientes tienen
diferencia de caja 0 (M1), +300 (M2) y -500 (M3), sin dinero negativo. Las
cabeceras suman los importes de detalles una sola vez; diferencia total -600.
Los conteos capturan el esperado final y fisicos con diferencias 0/+1/-1,
generadas por la BD: **no ajustan** existencias ni generan movimientos. Central
lo cuenta ADMIN; A su reponedor asignado; B ADMIN.

Para ver las cuatro rondas en el dashboard, filtrar desde el dia -13 hasta hoy
en Santiago. Al inicio de mes hay datos del mes anterior: el filtro por mes
actual puede ocultar compras/visitas y no significa que falten datos. Las fechas
no se mueven al repetir. Los graficos por proveedor y costo usan el catalogo
real. Opcionalmente corregir costos conocidos mediante el flujo normal de
catalogo; los costos cero existentes se conservan y deben revisarse si no
corresponden al costo real. El seed no los interpreta como costos desconocidos.

### Repeticion

El ultimo conteo lleva `DEMO-V1 COMPLETE`, ligado a WILD PROTEIN en B y ADMIN.
Si existe ese marcador y estan completas las entidades/filas originales, devuelve
un NOTICE y no hace inserts, no reinicia stock ni historia y conserva el uso
manual posterior, fechas y precios. El marcador no sustituye las comprobaciones
de completitud. Si faltan filas originales o el marcador colisiona, aborta sin
reparacion automatica. Reservar `DEMO-V1*` para estas filas, no reutilizarlo en
observaciones nuevas de la aplicacion.

### Verificacion local aislada

`verify-demo-operacion.mjs` requiere Node y un contenedor PostgreSQL local ya
existente. No lee `.env` ni `DATABASE_URL`, no se conecta a Neon. Ejemplo:

```powershell
node backend/db/verify-demo-operacion.mjs postgres_inventory inventario_user inventario_maquinas
```

El script crea esquemas aleatorios dentro de una transaccion, fija `search_path`
solo a esos esquemas (sin `public`) y ejecuta las sentencias SQL reales de las
migraciones/seeds. Solo quita los `BEGIN/COMMIT` externos de los archivos para
poder **revertir absolutamente toda la verificacion con ROLLBACK**. Ante error,
el cierre de la conexion tambien revierte. No hace DROP, RESET ni cambios en
el `public` existente; usa tablas temporales para comparar resultados.

Comprueba coexistencia con el seed antiguo, catalogo existente inmutable,
cantidades, ecuaciones de stock y dinero, cadenas cronologicas no negativas,
FK de cargas/salidas, conservacion por producto, estados de slots, responsables
y diferencias de conteos, fechas Santiago, repeticion sin cambios y uso manual
posterior. Tambien prueba guardas de stock/historia/colisiones/carga parcial,
esquema plural incorrecto, ausencia de 006 y reparacion de detalles mediante
007 sin exigir datos previos. Aplica 008 sobre maquinas e inventario legacy poblados,
comprueba preservacion de filas/IDs y defaults, acepta las combinaciones validas
de pago y rechaza valores desconocidos, null, duplicados y multiples dimensiones
sin conservar cambios de prueba. No es un CLI de migraciones ni ejecuta seeds en
la base configurada por el backend.

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

En una base existente, ejecutar manualmente el archivo 008 completo en el editor
SQL de Neon, despues de las migraciones anteriores y antes de desplegar este
backend. No se ejecuta automaticamente. Es transaccional y debe aplicarse una sola
vez. Conserva las maquinas existentes con `modelo = ''` y `sistemas_pago = []`
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
tambien deben estar activos. No hay login, por lo que estos datos no verifican identidad.

La entrega descuenta de central, suma a camioneta y registra ambos movimientos en
una sola transaccion. No permite saldos negativos y revierte todo si algo falla.
El repartidor se guarda en cada movimiento para conservar la asignacion historica.
Por ahora no incluye devoluciones ni limites de carga.

## Conteos fisicos

- `GET /api/conteos`: historial solamente de bodega central.
- `GET /api/conteos?id_camioneta=1`: historial de una camioneta existente (tambien inactiva).
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
entre 0 y 2147483647. El responsable se selecciona manualmente; no hay login.

La respuesta incluye `id_conteo`, ubicacion, producto, responsable, `stock_esperado`,
`stock_fisico`, `diferencia`, `observacion` y `fecha_creacion`. El historial agrega
`producto_nombre` y `responsable_nombre`. El esperado se captura en una transaccion
con bloqueo del saldo; un saldo ausente se inicializa en cero.
Los conteos NO ajustan stock automaticamente ni crean movimientos. No incluyen
tolerancias ni clasificacion de perdidas. Sus claves foraneas impiden eliminar
productos, responsables o camionetas con historia; no hay borrado en cascada.

## Reposicion desde camioneta

`POST /api/reposiciones` requiere `id_repartidor` junto a los datos de reposicion.
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

Una solicitud HTTP ejecuta ocho consultas independientes en paralelo:
indicadores de cabeceras, estados de maquinas, alertas, visitas recientes,
evolucion diaria, diferencias por maquina, resumen actual de proveedores y
detalle de ventas/margen por proveedor. Los importes de caja se suman sin unir
detalles para evitar duplicar dinero por producto. Los graficos reutilizan
esta respuesta, no realizan llamadas adicionales.

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
