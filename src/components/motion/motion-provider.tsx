'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MotionConfig, useAnimate, useReducedMotion } from 'motion/react';

function PageEntrance({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const animation = animate(scope.current, { opacity: [0.75, 1] }, { duration: 0.8, ease: [0.4, 0, 0.2, 1] });
    const element = scope.current;
    return () => {
      animation.stop();
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    };
  }, [pathname, reduceMotion, animate, scope]);

  return <div ref={scope} className="flex flex-1 flex-col">{children}</div>;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}>
    <PageEntrance>{children}</PageEntrance>
  </MotionConfig>;
}
