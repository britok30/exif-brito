'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, type CSSProperties } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import type { Photo } from '@/db';
import { LibrarySelectPhoto } from './LibrarySelection';
import { DeletePhotoButton } from './DeletePhotoButton';
import { PhotoJournalDetails } from './PhotoJournalDetails';
import { EditPhotoButton } from './EditPhotoButton';
import { shortPhotoLocation } from './location';
import { formatCaptureDate } from './format';
import { usePhotoViewer } from './PhotoViewerProvider';

interface PhotoTileProps {
  photo: Photo;
  imageSrc: string;
  priority?: boolean;
  isAdmin?: boolean;
  journal?: boolean;
}

// Rendered widths per layout, so the browser fetches a fitting rendition
// instead of the 2560px display copy. In the grid a portrait sits inside a
// 4:5 stage, so its width is a fraction of the cell (see .archive-photo-frame).
const gridSizes = (ratio: number) => {
  const share = Math.min(1, 1.25 * ratio).toFixed(2);
  return `(max-width: 540px) calc(100vw - 40px), (max-width: 900px) calc((100vw - 84px) / 2 * ${share}), (min-width: 1800px) calc((100vw - 240px) / 4 * ${share}), calc((100vw - 192px) / 3 * ${share})`;
};
const JOURNAL_SIZES = '(max-width: 700px) calc(100vw - 40px), (max-width: 900px) 50vw, 58vw';

export const LAYOUT_TRANSITION = { duration: 0.85, ease: [0.4, 0, 0.2, 1] as const };
export const INSTANT = { duration: 0 };

export function PhotoTile({ photo, imageSrc, priority, isAdmin, journal = false }: PhotoTileProps) {
  const openViewer = usePhotoViewer();
  const tile = useRef<HTMLElement>(null);
  // Only tiles within a few screens of the viewport morph between layouts; the
  // hundreds further away settle instantly, out of sight. Motion reads `layout`
  // once at mount, so the prop stays constant and the transition does the gating.
  const near = useInView(tile, { margin: '300% 0px 300% 0px' });
  const reduceMotion = useReducedMotion();
  const transition = near && !reduceMotion ? LAYOUT_TRANSITION : INSTANT;
  const place = shortPhotoLocation(photo);
  const label = photo.title || place || 'Untitled';
  const ratio = photo.width && photo.height ? photo.width / photo.height : photo.aspectRatio ?? 1.5;
  const remote = !imageSrc.startsWith('/');
  return <article ref={tile} className="archive-tile" data-photo-id={photo.id} style={{ '--ratio': ratio } as CSSProperties}>
    <div className="collection-image">
      <Link href={`/p/${photo.id}`} className="archive-photo-link" aria-label={`View ${label}`} onClick={event => openViewer?.(photo.id, event)}>
        <div className="archive-photo-stage">
          {/* The frame is exactly the painted photograph, so a layout animation scales it uniformly. */}
          <motion.div layout className="archive-photo-frame" transition={transition}>
            <Image src={imageSrc} alt={photo.semanticDescription || photo.title || photo.caption || `Photograph${place ? ` in ${place}` : ''} by Brito`}
              fill sizes={journal ? JOURNAL_SIZES : gridSizes(ratio)} quality={80} priority={priority} unoptimized={remote}
              placeholder={photo.blurData ? 'blur' : 'empty'} blurDataURL={photo.blurData ?? undefined} />
          </motion.div>
        </div>
      </Link>
    </div>
    <motion.div layout="position" className="collection-caption" transition={transition}>
      {isAdmin && photo.hidden && <LibrarySelectPhoto id={photo.id} label={label} />}
      <div className="archive-photo-caption">
        <Link href={`/p/${photo.id}`}><h3>{label}</h3></Link>
        <time dateTime={photo.takenAtNaive.slice(0, 10)} title={formatCaptureDate(photo)}>{photo.takenAtNaive.slice(5, 10).replace('-', '.')}</time>
      </div>
      {photo.title && place && <p className="archive-photo-place">{place}</p>}
      <AnimatePresence initial={false} mode="popLayout">
        {/* Details appear only after the photographs have settled, and vanish the moment the grid returns. */}
        {journal && <motion.div key="details" initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : LAYOUT_TRANSITION.duration } }}
          exit={{ opacity: 0, transition: { duration: 0 } }}><PhotoJournalDetails photo={photo} /></motion.div>}
      </AnimatePresence>
      {isAdmin && <div className="archive-photo-admin"><EditPhotoButton photo={photo} previewUrl={imageSrc} /><DeletePhotoButton id={photo.id} title={photo.title ?? undefined} /></div>}
    </motion.div>
  </article>;
}
