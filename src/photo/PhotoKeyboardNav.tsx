'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** ← and → step through the archive from a photograph's own page, as they do inside the viewer. */
export function PhotoKeyboardNav({ previous, next }: { previous?: string; next?: string }) {
  const router = useRouter();
  useEffect(() => {
    const step = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target as HTMLElement | null;
      // Leave arrows to text fields, sliders and anything inside an open dialog.
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="slider"]') || document.querySelector('[role="dialog"]')) return;
      const href = event.key === 'ArrowLeft' ? previous : next;
      if (!href) return;
      event.preventDefault();
      router.push(href);
    };
    window.addEventListener('keydown', step);
    return () => window.removeEventListener('keydown', step);
  }, [previous, next, router]);
  useEffect(() => { for (const href of [previous, next]) if (href) router.prefetch(href); }, [previous, next, router]);
  return null;
}
