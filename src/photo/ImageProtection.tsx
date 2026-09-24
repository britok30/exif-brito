'use client';

import { useEffect } from 'react';

/** Casual-save deterrents only; original-file protection lives on the server. */
export function ImageProtection() {
  useEffect(() => {
    // No "Save image as…" on any photograph, tiles included; a tile's caption
    // is a plain text link, so "Open in new tab" and "Copy link" live there.
    const protect = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const blocked = target.closest('img, .viewer-gesture-stage') ||
        (event.type === 'dragstart' && target.closest('a')?.querySelector('img'));
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
