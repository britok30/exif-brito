'use client';

import { useEffect, useRef } from 'react';
import { motion, useAnimate, useInView, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { hasHydrated } from './hydration';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  delay?: number;
  y?: number;
  once?: boolean;
}

export function Reveal({ children, delay = 0, y = 12, once = true, ...rest }: RevealProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { once, margin: '0px 0px -24px 0px' });
  const reduceMotion = useReducedMotion();
  // Decided once, at mount: content the server already painted on screen is
  // never animated, however late the in-view observer reports it. Content
  // below the fold, or mounted after a client navigation, still reveals.
  const settled = useRef<boolean | null>(null);
  useEffect(() => {
    if (settled.current !== null) return;
    const rect = scope.current?.getBoundingClientRect();
    const onScreen = !!rect && rect.top < window.innerHeight && rect.bottom > 0;
    settled.current = onScreen && !hasHydrated();
  }, [scope]);

  useEffect(() => {
    if (!inView || reduceMotion || settled.current) return;
    const animation = animate(scope.current, { opacity: [0.8, 1], y: [y, 0] }, {
      duration: 0.95, delay, ease: [0.4, 0, 0.2, 1],
    });
    const element = scope.current;
    return () => {
      animation.stop();
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    };
  }, [inView, reduceMotion, animate, scope, y, delay]);

  // Content stays visible in server-rendered HTML and without JavaScript.
  return <motion.div ref={scope} {...rest}>{children}</motion.div>;
}
