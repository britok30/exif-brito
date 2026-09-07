'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { motion, useAnimate, useInView, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { hasHydrated } from './hydration';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  delay?: number;
  y?: number;
  once?: boolean;
}

/**
 * Content floats up as it appears. On first load the reveal is a CSS animation
 * (`.reveal-in`), so it starts at first paint rather than a second later when
 * hydration finishes on a large page. Anything not on screen at that moment
 * hands over to Motion and reveals when it scrolls into view or mounts after a
 * client navigation.
 */
export function Reveal({ children, delay = 0, y = 12, once = true, className, style, ...rest }: RevealProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { once, margin: '0px 0px -24px 0px' });
  const reduceMotion = useReducedMotion();
  // Decided once, at mount: on screen while the server-rendered page hydrates
  // means the CSS animation is already playing and Motion must stay out.
  const cssHandled = useRef<boolean | null>(null);
  useEffect(() => {
    if (cssHandled.current !== null) return;
    const element = scope.current;
    const rect = element?.getBoundingClientRect();
    const onScreen = !!rect && rect.top < window.innerHeight && rect.bottom > 0;
    cssHandled.current = onScreen && !hasHydrated();
    if (!cssHandled.current) element?.classList.remove('reveal-in');
  }, [scope]);

  useEffect(() => {
    if (!inView || reduceMotion || cssHandled.current !== false) return;
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
  return <motion.div ref={scope} className={`reveal-in${className ? ` ${className}` : ''}`}
    style={{ '--reveal-y': `${y}px`, '--reveal-delay': `${delay}s`, ...style } as CSSProperties} {...rest}>{children}</motion.div>;
}
