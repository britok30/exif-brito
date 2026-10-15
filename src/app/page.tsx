import { HomeGallery, homeMetadata } from '@/photo/HomeGallery';

/**
 * The public, unfiltered gallery: rendered once and served from cache until a
 * photograph changes (every cached photo query carries the photos tag). Owner
 * sessions and filtered views (?camera=, ?year=, …) are rewritten to /live in
 * next.config.ts before the cache, so nothing here depends on the request.
 */
export const generateMetadata = () => homeMetadata({});

export default function HomePage() {
  return <HomeGallery filter={{}} isAdmin={false} />;
}
