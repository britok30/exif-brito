'use client';

import { useRef, type ReactNode } from 'react';
import { useImageReveal } from './image-reveal';

/** Wraps any block containing an image so the image rises into view as it scrolls in. */
export function ImageReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useImageReveal(ref);
  return <div ref={ref} className={className}>{children}</div>;
}
