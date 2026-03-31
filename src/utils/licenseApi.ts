import { supabase } from './supabase';

/**
 * Validates a license key server-side (requires authenticated session).
 * Also links the license to the current user's email so tier persists
 * across sessions via cloud sync.
 *
 * Returns 'pro' | 'ultra' | null
 */
export async function validateLicenseRemote(raw: string): Promise<string | null> {
  const clave = raw.toUpperCase().trim();
  if (clave.length < 8) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;

    const res = await fetch('/api/validate-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ clave }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.valid && data.tier) return data.tier as string;
    return null;
  } catch (e) {
    console.error('Error validando licencia:', e);
    return null;
  }
}
