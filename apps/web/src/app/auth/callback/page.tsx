'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const complete = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/dashboard');
        return;
      }
      router.replace('/?signed_in=0');
    };

    complete();
  }, [router]);

  return (
    <main className="landing landing-callback">
      <p>Completing sign in…</p>
    </main>
  );
}
