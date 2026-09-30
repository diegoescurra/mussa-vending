# Base de datos

En una base vacia, ejecuta estos archivos en orden desde el editor SQL de Neon:

1. `migrations/000_create_schema.sql`
2. `migrations/001_create_reposiciones.sql`
3. `migrations/002_create_bodega.sql`
4. `seed.sql` para cargar los datos de demostracion.

La URL de conexion de Neon se configura como `DATABASE_URL` en Render.

Si la base ya existe, ejecuta solamente la migracion nueva `002_create_bodega.sql`.

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
Este modulo aun no transfiere stock a camionetas ni maquinas.
