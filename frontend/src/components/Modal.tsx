import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
type ModalProps = {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
};
export function Modal({ title, description, children, onClose, closeDisabled = false }: ModalProps) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !closeDisabled) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[90dvh] overflow-y-auto bg-white sm:max-w-2xl"
        onPointerDownOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <DialogHeader className="mb-2 pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? 'Completa los datos y guarda los cambios.'}</DialogDescription>
        </DialogHeader>
        {children}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3"
          disabled={closeDisabled}
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
