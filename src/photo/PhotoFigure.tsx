'use client';
import type { ReactNode } from 'react';
import { useImageWidth } from './use-image-width';
export function PhotoFigure({ children }: { children: ReactNode }) {
  const ref = useImageWidth();
  return <figure ref={ref} className="photo-figure">{children}</figure>;
}
