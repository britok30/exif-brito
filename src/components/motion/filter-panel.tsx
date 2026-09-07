'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export function FilterPanel({ children, defaultOpen = false }: { children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const reduceMotion = useReducedMotion();
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);

  return <div className="archive-filters">
    <button className="flex w-fit items-center gap-6 py-2 text-[11px]" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls={id}>
      Explore photographs
      <motion.span aria-hidden="true" animate={{ rotate: open ? 45 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.45 }}>+</motion.span>
    </button>
    <AnimatePresence initial={false}>
      {open && <motion.div id={id} key="filters" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.6 }} className="overflow-hidden">
        {children}
      </motion.div>}
    </AnimatePresence>
  </div>;
}
