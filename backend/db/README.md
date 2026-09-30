# Base de datos

En una base vacia, ejecuta estos archivos en orden desde el editor SQL de Neon:

1. `migrations/000_create_schema.sql`
2. `migrations/001_create_reposiciones.sql`
3. `migrations/002_create_bodega.sql`
4. `migrations/003_create_camionetas.sql`
5. `migrations/004_create_camioneta_inventario.sql`
6. `seed.sql` para cargar los datos de demostracion.

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
Por ahora no incluye devoluciones, limites de carga, faltantes ni reposicion a maquinas.
