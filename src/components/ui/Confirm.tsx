import React from 'react';

interface ConfirmProps {
  open: boolean;
  msg: string;
  onOk: () => void;
  onCancel: () => void;
}

export function Confirm({ open, msg, onOk, onCancel }: ConfirmProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as React.CSSProperties}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xs fade-in"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.04)', padding: '1.5rem' }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ background: '#fef2f2', fontSize: '1.25rem' }}
        >
          🗑️
        </div>

        {/* Message */}
        <p className="text-center font-medium text-gray-700 mb-5" style={{ fontSize: '0.875rem', lineHeight: 1.55 }}>
          {msg}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'background .15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}
          >
            Cancelar
          </button>
          <button
            onClick={onOk}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#ef4444', transition: 'background .15s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
