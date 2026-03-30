import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarDays, UtensilsCrossed, ShoppingBasket,
  Receipt, ShoppingCart, ScanBarcode, Wallet,
  Settings2, ShoppingCart as CartIcon, AlertTriangle, X,
} from 'lucide-react';
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

const SECTION_ICON: Record<Section, any> = {
  plan:   CalendarDays,
  platos: UtensilsCrossed,
  cat:    ShoppingBasket,
  ticket: Receipt,
  lista:  ShoppingCart,
  nutri:  ScanBarcode,
  gastos: Wallet,
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
        background: 'rgba(6,14,8,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(74,222,128,0.1)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
      }}
    >
      <div className="max-w-lg mx-auto px-4" style={{ paddingTop: 13, paddingBottom: 13 }}>
        <div className="flex items-center justify-between">

          {/* Left: section identity */}
          <div className="flex items-center gap-3">
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <SectionIcon size={18} strokeWidth={1.9} color="#4ade80" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.025em' }}>
                {TITLES[section]}
              </div>
              <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.42)', fontWeight: 500, marginTop: 1, letterSpacing: '0.01em' }}>
                {SUBTITLES[section]}
              </div>
            </div>
          </div>

          {/* Right: badges + settings */}
          <div className="flex items-center gap-1.5">

            {/* Badge PRO / ULTRA */}
            {isPro && (
              isUltra ? (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 800, padding: '3px 8px', borderRadius: 7,
                  background: 'linear-gradient(135deg,#92400e,#d97706)',
                  color: '#fef3c7', letterSpacing: '.08em',
                  display: 'flex', alignItems: 'center', gap: 3,
                  boxShadow: '0 1px 8px rgba(217,119,6,.4)',
                }}>
                  👑 ULTRA
                </span>
              ) : (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 800, padding: '3px 8px', borderRadius: 7,
                  background: 'rgba(74,222,128,0.12)',
                  color: '#4ade80', letterSpacing: '.08em',
                  border: '1px solid rgba(74,222,128,0.25)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  💎 PRO
                </span>
              )
            )}

            {/* Badge lista */}
            {neededCount > 0 && (
              <button
                onClick={() => onNavigate('lista')}
                style={{
                  fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <CartIcon size={11} strokeWidth={2} />
                {neededCount}
              </button>
            )}

            {/* Badge tickets pendientes */}
            {pendingCount > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  ref={btnRef}
                  onClick={() => setShowWarning(v => !v)}
                  style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.25)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <AlertTriangle size={11} strokeWidth={2.2} />
                  {pendingCount}
                </button>

                {showWarning && (
                  <div
                    ref={popoverRef}
                    style={{
                      position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                      width: 240, borderRadius: 16, padding: '16px',
                      background: '#0f1f12',
                      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
                      border: '1px solid rgba(251,191,36,0.2)', zIndex: 100,
                    }}
                  >
                    <div style={{ position: 'absolute', top: -6, right: 16, width: 12, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: 12, height: 12, background: 'rgba(251,191,36,0.2)', transform: 'rotate(45deg)', marginTop: 3 }}/>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <AlertTriangle size={18} color="#fbbf24" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff', marginBottom: 4 }}>
                          Productos sin asignar
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                          {pendingCount === 1
                            ? 'Tienes 1 ticket con artículos sin asociar.'
                            : `Tienes ${pendingCount} tickets con artículos sin asociar.`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setShowWarning(false); onNavigate('ticket'); }}
                      style={{
                        width: '100%', borderRadius: 10, padding: '9px',
                        fontWeight: 700, fontSize: '0.78rem', color: '#0f1f12',
                        background: '#fbbf24', border: 'none', cursor: 'pointer',
                      }}
                    >
                      Ir a Tickets →
                    </button>
                  </div>
                )}
              </div>
            )}

            {syncStatus ? (
              <span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{syncStatus}</span>
            ) : null}

            <button
              onClick={onSettings}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              title="Ajustes"
            >
              <Settings2 size={16} strokeWidth={1.8} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
