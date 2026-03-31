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
      style={{ backgroundColor: 'rgba(15,23,42,.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as React.CSSProperties}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-t-2xl sm:rounded-2xl w-full ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'} max-h-[92vh] flex flex-col slide-up`}
        style={{ boxShadow: '0 -4px 32px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle – mobile only */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="w-8 h-1 rounded-full" style={{ background: '#e2e8f0' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="font-semibold text-gray-900" style={{ fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600"
            style={{ width: 28, height: 28, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '1.1rem', lineHeight: 1, transition: 'all .15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#374151'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#9ca3af'; }}
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
