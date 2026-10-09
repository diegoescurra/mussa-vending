import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../pages/admin/dashboard/DashboardPage';
import { BodegaPage } from '../pages/admin/bodega/BodegaPage';
import { CamionetasPage } from '../pages/admin/camionetas/CamionetasPage';
import { CamionetaInventarioPage } from '../pages/admin/camionetas/CamionetaInventarioPage';
import { InventarioPage } from '../pages/admin/inventario/InventarioPage';
import { MaquinasPage } from '../pages/admin/maquinas/MaquinasPage';
import { ProductosPage } from '../pages/admin/productos/ProductosPage';
import { ProveedoresPage } from '../pages/admin/proveedores/ProveedoresPage';
import { UsuariosPage } from '../pages/admin/usuarios/UsuariosPage';
import { ReposicionPage } from '../pages/reposicion/ReposicionPage';

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route
        path="/admin/dashboard"
        element={(
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        )}
      />
      <Route path="/reposicion" element={<ReposicionPage />} />
      <Route path="/admin/proveedores" element={<AppLayout><ProveedoresPage /></AppLayout>} />
      <Route
        path="/admin/camionetas"
        element={(
          <AppLayout>
            <CamionetasPage />
          </AppLayout>
        )}
      />
      <Route
        path="/admin/camionetas/:id/inventario"
        element={(
          <AppLayout>
            <CamionetaInventarioPage />
          </AppLayout>
        )}
      />
      <Route
        path="/admin/bodega"
        element={(
          <AppLayout>
            <BodegaPage />
          </AppLayout>
        )}
      />
      <Route
        path="/admin/productos"
        element={(
          <AppLayout>
            <ProductosPage />
          </AppLayout>
        )}
      />
      <Route
        path="/admin/maquinas"
        element={(
          <AppLayout>
            <MaquinasPage />
          </AppLayout>
        )}
      />
      <Route
        path="/admin/inventario"
        element={(
          <AppLayout>
            <InventarioPage />
          </AppLayout>
        )}
      />
      <Route
        path="/admin/usuarios"
        element={(
          <AppLayout>
            <UsuariosPage />
          </AppLayout>
        )}
      />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};
