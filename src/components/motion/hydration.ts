/**
 * Entrance animations are skipped for content that was already painted by the
 * server: on a large page hydration lands a second or more after first paint,
 * and fading in then reads as a glitch. Once hydration has completed, anything
 * that mounts later (client navigations, content scrolled into view) animates.
 */
let hydrated = false;
export const hasHydrated = () => hydrated;
export function markHydrated() {
  if (hydrated) return;
  // Two frames: child effects that ran during hydration have all seen `false`.
  requestAnimationFrame(() => requestAnimationFrame(() => { hydrated = true; }));
}
