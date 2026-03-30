/**
 * MigrationModal — shown once when a user logs in for the first time
 * and we detect they have locally-saved data that hasn't been uploaded
 * to their new account yet.
 *
 * Logic:
 *  - Cloud returned 404 / empty (no data for this email)
 *  - localStorage has non-default data (dishes or ingredients > initial count)
 *  - Key `despensa_migration_offered` not yet set (only ask once)
 */
import { useState } from 'react';

interface Props {
  onMigrate: () => void;   // caller should upload local data to cloud
  onSkip: () => void;      // caller should start fresh
}

export default function MigrationModal({ onMigrate, onSkip }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleMigrate() {
    setLoading(true);
    try {
      await onMigrate();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '36px 32px',
        maxWidth: '400px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', marginBottom: '10px' }}>
          Tienes datos guardados localmente
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.6, marginBottom: '24px' }}>
          Hemos detectado ingredientes, platos y datos guardados en este dispositivo antes de crear tu cuenta.
          ¿Quieres <strong>importarlos a tu nueva cuenta</strong> para no perderlos?
        </p>

        <button
          onClick={handleMigrate}
          disabled={loading}
          style={{
            width: '100%', padding: '13px',
            background: loading ? '#86efac' : '#16a34a',
            color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '10px',
          }}
        >
          {loading ? 'Importando…' : '✅ Sí, importar mis datos'}
        </button>

        <button
          onClick={onSkip}
          disabled={loading}
          style={{
            width: '100%', padding: '11px',
            background: 'none', color: '#9ca3af',
            border: '1.5px solid #e5e7eb', borderRadius: '12px',
            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          No, empezar desde cero
        </button>
      </div>
    </div>
  );
}

/**
 * Returns true if the user has meaningful local data that's worth migrating.
 * We check for non-default dishes or ingredients (length > 0 for tickets is also a signal).
 */
export function hasLocalDataToMigrate(): boolean {
  try {
    const migrationOffered = localStorage.getItem('despensa_migration_offered');
    if (migrationOffered) return false; // already offered, don't ask again

    const dishes = JSON.parse(localStorage.getItem('despensa_dishes_v4') || '[]');
    const tickets = JSON.parse(localStorage.getItem('despensa_tickets_v4') || '[]');
    const plan = JSON.parse(localStorage.getItem('despensa_plan_v4') || '{}');

    // Consider there's data worth migrating if user has custom dishes or any tickets
    const hasCustomDishes = Array.isArray(dishes) && dishes.length > 0;
    const hasTickets = Array.isArray(tickets) && tickets.length > 0;
    const hasPlan = Object.keys(plan).length > 0;

    return hasCustomDishes || hasTickets || hasPlan;
  } catch {
    return false;
  }
}

export function markMigrationOffered() {
  try { localStorage.setItem('despensa_migration_offered', '1'); } catch {}
}
