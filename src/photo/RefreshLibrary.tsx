'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Re-reads the library from the database, for photographs imported outside the app. */
export function RefreshLibrary() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  async function refresh() {
    if (state === 'busy') return;
    setState('busy');
    try {
      const response = await fetch('/api/photos/revalidate', { method: 'POST' });
      if (!response.ok) throw new Error();
      router.refresh();
      setState('done');
    } catch { setState('failed'); }
  }
  return <button type="button" className="library-clear" disabled={state === 'busy'} onClick={refresh} aria-live="polite">
    {state === 'busy' ? 'Refreshing…' : state === 'done' ? 'Refreshed' : state === 'failed' ? 'Couldn’t refresh, try again' : 'Refresh from database'}
  </button>;
}
