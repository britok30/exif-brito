'use client';

import { Suspense, createContext, useContext, type ComponentType, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

export type SearchParamsLike = Pick<URLSearchParams, 'get' | 'toString'>;

const NONE: SearchParamsLike = new URLSearchParams();

const RenderedPerRequest = createContext(false);

/**
 * Marks a subtree as rendered per request (the /live routes, the studio). There
 * `useSearchParams` still suspends while the query streams in, and a boundary
 * would send the fallback grid and the real one; without it the shell simply
 * waits for the query, as it always did.
 */
export function PerRequestSearchParams({ children }: { children: ReactNode }) {
  return <RenderedPerRequest.Provider value>{children}</RenderedPerRequest.Provider>;
}

/**
 * Gives a component the URL's search params without costing a static page its
 * server HTML. On a statically rendered page `useSearchParams` suspends to the
 * nearest boundary, so the fallback renders the component as if the query were
 * empty — the unfiltered grid every crawler and first paint should see — and
 * the real params take over on the client. Per-request pages opt out below.
 */
export function withSearchParams<Props extends { search: SearchParamsLike }>(View: ComponentType<Props>) {
  type Outer = Omit<Props, 'search'>;
  const render = (props: Outer, search: SearchParamsLike) => <View {...(props as Props)} search={search} />;
  function Live(props: Outer) {
    return render(props, useSearchParams());
  }
  function WithSearchParams(props: Outer) {
    if (useContext(RenderedPerRequest)) return <Live {...props} />;
    return <Suspense fallback={render(props, NONE)}><Live {...props} /></Suspense>;
  }
  WithSearchParams.displayName = `withSearchParams(${View.displayName || View.name || 'View'})`;
  return WithSearchParams;
}
