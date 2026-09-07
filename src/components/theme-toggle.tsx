'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme';

/**
 * Inlined in the document head (see layout) so it runs before first paint: a
 * saved choice wins, otherwise the system preference is followed. Rendered
 * inline on purpose; an external script arrives after the page has painted.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=s==='dark'||s==='light'?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=d}catch(e){}})()`;

function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  const swap = () => { root.dataset.theme = theme; };
  if (animate && 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // A hidden tab or a second click mid-fade skips the animation; the swap itself still happens.
    const transition = document.startViewTransition(swap);
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  } else {
    swap();
  }
}

/** "Light / Dark": the current side in ink, the other in grey. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    // Normally the boot script has already set the attribute; if this layout
    // was rendered on the client without it, resolve the theme here instead.
    if (!document.documentElement.dataset.theme) {
      let saved: string | null = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
      applyTheme(saved === 'dark' || saved === 'light' ? saved : media.matches ? 'dark' : 'light', false);
    }
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    // Follow the system while no explicit choice has been made.
    const follow = () => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      const next = media.matches ? 'dark' : 'light';
      applyTheme(next, false);
      setTheme(next);
    };
    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);

  const choose = (next: Theme) => {
    if (next === theme) return;
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    applyTheme(next, true);
    setTheme(next);
  };

  // The active side is also styled from the html attribute in CSS, so it is
  // correct in server-rendered HTML before this component hydrates.
  return <div className="slash-toggle theme-toggle" role="group" aria-label="Appearance">
    <button type="button" data-choice="light" aria-pressed={theme === 'light'} onClick={() => choose('light')}>Light</button>
    <span aria-hidden="true">/</span>
    <button type="button" data-choice="dark" aria-pressed={theme === 'dark'} onClick={() => choose('dark')}>Dark</button>
  </div>;
}
