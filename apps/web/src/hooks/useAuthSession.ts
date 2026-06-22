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

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    });
  };

  const signInWithPassword = async (email: string, password: string) => {
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
    signInWithGoogle,
    signInWithPassword,
    signUp,
    verifySignupOtp,
    resendSignupEmail,
    signOut,
  };
}
