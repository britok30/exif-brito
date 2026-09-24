/**
 * Public lists are built from the cached photo chunks, so a CDN copy for a
 * minute costs nothing in freshness that matters and spares every visit the
 * rebuild. A stale copy is served while the next one is prepared.
 */
export const PUBLIC_LIST_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';
