import Link from 'next/link';
import { PageMessage } from '@/components/page-message';

export default function PhotoNotFound() {
  return <PageMessage label="Photograph not found" title="This photograph isn’t on view." note={<>It may have been removed,<br />or kept private.</>}
    actions={<Link href="/#archive" className="studio-button">Return to gallery</Link>} />;
}
