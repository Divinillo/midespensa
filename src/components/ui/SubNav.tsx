import React from 'react';

interface SubNavProps {
  items: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}

export function SubNav({ items, active, onChange }: SubNavProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 4,
        padding: 3,
        background: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      {items.map(item => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 10,
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#0f766e' : '#64748b',
              background: isActive ? '#fff' : 'transparent',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
