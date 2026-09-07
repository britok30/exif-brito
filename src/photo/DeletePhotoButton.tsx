'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deletePhotoAction } from './actions';
import { cn } from '@/lib/utils';

interface DeletePhotoButtonProps {
  id: string;
  title?: string;
}

export function DeletePhotoButton({ id, title }: DeletePhotoButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const onConfirm = () => {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await deletePhotoAction(id);
        if (result.ok) setOpen(false);
        else setError('This photograph couldn’t be deleted. Please try again.');
      } catch {
        setError('The connection was interrupted. Please try again.');
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={value => { if (!pending) { setOpen(value); setError(undefined); } }}>
      <AlertDialogTrigger
        aria-label="Delete photograph"
        className={cn(
          'inline-flex min-h-10 min-w-10 items-center justify-center',
          'text-foreground hover:underline',
        )}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.25} />
      </AlertDialogTrigger>

      <AlertDialogContent
        className={cn(
          'w-[calc(100%-2rem)] rounded-none border-foreground bg-background',
          'p-6 sm:p-10 data-[size=default]:max-w-md data-[size=default]:sm:max-w-md',
        )}
      >
        <AlertDialogHeader className="space-y-3 text-left">
          <p className="gallery-label">
            Confirm
          </p>
          <AlertDialogTitle className="text-2xl leading-tight tracking-tight font-light text-foreground">
            Delete {title ? <>“{title}”</> : 'this photograph'}?
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-1 text-sm leading-relaxed text-foreground">
            Permanently removes this photograph and its original from your collection. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="text-sm text-foreground" role="alert">
            {error}
          </p>
        )}

        <AlertDialogFooter className="mt-2 gap-3">
          <AlertDialogCancel
            disabled={pending}
            className="rounded-none border-foreground"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
            className="rounded-none"
          >
            {pending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
