import { createContext, useContext } from 'react';

export const ConfirmContext = createContext<((message: string) => Promise<boolean>) | null>(null);
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('La confirmación requiere ConfirmProvider.');
  return confirm;
}
