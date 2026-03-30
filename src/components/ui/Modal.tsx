import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as React.CSSProperties}
      onClick={onClose}
    >
      <div
        className={`rounded-t-2xl sm:rounded-2xl w-full ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'} max-h-[92vh] flex flex-col slide-up`}
        style={{
          background: '#0d1a0f',
          border: '1px solid rgba(74,222,128,0.12)',
          boxShadow: '0 -8px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(74,222,128,0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle – mobile only */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="w-8 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(74,222,128,0.08)' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#f0fdf4' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              fontSize: '1.1rem', lineHeight: 1, color: 'rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s ease',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1">{children}</div>
      </div>
    </div>
  );
}
