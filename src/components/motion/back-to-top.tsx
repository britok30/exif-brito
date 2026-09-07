'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const reduceMotion = useReducedMotion();
  const animation = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    const stop = () => animation.current?.stop();
    const onKey = (event: KeyboardEvent) => {
      if (['Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stop();
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('pointerdown', stop, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      stop();
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('pointerdown', stop);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  function scrollToTop(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    animation.current?.stop();
    const finish = () => document.getElementById('main')?.focus({ preventScroll: true });
    if (reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      finish();
      return;
    }
    const distance = window.scrollY;
    animation.current = animate(distance, 0, {
      // Longer journeys get more time, with a gentle start and finish.
      duration: Math.min(3.8, 1.8 + distance / 4500),
      ease: [0.42, 0, 0.25, 1],
      onUpdate: top => window.scrollTo({ top, behavior: 'instant' }),
      onComplete: finish,
    });
  }

  return <motion.a href="#main" onClick={scrollToTop} className="inline-flex items-center gap-2"
    whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { y: 0 }}>
    Back to top <ArrowUp size={13} strokeWidth={1.5} aria-hidden="true" />
  </motion.a>;
}
