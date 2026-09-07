'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { INSTANT, LAYOUT_TRANSITION } from '@/photo/PhotoTile';

/** Slides into its new position when surrounding content changes size, instead of jumping. */
export function Settle({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return <motion.div layout="position" className={className} transition={reduceMotion ? INSTANT : LAYOUT_TRANSITION}>{children}</motion.div>;
}
