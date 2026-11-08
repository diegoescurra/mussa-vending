import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RequireSession } from '@/components/auth/RequireSession';
import { LoginPage } from '@/pages/auth/LoginPage';
import { AppLayout } from '../components/layout/AppLayout';
import { StateMessage } from '../components/StateMessage';
import { BodegaPage } from '../pages/admin/bodega/BodegaPage';
import { CamionetasPage } from '../pages/admin/camionetas/CamionetasPage';
import { CamionetaInventarioPage } from '../pages/admin/camionetas/CamionetaInventarioPage';
import { InventarioPage } from '../pages/admin/inventario/InventarioPage';
import { MaquinasPage } from '../pages/admin/maquinas/MaquinasPage';
import { ProductosPage } from '../pages/admin/productos/ProductosPage';
import { ProveedoresPage } from '../pages/admin/proveedores/ProveedoresPage';
import { UsuariosPage } from '../pages/admin/usuarios/UsuariosPage';
import { ReposicionPage } from '../pages/reposicion/ReposicionPage';

// Los gráficos se descargan al abrir el dashboard, sin cargar el resto del panel.
const DashboardPage = lazy(() =>
  import('../pages/admin/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);

export const AppRouter = () => {
  const client = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    const expired = () => {
      void client.cancelQueries().then(() => {
        client.clear();
        client.setQueryData(['auth'], { user: null, csrfToken: '' });
        navigate('/login', { replace: true });
      });
    };
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, [client, navigate]);
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route element={<RequireSession role={['ADMIN', 'BODEGUERO']} />}>
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route element={<RequireSession role="ADMIN" />}>
            <Route
              path="dashboard"
              element={
                <Suspense
                  fallback={<StateMessage title="Cargando resumen" description="Preparando el dashboard." />}
                >
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
          </Route>
          <Route path="camionetas" element={<CamionetasPage />} />
          <Route path="camionetas/:id/inventario" element={<CamionetaInventarioPage />} />
          <Route path="bodega" element={<BodegaPage />} />
          <Route path="maquinas" element={<MaquinasPage />} />
          <Route path="inventario" element={<InventarioPage />} />
        </Route>
      </Route>
      <Route element={<RequireSession role="REPONEDOR" />}>
        <Route path="/reposicion" element={<ReposicionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};
