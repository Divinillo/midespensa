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

export async function loadFromCloud(email: string) {
  if (!email) return null;
  try {
    const res = await fetch('/api/sync-data?email=' + encodeURIComponent(email));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
