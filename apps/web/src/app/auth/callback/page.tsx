'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      } else {
        router.replace('/');
      }
    });
  }, [router]);

  return (
    <main className="page" style={{ paddingTop: 120, textAlign: 'center' }}>
      <p>Completing sign in…</p>
    </main>
  );
}
