import React from 'react';
import type { Section } from '../../data/types';

const TITLES: Record<Section, string> = {
  plan:   'Plan mensual',
  platos: 'Mis platos',
  cat:    'Mi despensa',
  ticket: 'Tickets',
  lista:  'Lista de compra',
  gastos: 'Gastos',
};

const SUBTITLES: Record<Section, string> = {
  plan:   'Organiza tu semana',
  platos: 'Tus recetas habituales',
  cat:    'Gestiona tus ingredientes',
  ticket: 'Escanea y guarda',
  lista:  'Lo que necesitas comprar',
  gastos: 'Controla tu presupuesto',
};

const SECTION_EMOJI: Record<Section, string> = {
  plan:   '🗓️',
  platos: '🍳',
  cat:    '🧺',
  ticket: '🧾',
  lista:  '🛒',
  gastos: '💰',
};

interface HeaderProps {
  section: Section;
  isPro: boolean;
  neededCount: number;
  pendingCount: number;
  syncStatus: string;
  onSettings: () => void;
  onNavigate: (s: Section) => void;
}

export function Header({ section, isPro, neededCount, pendingCount, syncStatus, onSettings, onNavigate }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'linear-gradient(160deg, #15803d 0%, #16a34a 100%)',
        boxShadow: '0 2px 16px rgba(22,163,74,.3)',
      }}
    >
      <div className="max-w-lg mx-auto px-4" style={{ paddingTop: 14, paddingBottom: 14 }}>
        <div className="flex items-center justify-between">

          {/* Left: section identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{ width: 40, height: 40, background: 'rgba(255,255,255,.22)', fontSize: '1.45rem', flexShrink: 0 }}
            >
              {SECTION_EMOJI[section]}
            </div>
            <div>
              <div className="font-black text-white" style={{ fontSize: '1rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                {TITLES[section]}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.7)', fontWeight: 500, marginTop: 1 }}>
                {SUBTITLES[section]}
              </div>
            </div>
          </div>

          {/* Right: badges + settings */}
          <div className="flex items-center gap-1.5">
            {isPro && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 9999, background: 'rgba(255,255,255,.22)', color: '#fff', border: '1px solid rgba(255,255,255,.28)', letterSpacing: '.05em' }}>
                ✦ PRO
              </span>
            )}
            {neededCount > 0 && (
              <button
                onClick={() => onNavigate('lista')}
                style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                🛒 {neededCount}
              </button>
            )}
            {pendingCount > 0 && (
              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: 'rgba(251,191,36,.28)', color: '#fef08a', border: '1px solid rgba(251,191,36,.22)' }}>
                ⚠️ {pendingCount}
              </span>
            )}
            {syncStatus ? (
              <span style={{ fontSize: '0.62rem', fontWeight: 500, color: 'rgba(255,255,255,.6)' }}>{syncStatus}</span>
            ) : null}
            <button
              onClick={onSettings}
              style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              title="Ajustes"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
