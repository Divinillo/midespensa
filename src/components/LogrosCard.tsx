import React, { useState } from 'react';
import type { PromoState } from '../utils/promoApi';
import { registerShare, claimReviewReward, buildShareUrl, PLAY_STORE_URL } from '../utils/promoApi';

/** Promo window shown in UI — keep in sync with functions/api/promo-reward.ts */
export const PROMO_END_MS = Date.parse('2026-08-31T23:59:59Z');
export const isPromoActive = () => Date.now() < PROMO_END_MS;

interface LogrosCardProps {
  isEN: boolean;
  promo: PromoState | null;
  onPromoUpdate: (p: PromoState, grantedDays: number) => void;
}

interface Trophy {
  emoji: string;
  label: string;
  achieved: boolean;
  sub: string;
}

export function LogrosCard({ isEN, promo, onPromoUpdate }: LogrosCardProps) {
  const [copying, setCopying] = useState(false);
  const [reviewStep, setReviewStep] = useState<'idle' | 'visited' | 'claiming'>('idle');
  const [toast, setToast] = useState<string | null>(null);

  const shares = promo?.shares ?? 0;
  const referrals = promo?.referrals ?? 0;
  const reviewed = promo?.review_claimed ?? false;
  const promoOn = isPromoActive();

  const trophies: Trophy[] = [
    {
      emoji: '🏆',
      label: isEN ? 'Reviewer' : 'Reseñador',
      achieved: reviewed,
      sub: isEN ? 'Leave a review' : 'Deja una reseña',
    },
    {
      emoji: '🥉',
      label: isEN ? 'Bronze' : 'Bronce',
      achieved: shares >= 1,
      sub: isEN ? 'Share 1 time' : 'Comparte 1 vez',
    },
    {
      emoji: '🥈',
      label: isEN ? 'Silver' : 'Plata',
      achieved: shares >= 5,
      sub: isEN ? 'Share 5 times' : 'Comparte 5 veces',
    },
    {
      emoji: '🥇',
      label: isEN ? 'Gold' : 'Oro',
      achieved: shares >= 10,
      sub: isEN ? 'Share 10 times' : 'Comparte 10 veces',
    },
    {
      emoji: '⭐',
      label: isEN ? 'Ambassador' : 'Embajador',
      achieved: referrals >= 3,
      sub: isEN ? '3 friends joined' : '3 amigos registrados',
    },
  ];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  async function handleShare() {
    const url = buildShareUrl(promo?.ref_code);
    const text = isEN
      ? 'I’m using MiDespensa to plan my meals and track my pantry — check it out!'
      : 'Estoy usando MiDespensa para planificar mis comidas y organizar mi despensa. ¡Échale un vistazo!';
    let shared = false;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'MiDespensa', text, url });
        shared = true;
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopying(true);
        setTimeout(() => setCopying(false), 2000);
        shared = true;
      }
    } catch {
      return; // user cancelled the share sheet
    }
    if (!shared) return;
    const res = await registerShare();
    if (res?.ok && res.promo) {
      onPromoUpdate(res.promo, res.granted_days ?? 0);
      if ((res.granted_days ?? 0) > 0) {
        showToast(isEN
          ? `🎉 +${res.granted_days} Pro days added!`
          : `🎉 ¡+${res.granted_days} días Pro añadidos!`);
      }
    }
  }

  async function handleReviewClaim() {
    setReviewStep('claiming');
    const res = await claimReviewReward();
    if (res?.ok && res.promo) {
      onPromoUpdate(res.promo, res.granted_days ?? 0);
      showToast((res.granted_days ?? 0) > 0
        ? (isEN ? `🎉 +${res.granted_days} Pro days — thank you!` : `🎉 ¡+${res.granted_days} días Pro — gracias!`)
        : (isEN ? '🏆 Trophy unlocked — thank you!' : '🏆 Trofeo desbloqueado — ¡gracias!'));
    }
    setReviewStep('idle');
  }

  async function copyRefCode() {
    if (!promo?.ref_code) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(promo.ref_code));
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch {}
  }

  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', margin: '0 2px 8px' }}>
        {isEN ? 'ACHIEVEMENTS' : 'LOGROS'}
      </div>
      <div style={{ borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', background: '#fff', padding: 14 }}>

        {/* Promo banner */}
        {promoOn && (
          <div style={{
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
            background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
            border: '1px solid #f0abfc',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#a21caf' }}>
              {isEN
                ? '🎁 This month only: earn free Pro days with every achievement'
                : '🎁 Solo este mes: gana días Pro gratis con cada logro'}
            </span>
          </div>
        )}

        {/* Trophies */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {trophies.map(t => (
            <div key={t.label} style={{
              flex: '1 1 30%', minWidth: 92, textAlign: 'center',
              borderRadius: 10, padding: '10px 4px',
              background: t.achieved ? '#fefce8' : '#f8fafc',
              border: `1px solid ${t.achieved ? '#fde68a' : '#f1f5f9'}`,
              opacity: t.achieved ? 1 : 0.55,
            }}>
              <div style={{ fontSize: '1.4rem', filter: t.achieved ? 'none' : 'grayscale(1)' }}>{t.emoji}</div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: t.achieved ? '#92400e' : '#94a3b8', marginTop: 2 }}>{t.label}</div>
              <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{t.sub}</div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontSize: '0.72rem', color: '#64748b' }}>
          <span>📤 {shares} {isEN ? 'shares' : 'compartidos'}</span>
          <span>·</span>
          <span>👥 {referrals} {isEN ? 'friends joined' : 'amigos registrados'}</span>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
            background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
            cursor: 'pointer', marginBottom: 8,
          }}
        >
          {copying
            ? (isEN ? '✓ Link copied!' : '✓ ¡Enlace copiado!')
            : promoOn
              ? (isEN ? '📤 Share & earn Pro days' : '📤 Comparte y gana días Pro')
              : (isEN ? '📤 Share MiDespensa' : '📤 Compartir MiDespensa')}
        </button>

        {/* Review reward */}
        {!reviewed && (
          reviewStep === 'idle' ? (
            <button
              onClick={() => { window.open(PLAY_STORE_URL, '_blank'); setReviewStep('visited'); }}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10,
                border: '1.5px solid #fde68a', background: '#fffbeb', color: '#92400e',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {promoOn
                ? (isEN ? '⭐ Review us on Google Play → +7 Pro days' : '⭐ Valóranos en Google Play → +7 días Pro')
                : (isEN ? '⭐ Review us on Google Play' : '⭐ Valóranos en Google Play')}
            </button>
          ) : (
            <button
              onClick={handleReviewClaim}
              disabled={reviewStep === 'claiming'}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                background: '#d97706', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', opacity: reviewStep === 'claiming' ? 0.6 : 1,
              }}
            >
              {reviewStep === 'claiming'
                ? (isEN ? 'Verifying…' : 'Verificando…')
                : (isEN ? '✓ I left my review — claim reward' : '✓ Ya he dejado mi reseña — reclamar')}
            </button>
          )
        )}

        {/* Referral code */}
        {promo?.ref_code && (
          <div
            onClick={copyRefCode}
            style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 10,
              background: '#f8fafc', border: '1px dashed #cbd5e1',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            title={isEN ? 'Copy link' : 'Copiar enlace'}
          >
            <div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>
                {isEN ? 'YOUR CODE' : 'TU CÓDIGO'}
                {promoOn && <span> · {isEN ? '+1 Pro day per friend' : '+1 día Pro por amigo'}</span>}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.1em' }}>{promo.ref_code}</div>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#0d9488', fontWeight: 700 }}>
              {copying ? (isEN ? '✓ Copied' : '✓ Copiado') : (isEN ? 'Copy' : 'Copiar')}
            </span>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 10,
            background: '#ecfdf5', border: '1px solid #a7f3d0',
            fontSize: '0.75rem', fontWeight: 600, color: '#047857', textAlign: 'center',
          }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
