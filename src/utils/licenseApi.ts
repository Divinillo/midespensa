// @ts-nocheck
const SUPABASE_URL  = 'https://hgglkzmknmoaznjbzaef.supabase.co';
const SUPABASE_ANON = 'sb_publishable_-ThAyvY1LG-M_v58T3-4aQ_rpv-9ixp';

export async function validateLicenseRemote(raw) {
  const clave = raw.toUpperCase().trim();
  if (clave.length < 8) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/licencias?clave=eq.${encodeURIComponent(clave)}&activa=eq.true&select=tier`, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      }
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data[0].tier; // 'pro' o 'ultra'
    return null;
  } catch(e) {
    console.error('Error validando licencia:', e);
    return null;
  }
}

