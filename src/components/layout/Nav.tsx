import React from 'react';
import {
  CalendarBlank,
  CookingPot,
  Basket,
  Receipt,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { Section } from '../../data/types';

/** The four main navigation tabs. Sub-sections (lista, nutri, gastos) are
 *  accessible via SubNav toggles inside their parent section. */
const NAV_ITEMS: { id: Section; parentOf: Section[]; key: string; Icon: React.ElementType }[] = [
  { id: 'plan',   parentOf: ['lista'],          key: 'plan',   Icon: CalendarBlank },
  { id: 'platos', parentOf: [],                 key: 'platos', Icon: CookingPot    },
  { id: 'cat',    parentOf: ['nutri'],          key: 'cat',    Icon: Basket        },
  { id: 'ticket', parentOf: ['gastos'],         key: 'ticket', Icon: Receipt       },
];

interface NavProps {
  section: Section;
  neededCount: number;
  pendingCount: number;
  isPro: boolean;
  onNavigate: (s: Section) => void;
}

export function Nav({ section, neededCount, pendingCount, isPro, onNavigate }: NavProps) {
  const { t } = useTranslation();

  return (
    <nav
      role="navigation"
      aria-label={t('nav.main') || 'Main navigation'}
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
        {NAV_ITEMS.map(({ id, parentOf, key, Icon }) => {
          const active = section === id || parentOf.includes(section);
          const label = t(`nav.${key}`);
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center relative focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700"
              style={{ paddingTop: 10, paddingBottom: 10, gap: 4, borderRadius: 0 }}
            >
              {/* Active pill */}
              {active && (
                <div
                  className="absolute inset-x-2"
                  style={{ top: 4, bottom: 4, background: 'rgba(255,255,255,.18)', borderRadius: 14 }}
                />
              )}

              {/* Icon */}
              <div style={{ position: 'relative', zIndex: 1, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .18s ease', transform: active ? 'scale(1.08)' : 'scale(1)' }}>
                <Icon size={26} weight={active ? 'fill' : 'regular'} color={active ? '#ffffff' : 'rgba(255,255,255,.55)'} />
              </div>

              {/* Label */}
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, letterSpacing: '.03em', textTransform: 'uppercase', lineHeight: 1, color: active ? '#fff' : 'rgba(255,255,255,.55)', position: 'relative', zIndex: 1, transition: 'color .15s ease' }}>
                {label}
              </span>

              {/* Badge tickets */}
              {id === 'ticket' && pendingCount > 0 && (
                <span aria-label={`${pendingCount} pending`} style={{ position: 'absolute', top: 6, right: 'calc(50% - 24px)', minWidth: 18, height: 18, padding: '0 4px', background: '#f97316', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0f766e', zIndex: 2 }}>
                  {pendingCount}
                </span>
              )}

              {/* Badge needed */}
              {id === 'cat' && neededCount > 0 && (
                <span aria-label={`${neededCount} needed`} style={{ position: 'absolute', top: 6, right: 'calc(50% - 24px)', minWidth: 18, height: 18, padding: '0 4px', background: '#f97316', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0f766e', zIndex: 2 }}>
                  {neededCount > 9 ? '9+' : neededCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
