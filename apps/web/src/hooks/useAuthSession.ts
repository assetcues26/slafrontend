'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  fullName: string;
};

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const signInWithPassword = async (login: string, password: string) => {
    const trimmed = login.trim();
    let email = trimmed;
    if (!trimmed.includes('@')) {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/v1';
      const response = await fetch(`${apiBase}/auth/resolve-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: trimmed }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return { data: { session: null, user: null }, error: { message: body || 'Invalid username' } };
      }
      const resolved = (await response.json()) as { email: string };
      email = resolved.email;
    }
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async ({ email, password, username, fullName }: SignUpInput) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          full_name: fullName.trim(),
        },
        emailRedirectTo: redirectTo(),
      },
    });
  };

  const verifySignupOtp = async (email: string, token: string) => {
    return supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
  };

  const resendSignupEmail = async (email: string) => {
    return supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo() },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    loading,
    signInWithPassword,
    signUp,
    verifySignupOtp,
    resendSignupEmail,
    signOut,
  };
}
