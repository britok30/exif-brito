'use client';

import { useEffect } from 'react';

/** Casual-save deterrents only; original-file protection lives on the server. */
export function ImageProtection() {
  useEffect(() => {
    const protect = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && (target.closest('img, .viewer-gesture-stage') ||
        (event.type === 'dragstart' && target.closest('a')?.querySelector('img')))) {
        event.preventDefault();
      }
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
