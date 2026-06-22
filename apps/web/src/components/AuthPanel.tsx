'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '../hooks/useAuthSession';

export default function AuthPanel() {
  const router = useRouter();
  const { session, loading, signInWithPassword, signOut } = useAuthSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    const { error: signInError } = await signInWithPassword(username.trim(), password);
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="auth-card">
        <div className="auth-card-header">
          <h2>Loading…</h2>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="auth-card">
        <div className="auth-card-header">
          <h2>Signed in</h2>
          <p>{session.user.email}</p>
        </div>
        <button className="auth-secondary" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <Image src="/assetcues-logo.png" alt="AssetCues" width={130} height={32} priority />
      </div>
      <div className="auth-card-header">
        <p className="auth-eyebrow">Internal Portal</p>
        <h2>Welcome back</h2>
        <p className="auth-subtitle">Sign in to the Assetcues SLA support console.</p>
      </div>

      <form className="auth-form" onSubmit={handleSignIn}>
        <label className="auth-field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            placeholder="tejasjagdale"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button className="auth-primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {error ? <p className="auth-error">{error}</p> : null}
    </div>
  );
}
