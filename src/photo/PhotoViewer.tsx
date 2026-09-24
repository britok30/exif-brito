'use client';

import Image from 'next/image';
import { Maximize2 } from 'lucide-react';
import { usePhotoViewer } from './PhotoViewerProvider';
import type { ViewerPhoto } from './viewer-data';

/**
 * The photograph page's main image, and its LCP: an optimised rendition sized
 * to the frame (at most 74svh tall), preloaded, rather than the 2560px display
 * copy. The viewer still opens the full display copy for zooming.
 */
export function PhotoViewer({ photo, hidden }: { photo: ViewerPhoto; hidden?: boolean }) {
  const open = usePhotoViewer();
  const ratio = photo.width / photo.height;
  return <button type="button" className="photo-viewer-trigger" aria-label={`Enlarge photograph: ${photo.title}`} onClick={event => open?.(photo.id, event, photo)}>
    <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} quality={80} preload
      sizes={`min(100vw, ${Math.ceil(74 * ratio)}vh)`} unoptimized={hidden || !photo.src.startsWith('/')} />
    <span className="photo-viewer-hint"><Maximize2 size={13} strokeWidth={1.25} aria-hidden="true" />View photograph</span>
  </button>;
}
