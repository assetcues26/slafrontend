'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace('/dashboard'), 1600);
  };

  return (
    <main className="landing landing-callback">
      <div className="auth-card">
        <div className="auth-brand">
          <Image src="/assetcues-logo.png" alt="AssetCues" width={130} height={32} priority />
        </div>
        <div className="auth-card-header">
          <p className="auth-eyebrow">Account recovery</p>
          <h2>Set a new password</h2>
          <p className="auth-subtitle">Choose a new password to regain access to your account.</p>
        </div>

        {done ? (
          <p className="auth-success">Password updated. Redirecting to your dashboard…</p>
        ) : !ready ? (
          <p className="auth-subtitle">
            Validating your reset link… If this doesn&apos;t change shortly, request a fresh link from
            an administrator.
          </p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label className="auth-field">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
            <button className="auth-primary" type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    </main>
  );
}
