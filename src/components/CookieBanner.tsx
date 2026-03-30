import { useState, useEffect } from 'react';

const CONSENT_KEY = 'despensa_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      // localStorage not available
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch {}
    setVisible(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#1f2937',
      color: '#f9fafb',
      padding: '16px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    }}>
      <span style={{ flex: 1, minWidth: '220px', fontSize: '0.82rem', lineHeight: 1.5, color: '#d1d5db' }}>
        🍪 Usamos almacenamiento local (<em>localStorage</em>) exclusivamente para guardar tus datos de la app y tu sesión. No utilizamos cookies de seguimiento ni publicidad.{' '}
        <a href="/privacidad.html" target="_blank" rel="noopener"
          style={{ color: '#86efac', textDecoration: 'underline' }}>Política de privacidad</a>
        {' · '}
        <a href="/terminos.html" target="_blank" rel="noopener"
          style={{ color: '#86efac', textDecoration: 'underline' }}>Términos y condiciones</a>
      </span>
      <button
        onClick={accept}
        style={{
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '0.88rem',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Entendido ✓
      </button>
    </div>
  );
}
