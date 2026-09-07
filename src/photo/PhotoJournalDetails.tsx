'use client';

import type { GalleryPhoto } from './gallery-photo';
import { PhotoMark } from '@/components/icons/photo-mark';
import { RecipeDialog } from './RecipeDialog';
import { labelForFujifilmSimulation } from '@/exif/fujifilm';
import { formatAppleLensText, isLensApple } from '@/platforms/apple';
import { shortPhotoLocation } from './location';
import { formatExposureTime } from './format';
import { RiExpandDiagonalLine } from 'react-icons/ri';
import { SharePhotoButton } from './SharePhotoButton';
import { usePhotoViewer } from './PhotoViewerProvider';

const formatExposure = (photo: GalleryPhoto) =>
  [
    photo.focalLength && `${photo.focalLength}mm`,
    photo.fNumber && `ƒ/${photo.fNumber}`,
    formatExposureTime(photo.exposureTime),
    photo.iso && `ISO ${photo.iso}`,
  ]
    .filter(Boolean)
    .join(' · ');

const formatLens = (photo: GalleryPhoto) => {
  if (!photo.lensModel) return photo.lensMake ?? undefined;
  return isLensApple(photo.lensModel)
    ? formatAppleLensText(photo.lensModel)
    : photo.lensModel;
};

const formatCamera = (photo: GalleryPhoto) =>
  [photo.make, photo.model].filter(Boolean).join(' ') || undefined;

export function PhotoJournalDetails({ photo }: { photo: GalleryPhoto }) {
  const open = usePhotoViewer();
  const camera = formatCamera(photo);
  const lens = formatLens(photo);
  const exposure = formatExposure(photo);

  const specs: Array<{ label: string; value: string }> = [];
  if (camera) specs.push({ label: 'Camera', value: camera });
  if (lens) specs.push({ label: 'Lens', value: lens });
  if (exposure) specs.push({ label: 'Exposure', value: exposure });
  const place = shortPhotoLocation(photo);
  if (place) specs.push({ label: 'Location', value: place });

  const filmLabel = photo.film
    ? labelForFujifilmSimulation(photo.film)
    : undefined;

  return (
    <div className="journal-details">
        {photo.caption && (
          <p className="mt-6 text-sm leading-relaxed text-foreground">
            {photo.caption}
          </p>
        )}

        {(specs.length > 0 || photo.make || photo.film) && (
          <div className="mt-8 space-y-4">
            {photo.film && photo.hasRecipe ? (
              <RecipeDialog
                film={photo.film}
                photoId={photo.id}
                make={photo.make ?? undefined}
              />
            ) : (
              <div className="flex items-center gap-2">
                <PhotoMark
                  make={photo.make ?? undefined}
                  film={photo.film ?? undefined}
                  height={16}
                  className="text-foreground"
                />
                {filmLabel && (
                  <span className="text-sm tracking-tight font-light text-foreground">
                    {filmLabel}
                  </span>
                )}
              </div>
            )}

            {specs.length > 0 && (
              <dl className="space-y-2 pt-1">
                {specs.map(spec => (
                  <SpecRow key={spec.label} label={spec.label} value={spec.value} />
                ))}
              </dl>
            )}
          </div>
        )}

      <div className="journal-photo-actions">
        <button type="button" className="photo-action-button" aria-label="Enlarge photograph" title="Enlarge photograph" onClick={event => open?.(photo.id, event)}><RiExpandDiagonalLine size={18} aria-hidden="true" /></button>
        {!photo.hidden && <SharePhotoButton id={photo.id} title={photo.title || shortPhotoLocation(photo) || 'Photograph by Brito'} />}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-baseline gap-x-6 gap-y-1 text-sm">
      <dt className="gallery-label whitespace-nowrap">
        {label}
      </dt>
      <dd className="min-w-0 text-right font-light text-foreground [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
