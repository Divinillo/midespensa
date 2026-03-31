import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarBlank, CookingPot, Basket, Receipt,
  ShoppingCart, Barcode, CurrencyEur,
  GearSix, ShoppingCartSimple, Warning,
} from '@phosphor-icons/react';
import type { Section } from '../../data/types';

const TITLES: Record<Section, string> = {
  plan:   'Plan mensual',
  platos: 'Mis platos',
  cat:    'Mi despensa',
  ticket: 'Tickets',
  lista:  'Lista de compra',
  nutri:  'Valor nutricional',
  gastos: 'Gastos',
};

const SUBTITLES: Record<Section, string> = {
  plan:   'Organiza tu semana',
  platos: 'Tus recetas habituales',
  cat:    'Gestiona tus ingredientes',
  ticket: 'Escanea y guarda',
  lista:  'Lo que necesitas comprar',
  nutri:  'Macros por ingrediente',
  gastos: 'Controla tu presupuesto',
};

const SECTION_ICON: Record<Section, React.ElementType> = {
  plan:   CalendarBlank,
  platos: CookingPot,
  cat:    Basket,
  ticket: Receipt,
  lista:  ShoppingCart,
  nutri:  Barcode,
  gastos: CurrencyEur,
};

interface HeaderProps {
  section: Section;
  isPro: boolean;
  isUltra: boolean;
  neededCount: number;
  pendingCount: number;
  syncStatus: string;
  onSettings: () => void;
  onNavigate: (s: Section) => void;
}

export function Header({ section, isPro, isUltra, neededCount, pendingCount, syncStatus, onSettings, onNavigate }: HeaderProps) {
  const [showWarning, setShowWarning] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showWarning) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setShowWarning(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showWarning]);

  const SectionIcon = SECTION_ICON[section];

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'linear-gradient(160deg, #134e4a 0%, #0f766e 100%)',
        boxShadow: '0 2px 20px rgba(15,118,110,.3)',
      }}
    >
      <div className="max-w-lg mx-auto px-4" style={{ paddingTop: 13, paddingBottom: 13 }}>
        <div className="flex items-center justify-between">

          {/* Left: section identity */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{ width: 40, height: 40, background: 'rgba(255,255,255,.18)', flexShrink: 0 }}
            >
              <SectionIcon size={22} weight="fill" color="#ffffff" />
            </div>
            <div>
              <div className="font-black text-white" style={{ fontSize: '1rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                {TITLES[section]}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.65)', fontWeight: 500, marginTop: 1 }}>
                {SUBTITLES[section]}
              </div>
            </div>
          </div>

          {/* Right: badges + settings */}
          <div className="flex items-center gap-1.5">

            {/* Badge PRO / ULTRA */}
            {isPro && (
              isUltra ? (
                <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 7px', borderRadius: 8, background: 'linear-gradient(135deg,#b45309,#d97706,#fbbf24)', color: '#fff', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 1px 6px rgba(217,119,6,.5)' }}>
                  <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>👑</span>
                  ULTRA
                </span>
              ) : (
                <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '3px 7px', borderRadius: 8, background: 'rgba(255,255,255,.15)', color: '#fff', letterSpacing: '.06em', border: '1px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>💎</span>
                  PRO
                </span>
              )
            )}

            {/* Badge lista necesita */}
            {neededCount > 0 && (
              <button
                onClick={() => onNavigate('lista')}
                style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ShoppingCartSimple size={12} color="#fff" weight="fill" />
                {neededCount}
              </button>
            )}

            {/* Badge tickets pendientes — con popover */}
            {pendingCount > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  ref={btnRef}
                  onClick={() => setShowWarning(v => !v)}
                  style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: 9999, background: 'rgba(251,191,36,.28)', color: '#fef08a', border: '1px solid rgba(251,191,36,.4)', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}
                >
                  <Warning size={12} color="#fef08a" weight="fill" />
                  {pendingCount}
                </button>

                {showWarning && (
                  <div
                    ref={popoverRef}
                    style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 230, borderRadius: 16, padding: '14px', background: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,.18)', border: '1.5px solid #fde68a', zIndex: 100 }}
                  >
                    <div style={{ position: 'absolute', top: -8, right: 14, width: 14, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: 14, height: 14, background: '#fde68a', transform: 'rotate(45deg)', marginTop: 4 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                      <Warning size={22} color="#d97706" weight="fill" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#92400e', marginBottom: 3 }}>Productos sin asignar</div>
                        <div style={{ fontSize: '0.72rem', color: '#b45309', lineHeight: 1.5 }}>
                          {pendingCount === 1
                            ? 'Tienes 1 ticket con artículos que no se han podido asociar a tu catálogo.'
                            : `Tienes ${pendingCount} tickets con artículos sin asociar a tu catálogo.`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowWarning(false); onNavigate('ticket'); }}
                      style={{ width: '100%', borderRadius: 10, padding: '9px', fontWeight: 700, fontSize: '0.78rem', color: '#fff', background: '#d97706', border: 'none', cursor: 'pointer' }}
                    >
                      Ir a Tickets →
                    </button>
                  </div>
                )}
              </div>
            )}

            {syncStatus ? (
              <span style={{ fontSize: '0.62rem', fontWeight: 500, color: 'rgba(255,255,255,.6)' }}>{syncStatus}</span>
            ) : null}

            {/* Settings button */}
            <button
              onClick={onSettings}
              style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              title="Ajustes"
            >
              <GearSix size={18} color="#ffffff" weight="regular" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
