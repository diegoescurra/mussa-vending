# Acceso a Mussa

Passport Local verifica correo y contraseña mediante bcrypt (costo 12). Express Session conserva las sesiones en PostgreSQL (`sesiones`); el navegador recibe solo una cookie HttpOnly. La sesión dura 12 horas desde el login. No hay registro público.

## Activar en una instalación existente

1. Instalar las dependencias de backend y frontend con `pnpm install` en cada carpeta.
2. Ejecutar `db/migrations/011_auth_sessions.sql` y luego `db/migrations/012_bodeguero_role.sql` en la base que usa el backend. Ambas están incluidas en `db/schema.sql`, para instalaciones nuevas o desactualizadas. No elimina productos ni historial. Si hay correos duplicados que solo difieren por espacios o mayúsculas, resolverlos antes de aplicar la migración.
3. Configurar el backend y reiniciarlo:

```dotenv
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=un-secreto-aleatorio-de-al-menos-32-caracteres
SESSION_SAME_SITE=lax
```

Generar el secreto con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` y guardarlo en `.env` local o en variables del despliegue. Nunca versionarlo. Sin secreto, solo en desarrollo, se genera uno efímero: reiniciar el servidor cierra las sesiones anteriores.

4. Crear el primer administrador. Desde `backend`, en PowerShell:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Correo del administrador'
$adminPassword = Read-Host 'Contraseña (mínimo 8 caracteres)' -AsSecureString
try {
  $env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminPassword).Password
  pnpm.cmd auth:admin
} finally {
  Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  $adminPassword.Dispose()
}
```

La herramienta crea un ADMIN si el correo no existe. Si ya es ADMIN, restablece su contraseña, lo activa y revoca sus sesiones. Nunca convierte un usuario de otro rol en administrador. `ADMIN_NOMBRE` y `ADMIN_APELLIDO` son opcionales para una cuenta nueva. En un entorno sin PowerShell se pueden inyectar estas variables de forma temporal desde el gestor de secretos.

Los usuarios antiguos con hashes provisionales como `pendiente` no pueden ingresar. El administrador establece sus contraseñas desde **Usuarios → Editar**. Las contraseñas nuevas requieren 8 caracteres y un máximo de 72 bytes UTF-8, límite de bcrypt; no se recortan silenciosamente. Cada usuario puede cambiar su propia contraseña desde el icono de llave.

## Permisos

- ADMIN: todas las vistas y operaciones administrativas, incluida la gestión de usuarios. El bodeguero de una entrega y el responsable de un conteo se toman de la sesión. No puede eliminarse, desactivarse o quitarse su propio rol de administrador.
- BODEGUERO: usa el mismo panel y entra a `/admin/bodega`. Accede a Bodega, Inventario, Camionetas y Máquinas con sus operaciones y conteos. No accede a Productos, Proveedores, Usuarios ni al dashboard; tampoco registra reposiciones. Los selectores consultan únicamente los identificadores y nombres de productos y repartidores activos. La identidad de entregas y conteos se toma de la sesión. Tanto las rutas del frontend como cada petición al backend verifican los permisos.
- REPONEDOR: consultar máquinas e inventarios de máquinas, consultar su camioneta y su stock, y registrar reposiciones con su propia identidad. No puede gestionar el catálogo ni consultar otras camionetas. No existe una asignación de máquinas a reponedores en el modelo actual, por lo que todos pueden consultar las máquinas.
- Cambiar contraseña, rol o estado incrementa la versión de acceso. Todas las sesiones previas se rechazan en la siguiente petición; se consulta el usuario vigente en cada petición autenticada. Salir elimina la sesión actual de PostgreSQL.

## Producción y cookies

`NODE_ENV=production` exige `SESSION_SECRET` y `CORS_ORIGIN` y usa cookies Secure (HTTPS). El origen debe ser exacto, sin ruta ni barra final; admite varios separados por comas. `TRUST_PROXY=1` corresponde a un único proxy confiable, como el de Render; no activarlo si el servidor recibe tráfico directo no confiable.

Preferir frontend y API bajo el mismo sitio, por ejemplo `app.ejemplo.cl` y `api.ejemplo.cl`, usando `SESSION_SAME_SITE=lax`. Los dominios separados `*.onrender.com` requieren `SESSION_SAME_SITE=none` (configurado en `render.yaml`). Los navegadores que bloquean cookies de terceros pueden impedir ese login; en ese caso usar dominios propios del mismo sitio o un proxy del mismo origen. El frontend siempre envía `credentials: include`. En local, usar el mismo hostname en ambos lados (`localhost` o `127.0.0.1`).

Las escrituras requieren un token CSRF de la sesión enviado en `X-CSRF-Token`, incluido el login. `GET /api/auth/session` entrega el usuario y el token; el login regenera ambos identificadores. Las respuestas de la API no se cachean. Hay un límite de 20 intentos fallidos por IP cada 15 minutos, compartido entre login y cambio de contraseña. Su contador vive en el proceso; para múltiples instancias se necesitaría un store compartido del limitador.

No se despliega automáticamente ni se crean contraseñas predeterminadas. La recuperación por correo no está incluida: el administrador puede restablecer contraseñas y la herramienta local permite recuperar el acceso administrativo.

## Verificación

`pnpm test` en backend y `pnpm test:integration` en frontend. Las pruebas de integración usan sesiones, bcrypt, API y PostgreSQL reales en un contenedor desechable; no usan las credenciales de la aplicación.
