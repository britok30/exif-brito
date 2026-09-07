import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion/reveal';

/**
 * The opening of every studio page, shaped like the gallery's own intro:
 * a small label, one large title, and a quiet aside on the right for a note
 * or the page's primary actions.
 */
export function StudioIntro({ label = 'Private studio', title, note, actions }: {
  label?: string; title: ReactNode; note?: ReactNode; actions?: ReactNode;
}) {
  return <Reveal className="gallery-intro studio-intro" y={12}>
    <div><p className="gallery-label">{label}</p><h1>{title}</h1></div>
    {(note || actions) && <div className="studio-intro-aside">
      {note && <p className="gallery-intro-note">{note}</p>}
      {actions && <div className="studio-intro-actions">{actions}</div>}
    </div>}
  </Reveal>;
}
