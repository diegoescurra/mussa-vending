# Mussa · Frontend

Panel de administración en React, TypeScript y Vite. Usa Tailwind CSS, componentes de shadcn/ui y Radix, TanStack Query para los datos del servidor y TanStack Table para las tablas.

## Desarrollo

```sh
pnpm install
pnpm dev
```

La API se configura con `VITE_API_URL` (por defecto `http://localhost:3000/api`). El backend debe estar iniciado y permitir el origen del frontend.

## Interfaz del panel

- Tema claro en `src/index.css`: colores, tipografía, bordes y radios compartidos.
- Componentes de shadcn en `src/components/ui`, incorporados al proyecto con su CLI; se pueden adaptar directamente. `components.json` configura el alias `@/` y la ubicación de los componentes.
- `AppLayout` y `Sidebar` comparten navegación y menú móvil entre todas las vistas de administración.
- `Modal`, los campos de formulario y `FormActions` reutilizan los componentes de UI. `useConfirm` comparte la confirmación de eliminación dentro del panel.
- `DataTable` centraliza búsqueda, ordenación, filtros y paginación de 10, 25 o 50 filas (25 inicialmente). El encabezado permanece visible al desplazar la tabla.
- La paginación del catálogo ocurre en el navegador sobre los datos descargados. Los historiales conservan su paginación de servidor por cursor y el botón **Cargar más**; la búsqueda, la ordenación y las páginas visuales abarcan solo los registros ya cargados.
- El dashboard se descarga al abrir su ruta para no incluir los gráficos en la carga inicial de las otras vistas.

Para incorporar otro componente de shadcn:

```sh
pnpm dlx shadcn@latest add <componente>
```

Las páginas permanecen en `src/pages/admin`, los flujos y datos en sus hooks y los contratos HTTP en `src/services`.

## Verificación

```sh
pnpm run lint
pnpm run build
node --experimental-strip-types --test tests/*.test.mjs
pnpm test:integration
```

Las pruebas de integración usan navegador, API y PostgreSQL temporal en Docker; no modifican las bases de datos local ni de producción. Ver [instrucciones y recorridos](tests/integration/README.md).

## Autenticación

ADMIN y BODEGUERO comparten el panel. El bodeguero entra a `/admin/bodega` y accede a Bodega, Inventario, Camionetas y Máquinas. Productos, Proveedores, Usuarios y el dashboard requieren ADMIN, tanto en la navegación y las rutas como en la API. REPONEDOR mantiene su formulario independiente de reposición.

`/login` inicia una sesión con cookie HttpOnly. `useSession` comparte el usuario con TanStack Query y el cliente HTTP envía cookies y token CSRF. El backend impone los permisos; las rutas del frontend organizan el acceso por rol. Los cambios de identidad limpian la caché. Para activar la base, configurar cookies y crear el primer administrador, ver [AUTH.md](../backend/AUTH.md).
