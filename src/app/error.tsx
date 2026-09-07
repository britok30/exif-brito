'use client';

import { PageMessage } from '@/components/page-message';

export default function ErrorPage({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <PageMessage label="A brief interruption" title="We couldn’t load this view." note={<>Please try again<br />in a moment.</>}
    actions={<button className="studio-button primary" onClick={unstable_retry}>Try again</button>} />;
}
