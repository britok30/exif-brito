'use client';

import { useEffect } from 'react';

/** Casual-save deterrents only; original-file protection lives on the server. */
export function ImageProtection() {
  useEffect(() => {
    // The context menu is withheld only on an image that is not a link, so a
    // tile keeps "Open in new tab" and "Copy link"; dragging is always withheld.
    const protect = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const blocked = event.type === 'dragstart'
        ? target.closest('img, .viewer-gesture-stage') || target.closest('a')?.querySelector('img')
        : target.closest('img') && !target.closest('a');
      if (blocked) event.preventDefault();
    };
    document.addEventListener('contextmenu', protect, true);
    document.addEventListener('dragstart', protect, true);
    return () => {
      document.removeEventListener('contextmenu', protect, true);
      document.removeEventListener('dragstart', protect, true);
    };
  }, []);
  return null;
}
