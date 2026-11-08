# Pruebas de integración

Desde `frontend`, ejecutar:

```sh
pnpm test:integration
```

Requisitos: Node 20.19+ (o 22.12+), dependencias instaladas en `frontend` y `backend`, y Docker iniciado con contenedores Linux. En Windows se aprovecha Edge si está instalado. En otros entornos instalar Chromium una vez con `pnpm exec playwright install chromium` (en Linux/CI puede necesitarse `--with-deps`). `PLAYWRIGHT_CHANNEL` permite elegir otro canal instalado.

El runner crea un contenedor PostgreSQL 16 sin volúmenes, aplica las migraciones reales y levanta la API en `127.0.0.1:3011` y Vite en `127.0.0.1:4173`. Esos puertos deben estar libres. Cada prueba reinicia sus datos; al terminar se elimina el contenedor. No usa `.env` para conectarse a bases de datos existentes.

La suite contiene catorce recorridos:

- Login, persistencia de sesión, CSRF, cierre y rechazo de cookies revocadas.
- Permisos del reponedor, aislamiento de camionetas e identidad del responsable aunque se manipule el cuerpo de la petición.
- Bodeguero en el panel compartido: acceso a las cuatro secciones operativas, entregas y conteos con identidad de sesión, bloqueo administrativo por URL y API, y rechazo de escrituras anónimas o con cookies inventadas.
- Cambio de contraseña con bcrypt, revocación por contraseña/rol/estado y rechazo de hashes enviados por el cliente.
- Panel claro en escritorio y móvil: las nueve vistas, pestañas del dashboard, menú y formularios. Guarda capturas en `test-results/`.
- Catálogo paginado: búsqueda y filtros globales, cambio de tamaño, ordenación y cancelación de eliminación.
- Productos: error real al duplicar, conservar campos, corregir, crear, editar y eliminar.
- Usuarios y camionetas: alta, edición, asignación de repartidor disponible, inventario y eliminación.
- Máquinas: configuración, asignación de producto, edición de stock con incremento de versión y eliminación.
- Operación completa: entrada en bodega, entrega a camioneta, seis pasos de reposición, retiros, conteos en ambas ubicaciones y dashboard con límite de 30 días.
- Respuesta perdida después de confirmar una reposición: reenvío idéntico y un solo descuento de stock.
- Dos reposiciones sobre el mismo inventario: una confirma, la otra recibe conflicto y puede recargar.
- Entregas simultáneas con una unidad disponible y reversión de una entrega rechazada después del descuento en bodega.
- Paginación de movimientos y conteos de bodega y camioneta, sin registros repetidos ni faltantes.

Los escenarios operan contra Express y PostgreSQL reales. Se intercepta la red para simular una respuesta perdida y para manipular el ID del reponedor; en ambos casos el servidor real procesa la operación. Los demás escenarios usan peticiones normales. Además de verificar la interfaz, se comprueban saldos, detalles y movimientos persistidos. La suite falla si detecta errores de JavaScript sin manejar o claves de React repetidas. Los datos masivos del historial se preparan directamente en la base de datos.

Para ejecutar un recorrido específico:

```sh
pnpm test:integration --grep "respuesta perdida"
```

Los fallos guardan captura, contexto y traza en `test-results/` (ignorado por Git). Para abrir una traza: `pnpm exec playwright show-trace <ruta-a-trace.zip>`.

Estas pruebas cubren los flujos principales; no son una prueba de carga ni una verificación de todos los navegadores o de los servicios desplegados.
