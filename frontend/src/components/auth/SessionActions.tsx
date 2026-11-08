import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LogOut, KeyRound } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/Modal';

export function SessionActions() {
  const user = useSession().data?.user;
  const client = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const finish = async () => {
    await client.cancelQueries();
    client.clear();
    client.setQueryData(['auth'], { user: null, csrfToken: '' });
    navigate('/login', { replace: true });
  };
  const logout = useMutation({ mutationFn: authService.logout, onSuccess: finish });
  const change = useMutation({ mutationFn: authService.changePassword, onSuccess: finish });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    if (!change.isPending) change.mutate({ currentPassword, password });
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="hidden text-muted-foreground md:inline">
        {user?.nombre} {user?.apellido}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Cambiar contraseña"
        title="Cambiar contraseña"
        onClick={() => {
          setOpen(true);
          setCurrent('');
          setPassword('');
          setConfirmation('');
          setError('');
          change.reset();
        }}
      >
        <KeyRound />
      </Button>
      <Button variant="outline" size="sm" disabled={logout.isPending} onClick={() => logout.mutate()}>
        <LogOut />
        Salir
      </Button>
      {logout.isError ? (
        <p role="alert" className="text-xs text-red-700">
          {logout.error.message}
        </p>
      ) : null}
      {open ? (
        <Modal
          title="Cambiar contraseña"
          description="Al guardar se cerrarán tus sesiones. Ingresa nuevamente con tu nueva contraseña."
          onClose={() => setOpen(false)}
          closeDisabled={change.isPending}
        >
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={change.isPending} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Contraseña actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrent(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Al menos 8 caracteres; máximo 72 bytes.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Repetir nueva contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              {error || change.isError ? (
                <p role="alert" className="text-sm text-red-700">
                  {error || change.error?.message}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button>{change.isPending ? 'Guardando…' : 'Cambiar contraseña'}</Button>
              </div>
            </fieldset>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
