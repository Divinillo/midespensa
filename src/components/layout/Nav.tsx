import React from 'react';
import {
  CalendarDays,
  UtensilsCrossed,
  ShoppingBasket,
  Receipt,
  ShoppingCart,
  ScanBarcode,
  Wallet,
} from 'lucide-react';
import type { Section } from '../../data/types';

const NAV: { id: Section; label: string; Icon: any }[] = [
  { id: 'plan',   label: 'Plan',      Icon: CalendarDays    },
  { id: 'platos', label: 'Platos',    Icon: UtensilsCrossed },
  { id: 'cat',    label: 'Despensa',  Icon: ShoppingBasket  },
  { id: 'ticket', label: 'Tickets',   Icon: Receipt         },
  { id: 'lista',  label: 'Compra',    Icon: ShoppingCart    },
  { id: 'nutri',  label: 'Nutrición', Icon: ScanBarcode     },
  { id: 'gastos', label: 'Gastos',    Icon: Wallet          },
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
        background: 'rgba(6,14,8,0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(74,222,128,0.1)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
      }}
    >
      <div
        className="max-w-lg mx-auto flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 6px)' }}
      >
        {NAV.map(({ id, label, Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex-1 flex flex-col items-center relative"
              style={{ paddingTop: 10, paddingBottom: 8, gap: 4 }}
            >
              {active && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(74,222,128,0.14)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  transition: 'all .2s ease',
                }} />
              )}

              <div style={{ position: 'relative', zIndex: 1, transition: 'transform .18s ease', transform: active ? 'scale(1.1)' : 'scale(1)' }}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.6}
                  color={active ? '#4ade80' : 'rgba(255,255,255,0.38)'}
                  style={{ display: 'block', transition: 'color .15s ease' }}
                />
              </div>

              <span style={{
                fontSize: 9,
                fontWeight: active ? 700 : 500,
                letterSpacing: '.03em',
                textTransform: 'uppercase',
                lineHeight: 1,
                color: active ? '#4ade80' : 'rgba(255,255,255,0.35)',
                position: 'relative',
                zIndex: 1,
                transition: 'color .15s ease',
              }}>
                {label}
              </span>

              {id === 'ticket' && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 'calc(50% - 20px)',
                  minWidth: 16, height: 16, padding: '0 4px',
                  background: '#f97316', color: '#fff',
                  fontSize: 8, fontWeight: 800, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid rgba(6,14,8,1)', zIndex: 2,
                }}>
                  {pendingCount}
                </span>
              )}

              {id === 'cat' && neededCount > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 'calc(50% - 20px)',
                  minWidth: 16, height: 16, padding: '0 4px',
                  background: '#f97316', color: '#fff',
                  fontSize: 8, fontWeight: 800, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid rgba(6,14,8,1)', zIndex: 2,
                }}>
                  {neededCount > 9 ? '9+' : neededCount}
                </span>
              )}

              {id === 'gastos' && !isPro && (
                <span style={{
                  position: 'absolute', top: 6, right: 'calc(50% - 19px)',
                  width: 14, height: 14, borderRadius: 5,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: 'rgba(255,255,255,0.45)', zIndex: 2,
                }}>
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
