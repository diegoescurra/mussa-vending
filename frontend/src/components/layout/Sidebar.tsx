import { NavLink } from 'react-router-dom';

export type SectionId = 'dashboard' | 'productos' | 'proveedores' | 'maquinas' | 'inventario-maquinas' | 'bodega' | 'usuarios' | 'camionetas';

const navigationItems: Array<{ id: SectionId; label: string; description: string; path: string }> = [
  { id: 'dashboard', label: 'Inicio', description: 'Resumen de la operación', path: '/admin/dashboard' },
  { id: 'productos', label: 'Productos', description: 'Catálogo y precios', path: '/admin/productos' },
  { id: 'proveedores', label: 'Proveedores', description: 'Nombres y estado', path: '/admin/proveedores' },
  { id: 'maquinas', label: 'Máquinas', description: 'Ubicación y estado', path: '/admin/maquinas' },
  { id: 'inventario-maquinas', label: 'Inventario', description: 'Stock por máquina', path: '/admin/inventario' },
  { id: 'bodega', label: 'Bodega', description: 'Saldos y movimientos', path: '/admin/bodega' },
  { id: 'camionetas', label: 'Camionetas', description: 'Vehiculos y repartidores', path: '/admin/camionetas' },
  { id: 'usuarios', label: 'Usuarios', description: 'Equipo operativo', path: '/admin/usuarios' },
];

export const Sidebar = () => {
  return (
    <aside className="flex w-full flex-col gap-5 border-b border-slate-200 bg-slate-950 p-4 text-white lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Mussa</p>
        <h1 className="mt-3 text-xl font-bold tracking-tight">Vending Admin</h1>
        <p className="mt-2 text-sm text-slate-400">Control de máquinas y operaciones.</p>
      </div>

      <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
        {navigationItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `rounded-lg border border-transparent px-3 py-3 text-left transition ${
                isActive
                  ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-950/40'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <span className="block text-sm font-semibold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
