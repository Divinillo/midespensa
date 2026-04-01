import React, { useEffect, useState } from 'react';

type OS = 'android' | 'ios' | 'desktop';

function detectOS(): OS {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

const STORAGE_KEY = 'pwa_wizard_dismissed';

interface Step { text: React.ReactNode }

const STEPS: Record<OS, { title: string; subtitle: string; steps: Step[] }> = {
  ios: {
    title: 'Instalar en iPhone / iPad',
    subtitle: 'Safari',
    steps: [
      { text: <>Toca los <strong>tres puntos "..."</strong> al lado de la barra de navegación</> },
      { text: <>Toca en <strong>Compartir</strong></> },
      { text: <>Toca <strong>"Ver más"</strong> y luego <strong>"Añadir a pantalla de inicio"</strong></> },
    ],
  },
  android: {
    title: 'Instalar en Android',
    subtitle: 'Chrome',
    steps: [
      { text: <>Toca el menú <strong>⋮</strong> (tres puntos) arriba a la derecha</> },
      { text: <>Selecciona <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar app"</strong></> },
      { text: <>Pulsa <strong>"Añadir"</strong> en el diálogo de confirmación</> },
    ],
  },
  desktop: {
    title: 'Instalar en escritorio',
    subtitle: 'Chrome / Edge',
    steps: [
      { text: <>Busca el icono <strong>⊕</strong> al final de la barra de direcciones</> },
      { text: <>Haz clic y pulsa <strong>"Instalar"</strong></> },
      { text: <>MiDespensa se abrirá en su propia ventana</> },
    ],
  },
};

export function PWAInstallWizard({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void } = {}) {
  const [visible, setVisible] = useState(false);
  const [os, setOs] = useState<OS>('android');
  const [activeTab, setActiveTab] = useState<OS>('android');

  useEffect(() => {
    if (forceOpen) {
      const detected = detectOS();
      setOs(detected);
      setActiveTab(detected);
      setVisible(true);
      return;
    }
    if (isStandalone()) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    const detected = detectOS();
    setOs(detected);
    setActiveTab(detected);
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [forceOpen]);

  function dismiss() {
    if (!forceOpen) localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onClose?.();
  }

  if (!visible) return null;

  const current = STEPS[activeTab];
  const TABS: { key: OS; label: string }[] = [
    { key: 'ios', label: 'iPhone / iPad' },
    { key: 'android', label: 'Android' },
    { key: 'desktop', label: 'Escritorio' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(2,12,12,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom,0)',
      }}
      onClick={e => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '24px 20px 32px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.3s ease',
      }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>

        {/* Handle + close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
              Añade MiDespensa a tu inicio
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
              Accede más rápido, sin navegador
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, fontSize: '1rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flex: 1, padding: '7px 4px', borderRadius: 100,
                border: `2px solid ${activeTab === t.key ? '#0f766e' : '#e2e8f0'}`,
                background: activeTab === t.key ? '#0f766e' : '#fff',
                color: activeTab === t.key ? '#fff' : '#374151',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all .15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: '16px 16px 12px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', marginBottom: 2 }}>{current.title}</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 14 }}>{current.subtitle}</div>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {current.steps.map((step, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: '#0f766e', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 800, flexShrink: 0, marginTop: 1,
                }}>{i + 1}</div>
                <span style={{ fontSize: '0.84rem', color: '#374151', lineHeight: 1.5 }}>{step.text}</span>
              </li>
            ))}
          </ol>
          {activeTab === 'ios' && (
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 12 }}>
              💡 En iOS solo funciona con Safari. Chrome en iPhone no permite instalar PWAs.
            </p>
          )}
          {activeTab === 'android' && (
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 12 }}>
              💡 En algunos móviles Chrome muestra un banner de instalación automático en la parte inferior.
            </p>
          )}
        </div>

        {/* Footer */}
        <button
          onClick={dismiss}
          style={{ width: '100%', marginTop: 14, padding: '11px', border: 'none', borderRadius: 12, background: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
        >
          No, gracias
        </button>
      </div>
    </div>
  );
}
