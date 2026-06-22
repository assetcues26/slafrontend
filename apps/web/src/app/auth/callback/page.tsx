'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Completing sign in…');

  useEffect(() => {
    const complete = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
        }
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'email_change' | 'magiclink',
        });
        if (error) {
          setMessage(error.message);
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/dashboard');
        return;
      }

      router.replace('/login');
    };

    complete();
  }, [router]);

  return (
    <main className="landing landing-callback">
      <p>{message}</p>
    </main>
  );
}
