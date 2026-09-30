# Base de datos

En una base vacia, ejecuta estos archivos en orden desde el editor SQL de Neon:

1. `migrations/000_create_schema.sql`
2. `migrations/001_create_reposiciones.sql`
3. `migrations/002_create_bodega.sql`
4. `migrations/003_create_camionetas.sql`
5. `migrations/004_create_camioneta_inventario.sql`
6. `migrations/005_create_conteos.sql`
7. `migrations/006_reposicion_camioneta.sql`
8. `seed.sql` para cargar los datos de demostracion.

La URL de conexion de Neon se configura como `DATABASE_URL` en Render.

Si la base ya existe, ejecuta solamente las migraciones que aun no hayas aplicado.

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

La migracion 006 conserva reposiciones historicas sin asignacion; las nuevas
guardan camioneta y repartidor. El historial de camioneta muestra entradas desde
central y salidas a maquina. Los conteos de central y camionetas siguen siendo
informativos, sin tolerancias ni cambios de saldo.
