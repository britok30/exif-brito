'use client';

import { useEffect, useRef } from 'react';

export function useImageWidth() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const host = ref.current;
    const image = host?.querySelector('img');
    if (!host || !image) return;
    const measure = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const width = Math.min(image.clientWidth, image.clientHeight * image.naturalWidth / image.naturalHeight);
      if (width > 0) host.style.setProperty('--photo-width', `${width}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(image);
    image.addEventListener('load', measure);
    measure();
    return () => { observer.disconnect(); image.removeEventListener('load', measure); };
  }, []);
  return ref;
}
