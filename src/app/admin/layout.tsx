import './studio.css';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isOwner } from '@/security/owner';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isOwner(await auth())) redirect('/sign-in?callbackUrl=%2Fadmin');
  return children;
}
