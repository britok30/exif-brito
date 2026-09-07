'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { labelForFujifilmSimulation } from '@/exif/fujifilm';
import { isLensApple, formatAppleLensText } from '@/platforms/apple';
import { cn } from '@/lib/utils';
import type { FacetKind, FacetValue, PhotoFacets } from './filters';

interface PhotoFacetsProps {
  facets: PhotoFacets;
}

interface SectionDef {
  kind: FacetKind;
  heading: string;
  values: FacetValue[];
  formatLabel?: (label: string) => string;
}

export function PhotoFacets({ facets }: PhotoFacetsProps) {
  const allSections: SectionDef[] = [
    { kind: 'year', heading: 'Years', values: facets.years },
    { kind: 'tag', heading: 'Subjects & places', values: facets.tags },
    {
      kind: 'film',
      heading: 'Films',
      values: facets.films,
      formatLabel: (label: string) => labelForFujifilmSimulation(label),
    },
    { kind: 'camera', heading: 'Cameras', values: facets.cameras },
    {
      kind: 'lens',
      heading: 'Lenses',
      values: facets.lenses,
      formatLabel: (label: string) =>
        isLensApple(label) ? formatAppleLensText(label) : label,
    },
  ];
  const sections = allSections.filter(s => s.values.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-5">
      {sections.map(section => (
        <FacetRow key={section.kind} section={section} />
      ))}
    </div>
  );
}

function FacetRow({ section }: { section: SectionDef }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeValue = searchParams.get(section.kind);
  const [expanded, setExpanded] = useState(false);
  const valuesId = useId();

  const buildHref = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (sp.get(section.kind) === value) {
      sp.delete(section.kind);
    } else {
      sp.set(section.kind, value);
    }
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="facet-section grid grid-cols-1 gap-x-6 gap-y-2 lg:grid-cols-[140px_1fr]">
      <h3 className="gallery-label facet-heading">
        <span className="facet-desktop-heading">{section.heading}</span>
        <button type="button" className="facet-toggle" aria-expanded={expanded} aria-controls={valuesId} onClick={() => setExpanded(value => !value)}>
          <span>{section.heading}{activeValue && <span className="facet-active-label">{section.formatLabel ? section.formatLabel(activeValue) : activeValue}</span>}</span>
          <ChevronDown size={16} strokeWidth={1.25} aria-hidden="true" />
        </button>
      </h3>
      <ul id={valuesId} data-expanded={expanded} className="facet-values flex flex-wrap items-baseline gap-x-5 gap-y-2">
        {section.values.map(({ value, label, count }) => {
          const display = section.formatLabel ? section.formatLabel(label) : label;
          const isActive = activeValue === value;
          return (
            <li key={value}>
              <Link
                href={buildHref(value)}
                scroll={false}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'facet-link group inline-flex min-h-11 items-center gap-2 text-xs transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'font-light',
                    isActive && 'underline decoration-foreground underline-offset-4',
                  )}
                >
                  {display}
                </span>
                <span className="text-[10px] text-foreground tabular-nums">
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
