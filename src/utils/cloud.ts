let _syncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncToCloud(email: string, getData: () => object) {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    if (!email) return;
    try {
      const ts = Date.now();
      try { localStorage.setItem('despensa_local_ts', String(ts)); } catch {}
      const data = getData();
      await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...data, updated_at: ts }),
      });
    } catch (e: any) {
      console.warn('Sync fallida:', e.message);
    }
  }, 5000);
}

// pinHash: SHA-256 hex del PIN con salt (email:pin), opcional
export async function loadFromCloud(email: string, pinHash?: string) {
  if (!email) return null;
  try {
    let url = '/api/sync-data?email=' + encodeURIComponent(email);
    if (pinHash) url += '&pin_hash=' + encodeURIComponent(pinHash);
    const res = await fetch(url);
    if (res.status === 401) return { error: 'PIN_REQUIRED' };
    if (res.status === 403) return { error: 'PIN_INVALID' };
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Hashea un PIN con el email como salt usando Web Crypto API (SHA-256)
export async function hashPin(email: string, pin: string): Promise<string> {
  const data = email.toLowerCase().trim() + ':' + pin;
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
