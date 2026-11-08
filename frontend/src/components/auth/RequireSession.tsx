import { Navigate, Outlet } from 'react-router-dom';
import { useSession, homeFor } from '@/hooks/useSession';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/button';

type Role = 'ADMIN' | 'REPONEDOR' | 'BODEGUERO';

export function RequireSession({ role }: { role: Role | Role[] }) {
  const session = useSession();
  if (session.isPending)
    return <StateMessage title="Comprobando sesión" description="Verificando tu acceso." />;
  if (session.isError)
    return (
      <div className="p-6">
        <StateMessage title="No se pudo comprobar la sesión" description={session.error.message} />
        <Button className="mt-4" onClick={() => void session.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  const user = session.data.user;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(role) ? role.includes(user.rol as Role) : user.rol === role;
  if (!allowed) return <Navigate to={homeFor(user.rol)} replace />;
  return <Outlet />;
}
