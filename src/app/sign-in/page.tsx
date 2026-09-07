import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { GalleryHeader } from '@/components/gallery-header';
import { StudioIntro } from '@/components/studio-intro';
import { SignInForm } from './sign-in-form';

export const metadata = { title: 'Studio sign in', robots: { index: false, follow: false } };
const failure = 'We couldn’t sign you in. Check your email and password, then try again.';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const callback = params.callbackUrl;
  const redirectTo = callback?.startsWith('/') && !callback.startsWith('//') && !callback.includes('\\') ? callback : '/admin/photos';
  async function signInAction(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
    'use server';
    try {
      await signIn('credentials', { email: formData.get('email'), password: formData.get('password'), redirectTo });
      return { error: '' };
    } catch (error) {
      if (error instanceof AuthError) return { error: failure };
      throw error;
    }
  }
  return <main id="main" tabIndex={-1} className="archive-page">
    <GalleryHeader />
    <StudioIntro label="Private studio" title={<>Your private<br />studio.</>} note={<>A quiet space for your photographs.<br />Sign in to upload, edit, and publish.</>} />
    <section className="archive-content" aria-label="Sign in">
      <header className="archive-toolbar"><p>Sign in</p><span className="archive-total">Studio access</span><span /></header>
      <SignInForm action={signInAction} initialError={params.error ? failure : undefined} />
    </section>
  </main>;
}
