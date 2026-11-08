import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Factory,
  Monitor,
  Boxes,
  Warehouse,
  Truck,
  Users,
  ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useSession, homeFor } from '@/hooks/useSession';

const groups = [
  { label: 'General', items: [{ label: 'Inicio', path: 'dashboard', icon: LayoutDashboard }] },
  {
    label: 'Operación',
    items: [
      { label: 'Inventario', path: 'inventario', icon: Boxes },
      { label: 'Bodega', path: 'bodega', icon: Warehouse },
      { label: 'Camionetas', path: 'camionetas', icon: Truck },
      { label: 'Máquinas', path: 'maquinas', icon: Monitor },
    ],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Productos', path: 'productos', icon: Package },
      { label: 'Proveedores', path: 'proveedores', icon: Factory },
      { label: 'Usuarios', path: 'usuarios', icon: Users },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useSession().data?.user;
  const isAdmin = user?.rol === 'ADMIN';
  const visibleGroups = groups.filter((group) => isAdmin || group.label === 'Operación');
  return (
    <div className="flex h-full flex-col bg-white">
      <Link to={homeFor(user?.rol ?? '')} onClick={onNavigate} className="flex h-20 shrink-0 items-center gap-3 px-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
          <ScanLine className="size-5" />
        </span>
        <span>
          <span className="block text-lg font-bold tracking-tight">
            mussa<span className="text-primary">.</span>
          </span>
          <span className="block text-[11px] font-medium tracking-wide text-muted-foreground">
            GESTIÓN DE VENDING
          </span>
        </span>
      </Link>
      <Separator />
      <nav aria-label="Navegación principal" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={'/admin/' + item.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                    )
                  }
                >
                  <item.icon className="size-[18px]" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t p-4">
        <p className="mt-3 text-center text-xs text-muted-foreground">Administración de tu operación</p>
      </div>
    </div>
  );
}
