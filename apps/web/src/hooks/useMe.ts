'use client';

import { useEffect, useState } from 'react';
import { fetchJson, type Me } from '../lib/api';
import { getAccessToken } from '../lib/authToken';
import { useAuthSession } from './useAuthSession';

export function useMe() {
  const { session, loading } = useAuthSession();
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setMe(null);
      setMeLoading(false);
      return;
    }

    let active = true;
    setMeLoading(true);
    getAccessToken()
      .then((token) => (token ? fetchJson<Me>('/me', token) : null))
      .then((data) => {
        if (active) setMe(data);
      })
      .catch(() => {
        if (active) setMe(null);
      })
      .finally(() => {
        if (active) setMeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, loading]);

  return { me, role: me?.role ?? null, isAdmin: me?.role === 'admin', loading: loading || meLoading };
}
