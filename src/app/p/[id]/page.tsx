import { isOwner } from '@/security/owner';
import { photoMetadata, photoLabel } from '@/seo/metadata';
import { absoluteUrl, serializeJsonLd, SITE_NAME } from '@/seo/site';
import { imagePath } from '@/photo/url';
import { auth } from '@/auth';
import { EditPhotoButton } from '@/photo/EditPhotoButton';
import { PhotoFigure } from '@/photo/PhotoFigure';
import { GalleryFooter } from '@/components/gallery-footer';
import { MapPreview } from '@/components/map-preview';
import { PhotoViewer } from '@/photo/PhotoViewer';
import { PhotoViewerProvider } from '@/photo/PhotoViewerProvider';
import { PhotoKeyboardNav } from '@/photo/PhotoKeyboardNav';
import { viewerPhoto } from '@/photo/viewer-data';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { GalleryHeader } from '@/components/gallery-header';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/motion/reveal';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPhotoById, getPhotoIndex } from '@/photo/query';
import { formatCaptureDate, formatExposureTime } from '@/photo/format';
import { formatCameraName } from '@/photo/camera';
import { cameraOf, filterHref, lensLabel } from '@/photo/filters';
import { shortPhotoLocation } from '@/photo/location';
import { RecipeDialog } from '@/photo/RecipeDialog';
import { labelForFujifilmSimulation, type FujifilmRecipe } from '@/exif/fujifilm';
import { rawSourceKey } from '@/photo/raw-source';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
const findPhoto = cache(getPhotoById);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const photo = await findPhoto((await params).id);
  return photoMetadata(photo);
}

export default async function PhotoPage({ params }: Props) {
  const [photo, session] = await Promise.all([findPhoto((await params).id), auth()]);
  const owner = isOwner(session);
  if (!photo || (photo.hidden && !owner)) notFound();
  // Nothing is signed here: the page, the viewer and the owner's editor all use the stable proxy path.
  const archive = await getPhotoIndex();
  const index = archive.findIndex(item => item.id === photo.id);
  const previous = index >= 0 ? archive[index - 1] : undefined;
  const next = index >= 0 ? archive[index + 1] : undefined;
  const title = photo.title || photo.locationName || photo.tags?.[0] || 'Untitled';
  const imageSrc = imagePath(photo.thumbnailUrl || photo.url);
  const viewer = viewerPhoto({ ...photo, imageSrc, title, caption: photo.caption, semanticDescription: photo.semanticDescription || photo.caption || `${title} — photograph by Brito` });
  const camera = cameraOf(photo);
  const lens = photo.lensModel || photo.lensMake;
  const place = shortPhotoLocation(photo);
  // Camera, lens, focal length and film link to the gallery narrowed to that value.
  const specs: Array<[label: string, value: string | null | undefined, href?: string]> = [
    ['Camera', formatCameraName(photo.make, photo.model), camera && filterHref('camera', camera)],
    ['Lens', lens && lensLabel(lens), photo.lensModel ? filterHref('lens', photo.lensModel) : undefined],
    ['Focal length', photo.focalLength ? `${photo.focalLength}mm` : null, photo.focalLength ? filterHref('focal', photo.focalLength) : undefined],
    ['35mm equivalent', photo.focalLengthIn35mmFormat ? `${photo.focalLengthIn35mmFormat}mm` : null],
    ['Aperture', photo.fNumber ? `ƒ/${photo.fNumber}` : null],
    ['Shutter', formatExposureTime(photo.exposureTime)],
    ['Sensitivity', photo.iso ? `ISO ${photo.iso}` : null],
    ['Compensation', photo.exposureCompensation != null ? `${photo.exposureCompensation > 0 ? '+' : ''}${photo.exposureCompensation} EV` : null],
    ['Film', photo.film ? labelForFujifilmSimulation(photo.film) : null, photo.film ? filterHref('film', photo.film) : undefined],
  ];
  const shownSpecs = specs.filter(([, value]) => Boolean(value));
  const recipe = photo.recipeData as FujifilmRecipe | null;
  const pageUrl = absoluteUrl(`/p/${photo.id}`);
  const jsonLd = photo.hidden ? null : [{
    '@context': 'https://schema.org', '@type': 'Photograph', '@id': `${pageUrl}#photograph`,
    name: photoLabel(photo), url: pageUrl, description: photo.caption || photo.semanticDescription || undefined,
    dateCreated: photo.takenAtNaive.slice(0, 10), keywords: photo.tags?.length ? photo.tags.join(', ') : undefined,
    contentLocation: place ? { '@type': 'Place', name: photo.locationName || place } : undefined,
    creator: { '@type': 'Person', name: SITE_NAME, url: absoluteUrl('/') },
    image: {
      '@type': 'ImageObject', contentUrl: absoluteUrl(imageSrc), thumbnailUrl: absoluteUrl(`/og/${photo.id}?v=3`),
      width: photo.width || undefined, height: photo.height || undefined,
      caption: photo.semanticDescription || photo.caption || undefined,
      creator: { '@type': 'Person', name: SITE_NAME }, creditText: SITE_NAME,
      copyrightHolder: { '@type': 'Person', name: SITE_NAME }, copyrightNotice: `© ${photo.takenAtNaive.slice(0, 4)} ${SITE_NAME}. All rights reserved.`,
      exifData: shownSpecs.map(([name, value]) => ({ '@type': 'PropertyValue', name, value })),
    },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Photographs', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: photoLabel(photo), item: pageUrl },
    ],
  }];

  return (
    <PhotoViewerProvider listUrl={photo.hidden ? null : '/api/viewer'} seed={[viewer]}><main id="main" tabIndex={-1} className="flex-1">
      <PhotoKeyboardNav previous={previous && `/p/${previous.id}`} next={next && `/p/${next.id}`} />
      <GalleryHeader />
      <article className="photo-content">
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />}
        {owner && <div className="photo-owner-controls"><Link href="/admin/photos">Photo library</Link>{photo.hidden && <span>Hidden</span>}{rawSourceKey(photo.url) && <a href={`/api/photos/${photo.id}/source`}>Download RAW</a>}<EditPhotoButton photo={{ id: photo.id, title: photo.title, caption: photo.caption, locationName: photo.locationName, tags: photo.tags, hidden: photo.hidden }} previewUrl={imageSrc} /></div>}
        <Reveal y={12}><PhotoFigure>
          <PhotoViewer photo={viewer} hidden={!!photo.hidden} />
          <figcaption className="mt-4 flex justify-between gap-4 gallery-label">
            <span>{photo.locationName || photo.tags?.[0] || 'Photograph'} · {formatCaptureDate(photo)}</span>
            <span className="shrink-0">{index >= 0 ? `${String(index + 1).padStart(2, '0')} / ${String(archive.length).padStart(2, '0')}` : 'Private photograph'}</span>
          </figcaption>
        </PhotoFigure></Reveal>
        <Reveal className="grid gap-12 py-14 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="gallery-label">Brito</p>
            <h1 className="photo-title">{title}</h1>
            {photo.caption && <p className="mt-6 max-w-xl whitespace-pre-line text-sm leading-relaxed text-foreground">{photo.caption}</p>}
            {photo.tags && photo.tags.length > 0 && <ul aria-label="Subjects and places" className="mt-8 flex flex-wrap gap-4">
              {photo.tags.map(tag => <li key={tag}><Link className="inline-block py-2 -my-2 text-sm text-foreground underline decoration-foreground underline-offset-4" href={filterHref('tag', tag)}>{tag}</Link></li>)}
            </ul>}
          </div>
          {shownSpecs.length > 0 && <section aria-label="Capture details">
            <h2 className="gallery-label mb-5">Behind the frame</h2>
            <dl>{shownSpecs.map(([label, value, href]) => <div key={label} className="flex justify-between gap-6 border-t border-foreground py-3">
              <dt className="gallery-label shrink-0">{label}</dt>
              <dd className="text-right text-sm">{href ? <Link href={href} className="underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground">{value}</Link> : value}</dd>
            </div>)}</dl>
            {photo.film && recipe?.whiteBalance && <div className="mt-6"><RecipeDialog film={photo.film} recipe={recipe} make={photo.make ?? undefined} trigger={<span className="text-sm underline decoration-foreground underline-offset-4">View film recipe</span>} /></div>}
          </section>}
        </Reveal>
        {photo.latitude != null && photo.longitude != null && <Reveal className="pb-14">
          <section aria-labelledby="photo-map-heading">
            <div className="mb-5 flex items-baseline justify-between gap-6">
              <h2 id="photo-map-heading" className="gallery-label">Where</h2>
              {place && <Link href={filterHref('place', place)} className="text-sm underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground">More from {place}</Link>}
            </div>
            <MapPreview latitude={photo.latitude} longitude={photo.longitude} label={place || title} />
          </section>
        </Reveal>}
        <nav aria-label="Browse photographs" className="photo-pagination">
          <div>{previous && <Link href={`/p/${previous.id}`} className="block"><span className="gallery-label"><ArrowLeft size={14} aria-hidden="true" />Previous photograph</span><p className="mt-2 text-xl">{previous.title || previous.locationName || previous.tags?.[0] || 'Untitled'}</p></Link>}</div>
          <div className="text-right">{next && <Link href={`/p/${next.id}`} className="block"><span className="gallery-label">Next photograph<ArrowRight size={14} aria-hidden="true" /></span><p className="mt-2 text-xl">{next.title || next.locationName || next.tags?.[0] || 'Untitled'}</p></Link>}</div>
        </nav>
      </article>
      <GalleryFooter />
    </main></PhotoViewerProvider>
  );
}
