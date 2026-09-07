'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SignInForm({ action, initialError }: {
  action: (previous: { error: string }, formData: FormData) => Promise<{ error: string }>;
  initialError?: string;
}) {
  const [state, submit, pending] = useActionState(action, { error: initialError || '' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  return <form action={submit} className="studio-sign-in-form">
    <fieldset disabled={pending}>
      <label htmlFor="email">Email address</label>
      <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} autoCapitalize="none" spellCheck={false} />
      <label htmlFor="password">Password</label>
      <div className="sign-in-password"><Input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
        <button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>
          {visible ? <EyeOff size={17} strokeWidth={1.25} /> : <Eye size={17} strokeWidth={1.25} />}
        </button>
      </div>
    </fieldset>
    {state.error && <p className="sign-in-error" role="alert">{state.error}</p>}
    <button className="studio-button primary sign-in-submit" disabled={pending} aria-live="polite">{pending ? 'Signing in…' : 'Enter Studio'}<ArrowRight size={15} aria-hidden="true" /></button>
  </form>;
}
