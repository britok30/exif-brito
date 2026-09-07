import { photoMetadata, photoLabel } from '@/seo/metadata';
import { absoluteUrl, serializeJsonLd } from '@/seo/site';
import { imagePath } from '@/photo/url';
import { auth } from '@/auth';
import { EditPhotoButton } from '@/photo/EditPhotoButton';
import { PhotoFigure } from '@/photo/PhotoFigure';
import { GalleryFooter } from '@/components/gallery-footer';
import { PhotoViewer } from '@/photo/PhotoViewer';
import { PhotoViewerProvider } from '@/photo/PhotoViewerProvider';
import { viewerPhoto } from '@/photo/viewer-data';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { GalleryHeader } from '@/components/gallery-header';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Reveal } from '@/components/motion/reveal';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPhotoById, getPhotoIndex } from '@/photo/query';
import { withDisplayUrls } from '@/photo/url';
import { formatCaptureDate, formatExposureTime } from '@/photo/format';
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
  if (!photo || (photo.hidden && !session?.user)) notFound();
  const [archive, [image]] = await Promise.all([getPhotoIndex(), withDisplayUrls([photo])]);
  const index = archive.findIndex(item => item.id === photo.id);
  const previous = index >= 0 ? archive[index - 1] : undefined;
  const next = index >= 0 ? archive[index + 1] : undefined;
  const title = photo.title || photo.locationName || photo.tags?.[0] || 'Untitled';
  const specs = [
    ['Camera', [photo.make, photo.model].filter(Boolean).join(' ')],
    ['Lens', photo.lensModel || photo.lensMake],
    ['Focal length', photo.focalLength ? `${photo.focalLength}mm` : null],
    ['35mm equivalent', photo.focalLengthIn35mmFormat ? `${photo.focalLengthIn35mmFormat}mm` : null],
    ['Aperture', photo.fNumber ? `ƒ/${photo.fNumber}` : null],
    ['Shutter', formatExposureTime(photo.exposureTime)],
    ['Sensitivity', photo.iso ? `ISO ${photo.iso}` : null],
    ['Compensation', photo.exposureCompensation != null ? `${photo.exposureCompensation > 0 ? '+' : ''}${photo.exposureCompensation} EV` : null],
    ['Film', photo.film ? labelForFujifilmSimulation(photo.film) : null],
  ].filter(([, value]) => Boolean(value));
  const recipe = photo.recipeData as FujifilmRecipe | null;

  return (
    <PhotoViewerProvider photos={(photo.hidden ? [photo] : archive).map(viewerPhoto)}><main id="main" tabIndex={-1} className="flex-1">
      <GalleryHeader />
      <article className="photo-content">
        {!photo.hidden && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd({'@context':'https://schema.org','@type':'ImageObject',name:photoLabel(photo),description:photo.caption || photo.semanticDescription || undefined,url:absoluteUrl(`/p/${photo.id}`),contentUrl:absoluteUrl(imagePath(photo.thumbnailUrl || photo.url)),thumbnailUrl:absoluteUrl(imagePath(photo.thumbnailUrl || photo.url)),width:photo.width || undefined,height:photo.height || undefined,dateCreated:photo.takenAtNaive.slice(0,10),creator:{'@type':'Person',name:'Brito',url:absoluteUrl('/')},creditText:'Brito'})}} />}
        {session?.user && <div className="photo-owner-controls"><Link href="/admin/photos">Photo library</Link>{photo.hidden && <span>Hidden</span>}{rawSourceKey(photo.url) && <a href={`/api/photos/${photo.id}/source`}>Download RAW</a>}<EditPhotoButton photo={photo} previewUrl={image.displayUrl} /></div>}
        <Reveal y={12}><PhotoFigure>
          <PhotoViewer id={photo.id} imageKey={photo.thumbnailUrl || photo.url} src={image.imageSrc} title={title}
            alt={photo.semanticDescription || photo.caption || `${title} — photograph by Brito`}
            width={photo.width ?? undefined} height={photo.height ?? undefined} />
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
              {photo.tags.map(tag => <li key={tag}><Link className="text-sm text-foreground underline decoration-foreground underline-offset-4" href={`/?tag=${encodeURIComponent(tag)}#archive`}>{tag}</Link></li>)}
            </ul>}
          </div>
          {specs.length > 0 && <section aria-label="Capture details">
            <h2 className="gallery-label mb-5">Behind the frame</h2>
            <dl>{specs.map(([label, value]) => <div key={label} className="flex justify-between gap-6 border-t border-foreground py-3">
              <dt className="gallery-label shrink-0">{label}</dt><dd className="text-right text-sm">{value}</dd>
            </div>)}</dl>
            {photo.film && recipe?.whiteBalance && <div className="mt-6"><RecipeDialog film={photo.film} recipe={recipe} make={photo.make ?? undefined} /></div>}
          </section>}
        </Reveal>
        <nav aria-label="Browse photographs" className="photo-pagination">
          <div>{previous && <Link href={`/p/${previous.id}`} className="block"><span className="gallery-label"><ArrowLeft size={14} aria-hidden="true" />Previous photograph</span><p className="mt-2 text-xl">{previous.title || previous.locationName || previous.tags?.[0] || 'Untitled'}</p></Link>}</div>
          <div className="text-right">{next && <Link href={`/p/${next.id}`} className="block"><span className="gallery-label">Next photograph<ArrowRight size={14} aria-hidden="true" /></span><p className="mt-2 text-xl">{next.title || next.locationName || next.tags?.[0] || 'Untitled'}</p></Link>}</div>
        </nav>
      </article>
      <GalleryFooter />
    </main></PhotoViewerProvider>
  );
}
