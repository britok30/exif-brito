'use client';

import { RiExpandDiagonalLine } from 'react-icons/ri';
import { PhotoImage } from './PhotoImage';
import { usePhotoViewer } from './PhotoViewerProvider';

export function PhotoViewer({ id, imageKey, src, alt, title, width, height }: {
  id: string; imageKey: string; src: string; alt: string; title: string; width?: number; height?: number;
}) {
  const open = usePhotoViewer();
  return <button type="button" className="photo-viewer-trigger" aria-label={`Enlarge photograph: ${title}`} onClick={event => open?.(id, event)}>
    <PhotoImage imageKey={imageKey} src={src} alt={alt} width={width} height={height} fetchPriority="high" />
    <span className="photo-viewer-hint"><RiExpandDiagonalLine size={13} aria-hidden="true" />View photograph</span>
  </button>;
}
