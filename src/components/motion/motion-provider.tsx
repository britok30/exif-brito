'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig, useAnimate, useReducedMotion } from 'motion/react';
import { hasHydrated, markHydrated } from './hydration';

function PageEntrance({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // The server-rendered page is already on screen; only client navigations fade in.
    if (!hasHydrated()) { markHydrated(); return; }
    if (reduceMotion) return;
    const animation = animate(scope.current, { opacity: [0.75, 1] }, { duration: 0.8, ease: [0.4, 0, 0.2, 1] });
    const element = scope.current;
    return () => {
      animation.stop();
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    };
  }, [pathname, reduceMotion, animate, scope]);

  // `.page-in` fades the first paint in with CSS; Motion handles later client navigations.
  return <div ref={scope} className="page-in flex flex-1 flex-col">{children}</div>;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}>
    <PageEntrance>{children}</PageEntrance>
  </MotionConfig>;
}
