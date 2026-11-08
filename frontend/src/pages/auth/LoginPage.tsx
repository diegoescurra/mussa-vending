import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { ScanLine, LoaderCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useSession, homeFor } from '@/hooks/useSession';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const session = useSession();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: async (data) => {
      await client.cancelQueries();
      client.clear();
      client.setQueryData(['auth'], data);
      navigate(homeFor(data.user!.rol), { replace: true });
    },
  });
  if (session.data?.user) return <Navigate to={homeFor(session.data.user.rol)} replace />;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!login.isPending) login.mutate({ email: email.trim(), password });
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="rounded-xl bg-primary p-2.5 text-white">
            <ScanLine />
          </span>
          <span className="text-2xl font-bold tracking-tight">
            mussa<span className="text-primary">.</span>
          </span>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa con tu cuenta para acceder a tu operación.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={login.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={login.isPending}
                />
              </div>
              {login.isError ? (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {login.error.message}
                </p>
              ) : null}
              {session.isError ? (
                <p role="alert" className="text-sm text-red-700">
                  No se pudo conectar con el servidor. Puedes reintentar al ingresar.
                </p>
              ) : null}
              <Button className="w-full" disabled={login.isPending || session.isPending}>
                {login.isPending ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Si necesitas acceso o recuperar tu contraseña, contacta al administrador.
        </p>
      </div>
    </main>
  );
}
