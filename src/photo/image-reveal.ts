'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Photographs below the fold arrive with a short rise and fade as they scroll
 * into view. One IntersectionObserver serves every tile; tiles already on
 * screen when the page loads are left exactly as painted, so nothing moves on
 * load, and the attribute is only ever added to tiles that are off screen.
 */
let observer: IntersectionObserver | null = null;
const reveal = (tile: Element) => { tile.setAttribute('data-reveal', 'in'); observer?.unobserve(tile); };
const observe = (tile: Element) => {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
  observer.observe(tile);
};

export function useImageReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const tile = ref.current;
    if (!tile || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (tile.getBoundingClientRect().top <= window.innerHeight) return;
    tile.setAttribute('data-reveal', 'pending');
    observe(tile);
    return () => { observer?.unobserve(tile); tile.removeAttribute('data-reveal'); };
  }, [ref]);
}
