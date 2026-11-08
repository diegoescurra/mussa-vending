import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ConfirmContext } from '@/hooks/useConfirm';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const confirm = useCallback((text: string) => {
    if (resolver.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setMessage(text);
    });
  }, []);
  const finish = (confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setMessage(null);
  };
  useEffect(
    () => () => {
      resolver.current?.(false);
      resolver.current = null;
    },
    [],
  );
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={message !== null}
        onOpenChange={(open) => {
          if (!open) finish(false);
        }}
      >
        <AlertDialogContent className="bg-white"
          onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => finish(true)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
