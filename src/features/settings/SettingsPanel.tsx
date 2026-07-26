import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabase';

/* ── Phosphor-style inline icons (SVG paths) ─────────────────────── */
const Icon = ({ d, size = 18, color = 'currentColor' }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  logout:   'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  globe:    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload:   'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  refresh:  'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15',
  phone:    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  link:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  star:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  chevron:  'M9 18l6-6-6-6',
};

/* ── Types ────────────────────────────────────────────────────────── */
interface SettingsPanelProps {
  session: Session | null;
  syncStatus: string;
  isPro: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  dishes: { length: number };
  tickets: { length: number };
  freeDishLimit: number;
  freeTicketLimit: number;
  isEN: boolean;
  isUS: boolean;
  formatPrice: (n: number) => string;
  stripeConfig: { monthly: number; yearly: number };
  exportData: () => void;
  importData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importError: string;
  resetWizard: () => void;
  onInstallPWA: () => void;
  isStandalone: boolean;
  onUpgrade: (reason: string) => void;
  onClose: () => void;
}

/* ── Styles ───────────────────────────────────────────────────────── */
const sectionTitle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#94a3b8',
  padding: '0 4px',
  marginBottom: 6,
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 12,
  cursor: 'default',
  transition: 'background .15s',
};

const rowIcon: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const rowLabel: React.CSSProperties = {
  fontSize: '0.84rem',
  fontWeight: 600,
  color: '#1e293b',
  lineHeight: 1.3,
};

const rowSub: React.CSSProperties = {
  fontSize: '0.72rem',
  color: '#64748b',
  lineHeight: 1.4,
  marginTop: 1,
};

const actionBtn = (bg: string): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: 8,
  fontSize: '0.76rem',
  fontWeight: 700,
  border: 'none',
  background: bg,
  color: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  transition: 'opacity .15s',
});

const divider: React.CSSProperties = {
  height: 1,
  background: '#f1f5f9',
  margin: '0 14px',
};

/* ── Component ────────────────────────────────────────────────────── */
export function SettingsPanel({
  session, syncStatus, isPro, isTrial, trialDaysLeft,
  dishes, tickets, freeDishLimit, freeTicketLimit,
  isEN, isUS, formatPrice, stripeConfig,
  exportData, importData, importError,
  resetWizard, onInstallPWA, isStandalone,
  onUpgrade, onClose,
}: SettingsPanelProps) {
  const { i18n } = useTranslation();
  const importRef = useRef<HTMLInputElement>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const hoverBg = (id: string) => hoveredRow === id ? { background: '#f8fafc' } : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ─── Plan / Subscription ─────────────────────────────────── */}
      <div style={{
        borderRadius: 14,
        padding: '16px 16px 14px',
        background: isPro ? 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)'
          : isTrial ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
          : 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
        border: `1px solid ${isPro ? '#fde68a' : isTrial ? '#a7f3d0' : '#99f6e4'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isPro ? '#92400e' : isTrial ? '#065f46' : '#134e4a' }}>
            {isPro ? (isEN ? '✨ Pro' : '✨ Pro') : isTrial ? (isEN ? '🎁 Pro Trial' : '🎁 Prueba Pro') : (isEN ? 'Free Plan' : 'Plan Gratuito')}
          </span>
          {isPro && (
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#a16207', background: '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>
              {isEN ? 'Active' : 'Activo'}
            </span>
          )}
        </div>

        {isTrial ? (
          <>
            <p style={{ fontSize: '0.74rem', color: '#047857', lineHeight: 1.5, margin: '0 0 10px' }}>
              {isEN
                ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining — all Pro features unlocked.`
                : `${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''} — todas las funciones Pro activas.`}
            </p>
            <button
              onClick={() => { onClose(); onUpgrade('trial'); }}
              style={{ ...actionBtn('#0d9488'), width: '100%', padding: '9px 0', borderRadius: 10 }}
            >
              {isEN ? `Continue with Pro · ${formatPrice(stripeConfig.monthly)}/mo` : `Continuar con Pro · ${formatPrice(stripeConfig.monthly)}/mes`}
            </button>
          </>
        ) : isPro ? (
          <p style={{ fontSize: '0.74rem', color: '#92400e', lineHeight: 1.5, margin: 0 }}>
            {isEN ? 'All features unlocked. Thanks for supporting MiDespensa!' : 'Todas las funciones desbloqueadas. ¡Gracias por apoyar MiDespensa!'}
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.74rem', color: '#0f766e', lineHeight: 1.5, margin: '0 0 10px' }}>
              {isEN ? 'Recipes' : 'Platos'}: {dishes.length}/{freeDishLimit} · {isEN ? 'Receipts' : 'Tickets'}: {tickets.length}/{freeTicketLimit}
            </p>
            <button
              onClick={() => { onClose(); onUpgrade('reports'); }}
              style={{ ...actionBtn('#0d9488'), width: '100%', padding: '9px 0', borderRadius: 10 }}
            >
              {isEN ? 'Unlock Pro →' : 'Desbloquear Pro →'}
            </button>
          </>
        )}
      </div>

      {/* ─── Account ─────────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>{isEN ? 'ACCOUNT' : 'CUENTA'}</div>
        <div style={{ borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fff' }}>
          {/* User info */}
          <div style={{ ...row, cursor: 'default' }}>
            <div style={{ ...rowIcon, background: '#eff6ff', color: '#3b82f6' }}>
              <Icon d={icons.user} size={18} color="#3b82f6" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={rowLabel}>{session?.user?.email}</div>
              {syncStatus && <div style={{ ...rowSub, color: '#0d9488' }}>{syncStatus}</div>}
            </div>
          </div>

          <div style={divider} />

          {/* Sign out */}
          <div
            style={{ ...row, cursor: 'pointer', ...hoverBg('logout') }}
            onMouseEnter={() => setHoveredRow('logout')}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={async () => {
              if (window.confirm(isEN ? 'Sign out?' : '¿Cerrar sesión?')) {
                await supabase.auth.signOut();
                window.location.reload();
              }
            }}
          >
            <div style={{ ...rowIcon, background: '#fef2f2', color: '#ef4444' }}>
              <Icon d={icons.logout} size={18} color="#ef4444" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...rowLabel, color: '#dc2626' }}>{isEN ? 'Sign out' : 'Cerrar sesión'}</div>
            </div>
            <Icon d={icons.chevron} size={16} color="#cbd5e1" />
          </div>
        </div>
      </div>

      {/* ─── Language ────────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>{isEN ? 'LANGUAGE' : 'IDIOMA'}</div>
        <div style={{
          display: 'flex',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          {[
            { code: 'es', label: '🇪🇸 Español' },
            { code: 'en', label: '🇺🇸 English' },
          ].map(({ code, label }) => {
            const active = i18n.language?.startsWith(code);
            return (
              <button
                key={code}
                onClick={() => i18n.changeLanguage(code)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: '0.82rem',
                  fontWeight: active ? 700 : 500,
                  border: 'none',
                  background: active ? '#0d9488' : 'transparent',
                  color: active ? '#fff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all .2s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Data ────────────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>{isEN ? 'YOUR DATA' : 'TUS DATOS'}</div>
        <div style={{ borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fff' }}>
          {/* Export */}
          <div
            style={{ ...row, cursor: 'pointer', ...hoverBg('export') }}
            onMouseEnter={() => setHoveredRow('export')}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={exportData}
          >
            <div style={{ ...rowIcon, background: '#f0fdfa', color: '#0d9488' }}>
              <Icon d={icons.download} size={18} color="#0d9488" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={rowLabel}>{isEN ? 'Export backup' : 'Exportar backup'}</div>
              <div style={rowSub}>{isEN ? 'Download all your data as JSON' : 'Descarga todos tus datos en JSON'}</div>
            </div>
            <Icon d={icons.chevron} size={16} color="#cbd5e1" />
          </div>

          <div style={divider} />

          {/* Import */}
          <div
            style={{ ...row, cursor: 'pointer', ...hoverBg('import') }}
            onMouseEnter={() => setHoveredRow('import')}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={() => importRef.current?.click()}
          >
            <div style={{ ...rowIcon, background: '#eff6ff', color: '#3b82f6' }}>
              <Icon d={icons.upload} size={18} color="#3b82f6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={rowLabel}>{isEN ? 'Import backup' : 'Importar backup'}</div>
              <div style={rowSub}>{isEN ? 'Load a JSON file — replaces current data' : 'Carga un fichero JSON — reemplaza datos actuales'}</div>
            </div>
            <Icon d={icons.chevron} size={16} color="#cbd5e1" />
          </div>
          <input ref={importRef} type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
          {importError && (
            <div style={{ padding: '8px 14px', fontSize: '0.74rem', color: '#dc2626', background: '#fef2f2' }}>
              {importError}
            </div>
          )}
        </div>

        {/* Data warning — compact */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          marginTop: 8, padding: '8px 12px',
          borderRadius: 10, background: '#fffbeb', border: '1px solid #fef3c7',
        }}>
          <span style={{ fontSize: '0.82rem', flexShrink: 0 }}>💡</span>
          <span style={{ fontSize: '0.68rem', color: '#92400e', lineHeight: 1.4 }}>
            {isEN
              ? 'Data is stored on this device. Back up regularly to avoid losing it.'
              : 'Los datos se guardan en este dispositivo. Haz backups periódicos para no perderlos.'}
          </span>
        </div>
      </div>

      {/* ─── App ─────────────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>{isEN ? 'APP' : 'APLICACIÓN'}</div>
        <div style={{ borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fff' }}>
          {/* Reset wizard */}
          <div
            style={{ ...row, cursor: 'pointer', ...hoverBg('wizard') }}
            onMouseEnter={() => setHoveredRow('wizard')}
            onMouseLeave={() => setHoveredRow(null)}
            onClick={resetWizard}
          >
            <div style={{ ...rowIcon, background: '#faf5ff', color: '#8b5cf6' }}>
              <Icon d={icons.refresh} size={18} color="#8b5cf6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={rowLabel}>{isEN ? 'Restart setup wizard' : 'Repetir configuración inicial'}</div>
              <div style={rowSub}>{isEN ? 'Run the welcome guide again' : 'Vuelve a ver la guía de bienvenida'}</div>
            </div>
            <Icon d={icons.chevron} size={16} color="#cbd5e1" />
          </div>

          {/* Install PWA — only when not standalone */}
          {!isStandalone && (
            <>
              <div style={divider} />
              <div
                style={{ ...row, cursor: 'pointer', ...hoverBg('pwa') }}
                onMouseEnter={() => setHoveredRow('pwa')}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={onInstallPWA}
              >
                <div style={{ ...rowIcon, background: '#f0fdfa', color: '#0d9488' }}>
                  <Icon d={icons.phone} size={18} color="#0d9488" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={rowLabel}>{isEN ? 'Add to home screen' : 'Añadir a pantalla de inicio'}</div>
                  <div style={rowSub}>{isEN ? 'Install the app on your device' : 'Instala la app en tu dispositivo'}</div>
                </div>
                <Icon d={icons.chevron} size={16} color="#cbd5e1" />
              </div>
            </>
          )}

          <div style={divider} />

          {/* Website */}
          <a
            href={isUS ? 'https://midespensa.app/en' : 'https://midespensa.app/'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...row, cursor: 'pointer', textDecoration: 'none', ...hoverBg('web') } as React.CSSProperties}
            onMouseEnter={() => setHoveredRow('web')}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <div style={{ ...rowIcon, background: '#f8fafc', color: '#64748b' }}>
              <Icon d={icons.link} size={18} color="#64748b" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={rowLabel}>{isEN ? 'Visit website' : 'Ir a la web'}</div>
              <div style={rowSub}>{isUS ? 'midespensa.app/en' : 'midespensa.app'}</div>
            </div>
            <Icon d={icons.chevron} size={16} color="#cbd5e1" />
          </a>
        </div>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '4px 0 8px', fontSize: '0.68rem', color: '#cbd5e1' }}>
        MiDespensa v1.4.0
      </div>
    </div>
  );
}
