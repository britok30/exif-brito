import Link from 'next/link';
import { PageMessage } from '@/components/page-message';

export default function NotFound() {
  return <PageMessage label="Page not found" title="This page isn’t on view." note={<>The address may have changed,<br />or never existed.</>}
    actions={<Link href="/#archive" className="studio-button">Return to gallery</Link>} />;
}
