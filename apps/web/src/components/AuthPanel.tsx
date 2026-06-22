'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '../hooks/useAuthSession';

type AuthMode = 'signin' | 'signup' | 'verify';

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
    resendSignupOtp,
    signOut,
  } = useAuthSession();

  const [mode, setMode] = useState<AuthMode>('signin');
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

    setMode('verify');
    setMessage('We sent a 6-digit verification code to your email. Enter it below to activate your account.');
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

  const handleResendOtp = async () => {
    resetMessages();
    setBusy(true);
    const { error: resendError } = await resendSignupOtp(email.trim());
    setBusy(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setMessage('A new verification code was sent to your email.');
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
      <div className="auth-card-header">
        <p className="auth-eyebrow">Internal Portal</p>
        <h2>
          {mode === 'verify'
            ? 'Verify your email'
            : mode === 'signup'
              ? 'Create your account'
              : 'Welcome back'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'verify'
            ? 'Enter the OTP sent to your inbox to complete registration.'
            : 'Team management console for SLA-driven support workflows.'}
        </p>
      </div>

      {mode !== 'verify' ? (
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => {
              setMode('signin');
              resetMessages();
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => {
              setMode('signup');
              resetMessages();
            }}
          >
            Sign up
          </button>
        </div>
      ) : null}

      {mode === 'signin' ? (
        <form className="auth-form" onSubmit={handleSignIn}>
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

      {mode === 'signup' ? (
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
            {busy ? 'Creating account…' : 'Create account & send OTP'}
          </button>
        </form>
      ) : null}

      {mode === 'verify' ? (
        <form className="auth-form" onSubmit={handleVerifyOtp}>
          <label className="auth-field">
            <span>Email OTP</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify & continue'}
          </button>
          <button className="auth-link" type="button" onClick={handleResendOtp} disabled={busy}>
            Resend code
          </button>
          <button
            className="auth-link"
            type="button"
            onClick={() => {
              setMode('signup');
              resetMessages();
            }}
          >
            Back to sign up
          </button>
        </form>
      ) : null}

      {mode !== 'verify' ? (
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
