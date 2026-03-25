import React from 'react';
import type { Section } from '../../data/types';

const NAV: { id: Section; label: string; emoji: string; activeEmoji: string }[] = [
  { id: 'plan',   label: 'Plan',     emoji: '🗓️',  activeEmoji: '🗓️'  },
  { id: 'platos', label: 'Platos',   emoji: '🍳',  activeEmoji: '🍳'  },
  { id: 'cat',    label: 'Despensa', emoji: '🧺',  activeEmoji: '🧺'  },
  { id: 'ticket', label: 'Tickets',  emoji: '🧾',  activeEmoji: '🧾'  },
  { id: 'lista',  label: 'Compra',   emoji: '🛒',  activeEmoji: '🛒'  },
  { id: 'nutri',  label: 'Nutrición',emoji: '🔬',  activeEmoji: '🔬'  },
  { id: 'gastos', label: 'Gastos',   emoji: '💰',  activeEmoji: '💰'  },
];

interface NavProps {
  section: Section;
  neededCount: number;
  pendingCount: number;
  isPro: boolean;
  onNavigate: (s: Section) => void;
}

export function Nav({ section, neededCount, pendingCount, isPro, onNavigate }: NavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'linear-gradient(160deg, #15803d 0%, #16a34a 100%)',
        boxShadow: '0 -2px 16px rgba(22,163,74,.28)',
      }}
    >
      <div
        className="max-w-lg mx-auto flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
      >
        {NAV.map(s => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onNavigate(s.id)}
              className="flex-1 flex flex-col items-center relative"
              style={{ paddingTop: 8, paddingBottom: 8, gap: 2 }}
            >
              {/* Active pill */}
              {active && (
                <div
                  className="absolute inset-x-1"
                  style={{ top: 4, bottom: 4, background: 'rgba(255,255,255,.2)', borderRadius: 14 }}
                />
              )}

              {/* Icono */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? 'rgba(255,255,255,.25)' : 'transparent',
                  fontSize: active ? '1.35rem' : '1.2rem',
                  lineHeight: 1,
                  transition: 'all .18s ease',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  filter: active ? 'drop-shadow(0 2px 4px rgba(0,0,0,.2))' : 'none',
                }}
              >
                {s.id === 'nutri' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Esquinas del marco */}
                    <path d="M2 7V3h4"   stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={active?1:0.6}/>
                    <path d="M22 7V3h-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={active?1:0.6}/>
                    <path d="M2 17v4h4"  stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={active?1:0.6}/>
                    <path d="M22 17v4h-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={active?1:0.6}/>
                    {/* Barras del código */}
                    <rect x="4"  y="7" width="1.5" height="10" rx="0.4" fill="white" fillOpacity={active?1:0.6}/>
                    <rect x="7"  y="7" width="1"   height="10" rx="0.4" fill="white" fillOpacity={active?1:0.6}/>
                    <rect x="9.5" y="7" width="2"  height="10" rx="0.4" fill="white" fillOpacity={active?1:0.6}/>
                    <rect x="13" y="7" width="1"   height="10" rx="0.4" fill="white" fillOpacity={active?1:0.6}/>
                    <rect x="15.5" y="7" width="1.5" height="10" rx="0.4" fill="white" fillOpacity={active?1:0.6}/>
                    <rect x="18" y="7" width="1"   height="10" rx="0.4" fill="white" fillOpacity={active?1:0.6}/>
                    {/* Línea de escaneo naranja */}
                    <line x1="2" y1="12.5" x2="22" y2="12.5" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : s.emoji}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  color: active ? '#fff' : 'rgba(255,255,255,.6)',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color .15s ease',
                }}
              >
                {s.label}
              </span>

              {/* Badge: tickets */}
              {s.id === 'ticket' && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 'calc(50% - 22px)',
                  minWidth: 16, height: 16, padding: '0 3px',
                  background: '#f97316', color: '#fff',
                  fontSize: 8, fontWeight: 700, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #15803d', zIndex: 2,
                }}>
                  {pendingCount}
                </span>
              )}

              {/* Badge: needed */}
              {s.id === 'cat' && neededCount > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 'calc(50% - 22px)',
                  minWidth: 16, height: 16, padding: '0 3px',
                  background: '#f97316', color: '#fff',
                  fontSize: 8, fontWeight: 700, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #15803d', zIndex: 2,
                }}>
                  {neededCount > 9 ? '9+' : neededCount}
                </span>
              )}

              {/* Lock */}
              {s.id === 'gastos' && !isPro && (
                <span style={{ position: 'absolute', top: 4, right: 'calc(50% - 20px)', fontSize: 10, zIndex: 2 }}>
                  🔒
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
