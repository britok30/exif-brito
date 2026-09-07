'use client';

import { useState, type ComponentProps } from 'react';

/** Keep the rendered image when a metadata refresh renews its signed URL. */
export function PhotoImage({ imageKey, src, onError, ...props }: Omit<ComponentProps<'img'>, 'src'> & {
  imageKey: string;
  src: string;
}) {
  const [source, setSource] = useState({ imageKey, src, failed: false });
  const changedImage = source.imageKey !== imageKey || (source.failed && source.src !== src);
  if (changedImage) setSource({ imageKey, src, failed: false });

  // Storage keys are immutable. Retry an expired, not-yet-loaded rendition with
  // the latest signature, without replacing photographs already on screen.
  return <img {...props} src={changedImage ? src : source.src} onError={event => {
    setSource({ imageKey, src, failed: source.src === src });
    onError?.(event);
  }} />;
}
