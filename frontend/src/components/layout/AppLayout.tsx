import { SessionActions } from '@/components/auth/SessionActions';
import { useSession } from '@/hooks/useSession';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChevronRight, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ConfirmProvider } from '../ConfirmProvider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const labels: Record<string, string> = {
  dashboard: 'Inicio',
  productos: 'Productos',
  proveedores: 'Proveedores',
  maquinas: 'Máquinas',
  inventario: 'Inventario',
  bodega: 'Bodega',
  camionetas: 'Camionetas',
  usuarios: 'Usuarios',
};
export function AppLayout() {
  const isAdmin = useSession().data?.user?.rol === 'ADMIN';
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-background text-foreground">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r lg:block">
          <Sidebar />
        </aside>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-72 gap-0 p-0">
            <SheetTitle className="sr-only">Menú del panel</SheetTitle>
            <SheetDescription className="sr-only">Accede a las secciones del panel.</SheetDescription>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 lg:pl-60">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur-sm sm:px-8">
            <div className="flex items-center gap-3 text-sm">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Abrir menú"
                onClick={() => setMenuOpen(true)}
              >
                <Menu />
              </Button>
              <span className="hidden text-muted-foreground sm:inline">{isAdmin ? 'Administración' : 'Operación'}</span>
              <ChevronRight className="hidden size-3.5 text-slate-400 sm:block" />
              <span className="font-medium">{labels[location.pathname.split('/')[2]] ?? 'Inicio'}</span>
            </div>
            <SessionActions />
          </header>
          <main className="mx-auto max-w-[1600px] p-4 sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
