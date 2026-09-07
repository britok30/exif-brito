'use client';

import { useState } from 'react';
import { TbPhotoShare } from 'react-icons/tb';
import { absoluteUrl } from '@/seo/site';

export function SharePhotoButton({ id, title }: { id: string; title: string }) {
  const [message, setMessage] = useState('');
  const [fallback, setFallback] = useState(false);
  const url = absoluteUrl(`/p/${id}`);
  async function share() {
    setMessage('');
    setFallback(false);
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage('Link copied');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setFallback(true);
      setMessage('Copy this link to share');
    }
  }
  return <span className="photo-share-control">
    <button type="button" className="photo-action-button" aria-label="Share photograph" title="Share photograph" onClick={share}>
      <TbPhotoShare size={19} aria-hidden="true" />
    </button>
    <span className="photo-share-status" role="status">{message}</span>
    {fallback && <input aria-label="Photograph share link" value={url} readOnly onFocus={event => event.target.select()} />}
  </span>;
}
