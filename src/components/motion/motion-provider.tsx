'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}>
    <div className="flex flex-1 flex-col">{children}</div>
  </MotionConfig>;
}
