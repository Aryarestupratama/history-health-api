import { useState, useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

/**
 * Hook konfirmasi async, pengganti window.confirm(...) bawaan.
 * Pemakaian:
 *   const { confirm, dialog } = useConfirm();
 *   async function handleDelete() {
 *     if (!(await confirm({ title: 'Hapus?', description: '...' }))) return;
 *     ...
 *   }
 *   return <>{dialog}<Button onClick={handleDelete}>Hapus</Button></>;
 */
export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', description: '' });
  const resolver = useRef(null);

  const confirm = useCallback(({ title, description }) => {
    setState({ open: true, title, description });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handleResult(result) {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(result);
    resolver.current = null;
  }

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={(open) => !open && handleResult(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleResult(false)}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleResult(true)}>Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
