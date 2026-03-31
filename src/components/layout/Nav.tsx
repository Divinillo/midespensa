import React from 'react';
import {
  CalendarBlank,
  CookingPot,
  Basket,
  Receipt,
  ShoppingCart,
  Barcode,
  CurrencyEur,
} from '@phosphor-icons/react';
import type { Section } from '../../data/types';

const NAV: { id: Section; label: string; Icon: React.ElementType }[] = [
  { id: 'plan',   label: 'Plan',      Icon: CalendarBlank },
  { id: 'platos', label: 'Platos',    Icon: CookingPot    },
  { id: 'cat',    label: 'Despensa',  Icon: Basket        },
  { id: 'ticket', label: 'Tickets',   Icon: Receipt       },
  { id: 'lista',  label: 'Compra',    Icon: ShoppingCart  },
  { id: 'nutri',  label: 'Nutrición', Icon: Barcode       },
  { id: 'gastos', label: 'Gastos',    Icon: CurrencyEur   },
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
        background: 'linear-gradient(160deg, #134e4a 0%, #0f766e 100%)',
        boxShadow: '0 -2px 20px rgba(15,118,110,.32)',
      }}
    >
      <div
        className="max-w-lg mx-auto flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
      >
        {NAV.map(({ id, label, Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex-1 flex flex-col items-center relative"
              style={{ paddingTop: 9, paddingBottom: 8, gap: 3 }}
            >
              {/* Active pill */}
              {active && (
                <div
                  className="absolute inset-x-1"
                  style={{ top: 4, bottom: 4, background: 'rgba(255,255,255,.18)', borderRadius: 14 }}
                />
              )}

              {/* Icon */}
              <div style={{ position: 'relative', zIndex: 1, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .18s ease', transform: active ? 'scale(1.12)' : 'scale(1)' }}>
                <Icon size={22} weight={active ? 'fill' : 'regular'} color={active ? '#ffffff' : 'rgba(255,255,255,.55)'} />
              </div>

              {/* Label */}
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '.04em', textTransform: 'uppercase', lineHeight: 1, color: active ? '#fff' : 'rgba(255,255,255,.55)', position: 'relative', zIndex: 1, transition: 'color .15s ease' }}>
                {label}
              </span>

              {/* Badge tickets */}
              {id === 'ticket' && pendingCount > 0 && (
                <span style={{ position: 'absolute', top: 5, right: 'calc(50% - 22px)', minWidth: 16, height: 16, padding: '0 3px', background: '#f97316', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0f766e', zIndex: 2 }}>
                  {pendingCount}
                </span>
              )}

              {/* Badge needed */}
              {id === 'cat' && neededCount > 0 && (
                <span style={{ position: 'absolute', top: 5, right: 'calc(50% - 22px)', minWidth: 16, height: 16, padding: '0 3px', background: '#f97316', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0f766e', zIndex: 2 }}>
                  {neededCount > 9 ? '9+' : neededCount}
                </span>
              )}

              {/* Lock */}
              {id === 'gastos' && !isPro && (
                <span style={{ position: 'absolute', top: 4, right: 'calc(50% - 20px)', fontSize: 10, zIndex: 2 }}>🔒</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
