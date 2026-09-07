import type { ReactNode } from 'react';
import { GalleryHeader } from '@/components/gallery-header';
import { StudioIntro } from '@/components/studio-intro';

/** A short, whole-page message (not found, error), shaped like every other page's opening. */
export function PageMessage({ label, title, note, actions }: { label: string; title: ReactNode; note?: ReactNode; actions: ReactNode }) {
  return <main id="main" tabIndex={-1} className="archive-page">
    <GalleryHeader />
    <StudioIntro label={label} title={title} note={note} actions={actions} />
    <div className="archive-content"><div className="archive-toolbar" aria-hidden="true" /></div>
  </main>;
}
