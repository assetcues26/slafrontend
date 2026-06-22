'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuthSession } from '../hooks/useAuthSession';

export default function AuthPanel() {
  const { session, loading, signInWithGoogle, signInWithEmail, signOut } = useAuthSession();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleEmailSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    const { error } = await signInWithEmail(email);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Check your inbox for the login link.');
  };

  if (loading) {
    return (
      <div className="auth-panel">
        <strong>Loading…</strong>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <strong>Sign in</strong>
      {session ? (
        <div className="auth-row">
          <span>{session.user.email}</span>
          <button className="ghost" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      ) : (
        <>
          <button className="primary google-btn" type="button" onClick={signInWithGoogle}>
            Continue with Google
          </button>
          <form onSubmit={handleEmailSignIn} className="auth-row">
            <input
              type="email"
              placeholder="email@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="ghost" type="submit">
              Email link
            </button>
          </form>
        </>
      )}
      {message ? <span className="auth-message">{message}</span> : null}
    </div>
  );
}
