'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '../hooks/useAuthSession';

type AuthMode = 'signin' | 'signup' | 'confirm';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function AuthPanel() {
  const router = useRouter();
  const {
    session,
    loading,
    signInWithGoogle,
    signInWithPassword,
    signUp,
    verifySignupOtp,
    resendSignupEmail,
    signOut,
  } = useAuthSession();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [showOtp, setShowOtp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const resetMessages = () => {
    setMessage('');
    setError('');
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    resetMessages();
    setBusy(true);
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/dashboard');
  };

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();
    resetMessages();

    const normalizedUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setError('Username must be 3–20 characters: lowercase letters, numbers, underscore.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    const { error: signUpError } = await signUp({
      email: email.trim(),
      password,
      username: normalizedUsername,
      fullName: fullName.trim(),
    });
    setBusy(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMode('confirm');
    setShowOtp(false);
    setMessage(
      'Check your email and click the confirmation link. After confirming, return here and sign in with your password.',
    );
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    resetMessages();
    if (otp.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setBusy(true);
    const { error: verifyError } = await verifySignupOtp(email.trim(), otp.trim());
    setBusy(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setMessage('Account verified. Redirecting to dashboard…');
    router.push('/dashboard');
  };

  const handleResendEmail = async () => {
    resetMessages();
    setBusy(true);
    const { error: resendError } = await resendSignupEmail(email.trim());
    setBusy(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setMessage('Confirmation email sent again. Check your inbox.');
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
        <h2>
          {mode === 'confirm'
            ? 'Confirm your email'
            : mode === 'signup'
              ? 'Create your account'
              : 'Welcome back'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'confirm'
            ? 'Supabase sends a confirmation link by default. Click it, then sign in.'
            : 'Team management console for SLA-driven support workflows.'}
        </p>
      </div>

      {mode === 'signin' ? (
        <form className="auth-form" onSubmit={handleSignIn}>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="tejasjagdale"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
      ) : null}

      {false && mode === 'signup' ? (
        <form className="auth-form" onSubmit={handleSignUp}>
          <label className="auth-field">
            <span>Full name</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              placeholder="jane_doe"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      ) : null}

      {mode === 'confirm' ? (
        <div className="auth-form">
          <div className="auth-confirm-steps">
            <p><strong>1.</strong> Open the email we sent to <strong>{email}</strong></p>
            <p><strong>2.</strong> Click <strong>Confirm your mail</strong> (or the confirmation link)</p>
            <p><strong>3.</strong> Come back here and sign in with your password</p>
          </div>
          <button
            className="auth-primary"
            type="button"
            onClick={() => {
              setMode('signin');
              resetMessages();
              setMessage('Email confirmed? Sign in with your password below.');
            }}
          >
            I confirmed — sign in
          </button>
          <button className="auth-link" type="button" onClick={handleResendEmail} disabled={busy}>
            Resend confirmation email
          </button>
          <button
            className="auth-link"
            type="button"
            onClick={() => setShowOtp((value) => !value)}
          >
            {showOtp ? 'Hide OTP entry' : 'Got a 6-digit code instead?'}
          </button>
          {showOtp ? (
            <form onSubmit={handleVerifyOtp} className="auth-form">
              <label className="auth-field">
                <span>6-digit code (only if your email shows a code)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </label>
              <button className="auth-secondary" type="submit" disabled={busy}>
                Verify with code
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {false && mode !== 'confirm' ? (
        <>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <button className="auth-google" type="button" onClick={signInWithGoogle} disabled={busy}>
            Continue with Google
          </button>
        </>
      ) : null}

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-success">{message}</p> : null}
    </div>
  );
}
