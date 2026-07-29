import React, { useState } from 'react';
import { claimReviewReward, PLAY_STORE_URL } from '../utils/promoApi';
import { isPromoActive } from './LogrosCard';

interface ReviewPromptModalProps {
  isEN: boolean;
  onClose: () => void;
  onClaimed: (grantedDays: number) => void;
}

export function ReviewPromptModal({ isEN, onClose, onClaimed }: ReviewPromptModalProps) {
  const [step, setStep] = useState<'ask' | 'visited' | 'claiming' | 'done'>('ask');
  const [granted, setGranted] = useState(0);
  const promoOn = isPromoActive();

  async function handleClaim() {
    setStep('claiming');
    const res = await claimReviewReward();
    if (res?.ok) {
      const days = res.granted_days ?? 0;
      setGranted(days);
      onClaimed(days);
      setStep('done');
    } else {
      setStep('done');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as React.CSSProperties}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xs fade-in"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.04)', padding: '1.5rem', textAlign: 'center' }}
      >
        {step === 'done' ? (
          <>
            <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>🎉</div>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              {granted > 0
                ? (isEN ? `+${granted} Pro days added!` : `¡+${granted} días Pro añadidos!`)
                : (isEN ? 'Trophy unlocked!' : '¡Trofeo desbloqueado!')}
            </p>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              {isEN ? 'Thank you for supporting MiDespensa 💚' : 'Gracias por apoyar MiDespensa 💚'}
            </p>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              {isEN ? 'Continue' : 'Continuar'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>⭐</div>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              {isEN ? 'Enjoying MiDespensa?' : '¿Te está gustando MiDespensa?'}
            </p>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              {promoOn
                ? (isEN
                    ? 'Leave us a review on Google Play and get 7 days of Pro for free.'
                    : 'Déjanos una reseña en Google Play y te regalamos 7 días de Pro.')
                : (isEN
                    ? 'Leave us a review on Google Play — it helps a lot!'
                    : 'Déjanos una reseña en Google Play — ¡nos ayuda muchísimo!')}
            </p>

            {step === 'ask' ? (
              <button
                onClick={() => { window.open(PLAY_STORE_URL, '_blank'); setStep('visited'); }}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                  background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                  cursor: 'pointer', marginBottom: 8,
                }}
              >
                {promoOn
                  ? (isEN ? '⭐ Review → +7 Pro days' : '⭐ Dejar reseña → +7 días Pro')
                  : (isEN ? '⭐ Leave a review' : '⭐ Dejar reseña')}
              </button>
            ) : (
              <button
                onClick={handleClaim}
                disabled={step === 'claiming'}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                  background: '#d97706', color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                  cursor: 'pointer', marginBottom: 8, opacity: step === 'claiming' ? 0.6 : 1,
                }}
              >
                {step === 'claiming'
                  ? (isEN ? 'Verifying…' : 'Verificando…')
                  : (isEN ? '✓ Done — claim my reward' : '✓ Hecho — reclamar mi regalo')}
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
              }}
            >
              {isEN ? 'Not now' : 'Ahora no'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
