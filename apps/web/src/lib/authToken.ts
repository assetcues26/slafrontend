import { supabase } from '../lib/supabaseClient';

/** Returns a valid access token, refreshing the session if needed. */
export async function getAccessToken(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const expiresSoon = expiresAt * 1000 < Date.now() + 60_000;

  if (!expiresSoon) {
    return session.access_token;
  }

  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? session.access_token;
}
