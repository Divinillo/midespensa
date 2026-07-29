import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Session } from '@supabase/supabase-js';
import { FREE_DISH_LIMIT, FREE_TICKET_LIMIT } from './data/categories';
import { Header } from './components/layout/Header';
import { Nav } from './components/layout/Nav';
import { SubNav } from './components/ui/SubNav';
import { Modal } from './components/ui/Modal';
import { PlanMensual } from './features/plan/PlanMensual';
import { Platos } from './features/platos/Platos';
import { Catalogo } from './features/despensa/Catalogo';
import { Tickets } from './features/tickets/Tickets';
import { ListaCompra } from './features/lista/ListaCompra';
import { ResumenGasto } from './features/gastos/ResumenGasto';
import { Nutricion } from './features/nutricion/Nutricion';
import { UpgradeModal } from './features/onboarding/OnboardingCard';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import LoginScreen from './features/auth/LoginScreen';
import CookieBanner from './components/CookieBanner';
import { PWAInstallWizard } from './components/PWAInstallWizard';
import MigrationModal, { hasLocalDataToMigrate, markMigrationOffered } from './components/MigrationModal';
import { useLS } from './hooks/useLS';
import { scheduleSyncToCloud, loadFromCloud, hashPin } from './utils/cloud';
import { getPromoState, redeemReferral, type PromoState } from './utils/promoApi';
import { ReviewPromptModal } from './components/ReviewPromptModal';
import { supabase } from './utils/supabase';
import { useMarket } from './i18n/useMarket';
import { SettingsPanel } from './features/settings/SettingsPanel';
import type { Ingredient, Dish, Plan, Ticket, PriceHistory, Section } from './data/types';

/** Marca como disponibles los ingredientes que aparecen como matched en los tickets. */
function isStandaloneApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function reconcileAvailability(ingredients: Ingredient[], tickets: Ticket[]): Ingredient[] {
  const matchedNames = new Set<string>();
  for (const t of tickets) {
    for (const item of (t.matched || [])) {
      if (item.ingredientName) matchedNames.add(item.ingredientName.toLowerCase());
      if (item.ing?.id) {
        const ing = ingredients.find(i => i.id === item.ing.id);
        if (ing) matchedNames.add(ing.name.toLowerCase());
      }
    }
  }
  if (!matchedNames.size) return ingredients;
  return ingredients.map(i =>
    matchedNames.has(i.name.toLowerCase()) && !i.available ? { ...i, available: true } : i
  );
}

const INIT_DISHES_ES: Dish[] = [
  { id: 'd12', name: 'Salmón con espárragos', ingredients: ['i3', 'i24'], example: true },
];
const INIT_DISHES_US: Dish[] = [
  { id: 'd12', name: 'Salmon with asparagus', ingredients: ['u199', 'u100'], example: true },
];

const TITLES_ES: Record<Section, string> = {
  plan: 'Plan semanal', platos: 'Platos habituales', cat: 'Catálogo de ingredientes',
  ticket: 'Tickets del supermercado', lista: 'Lista de la compra',
  nutri: 'Valor nutricional', gastos: 'Resumen de gasto',
};
const TITLES_EN: Record<Section, string> = {
  plan: 'Weekly Plan', platos: 'Your Recipes', cat: 'Ingredient Catalog',
  ticket: 'Receipts', lista: 'Shopping List',
  nutri: 'Nutrition', gastos: 'Spending Summary',
};

/**
 * One-time migration: copies old un-prefixed localStorage keys to new
 * user-prefixed keys so existing users keep their data after the update.
 */
function migrateUserData(uid: string) {
  const migrationKey = `u_${uid}_migrated`;
  if (localStorage.getItem(migrationKey)) return;

  const KEY_PAIRS = [
    ['despensa_plan_v4',      `u_${uid}_despensa_plan_v4`],
    ['despensa_tickets_v4',   `u_${uid}_despensa_tickets_v4`],
    ['despensa_prices_v4',    `u_${uid}_despensa_prices_v4`],
    ['despensa_learned_v1',   `u_${uid}_despensa_learned_v1`],
    ['despensa_wizard_v1',    `u_${uid}_despensa_wizard_v1`],
    ['despensa_ings_v4',      `u_${uid}_despensa_ings_v4`],
    ['despensa_ings_us_v1',   `u_${uid}_despensa_ings_us_v1`],
    ['despensa_dishes_v4',    `u_${uid}_despensa_dishes_v4`],
    ['despensa_dishes_us_v1', `u_${uid}_despensa_dishes_us_v1`],
    ['despensa_local_ts',     `u_${uid}_despensa_local_ts`],
    ['despensa_pin_hash',     `u_${uid}_despensa_pin_hash`],
  ];

  for (const [oldKey, newKey] of KEY_PAIRS) {
    try {
      const oldVal = localStorage.getItem(oldKey);
      if (oldVal && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, oldVal);
      }
    } catch {}
  }

  try { localStorage.setItem(migrationKey, '1'); } catch {}
}


// Capture referral code from URL as early as possible (before auth redirects)
try {
  const _ref = new URLSearchParams(window.location.search).get('ref');
  if (_ref && /^[A-Za-z2-9]{8}$/i.test(_ref)) {
    localStorage.setItem('despensa_pending_ref', _ref.toUpperCase());
  }
} catch {}

export function App() {
  // ── Supabase auth session ─────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setAuthLoading(false), 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setAuthLoading(false);
      })
      .catch(() => {
        setAuthLoading(false);
      })
      .finally(() => clearTimeout(timeout));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // ── Auth guard ────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8faf9',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Cargando...</span>
        </div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;

  // key={session.user.id} forces React to fully remount when a different user logs in,
  // so all hooks re-initialize with the new user's localStorage keys.
  return <AuthenticatedApp key={session.user.id} session={session} />;
}


function AuthenticatedApp({ session }: { session: Session }) {
  // ── i18n + market ──────────────────────────────────────────────
  const { t, i18n } = useTranslation();
  const { market, isUS, isEN, initIngredients, formatPrice, currency, stripeConfig } = useMarket();

  // ── Per-user localStorage key prefix ──────────────────────────
  const uid = session.user.id.slice(0, 8);

  // Run migration SYNCHRONOUSLY before useLS hooks read from localStorage.
  // This ensures existing un-prefixed data gets copied to the new prefixed keys
  // before useState initializers read them.
  const migrationDoneRef = useRef(false);
  if (!migrationDoneRef.current) {
    migrationDoneRef.current = true;
    migrateUserData(uid);
  }

  // ── Data state (keys prefixed with uid for per-account isolation) ──
  const [section, setSection] = useLS<Section>('despensa_section_v1', 'plan');
  const ingKey = isUS ? `u_${uid}_despensa_ings_us_v1` : `u_${uid}_despensa_ings_v4`;
  const [ingredients, setIngredients] = useLS<Ingredient[]>(ingKey, initIngredients);
  const dishKey = isUS ? `u_${uid}_despensa_dishes_us_v1` : `u_${uid}_despensa_dishes_v4`;
  const [dishes, setDishes] = useLS<Dish[]>(dishKey, isUS ? INIT_DISHES_US : INIT_DISHES_ES);
  const [plan, setPlan] = useLS<Plan>(`u_${uid}_despensa_plan_v4`, {});
  const [tickets, setTickets] = useLS<Ticket[]>(`u_${uid}_despensa_tickets_v4`, []);
  const [priceHistory, setPriceHistory] = useLS<PriceHistory>(`u_${uid}_despensa_prices_v4`, {});
  const [learnedMappings, setLearnedMappings] = useLS<Record<string,string>>(`u_${uid}_despensa_learned_v1`, {});
  // isPro is derived exclusively from the cloud tier — never from localStorage
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [trialEnd, setTrialEnd] = useState<number | null>(null);
  const [wizardDone, setWizardDone] = useLS<boolean>(`u_${uid}_despensa_wizard_v1`, false);
  const [userEmail, setUserEmail] = useLS<string>('despensa_email_v1', '');
  const [syncStatus, setSyncStatus] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverMsg, setRecoverMsg] = useState('');
  const [recoverPin, setRecoverPin] = useState('');
  const [recoverNeedsPin, setRecoverNeedsPin] = useState(false);
  const [pinSetup, setPinSetup] = useState('');
  const [pinSetupConfirm, setPinSetupConfirm] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPWAWizard, setShowPWAWizard] = useState(false);
  const [importError, setImportError] = useState('');
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null);
  const [showMigration, setShowMigration] = useState(false);
  const [promoState, setPromoState] = useState<PromoState | null>(null);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Sync session email → userEmail + load cloud data when session is ready
  const cloudLoadedRef = useRef(false);
  useEffect(() => {
    if (!session?.user?.email) return;
    const email = session.user.email;
    setUserEmail(email);
    if (cloudLoadedRef.current) return;
    cloudLoadedRef.current = true;
    loadFromCloud(email).then(async cloud => {
      if (!cloud || cloud.error === 'No data found') {
        // New user: trigger first sync so the server creates trial_end, then reload tier
        try {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          if (token) {
            await fetch('/api/sync-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ email, updated_at: Date.now() }),
            });
            const reloaded = await loadFromCloud(email);
            if (reloaded && !reloaded.error) applyTier(reloaded);
          }
        } catch {}
        if (hasLocalDataToMigrate()) setShowMigration(true);
        markMigrationOffered();
        return;
      }
      const localTs = parseInt(localStorage.getItem(`u_${uid}_despensa_local_ts`) || '0');
      const cloudTs = cloud.updated_at || 0;

      // Always apply tier/trial from cloud regardless of timestamp
      applyTier(cloud);

      if (cloudTs <= localTs) return;

      if (cloud.dishes?.length > 0) setDishes(cloud.dishes);
      if (cloud.tickets?.length > 0) setTickets(cloud.tickets);
      if (cloud.ingredients?.length > 0) {
        const ings = reconcileAvailability(cloud.ingredients, cloud.tickets || []);
        setIngredients(ings);
      }
      if (cloud.price_history && Object.keys(cloud.price_history).length > 0) setPriceHistory(cloud.price_history);
      if (cloud.plan && Object.keys(cloud.plan).length > 0) setPlan(cloud.plan);
      setSyncStatus('☁️ Sincronizado');
      setTimeout(() => setSyncStatus(''), 3000);
    });
  }, [session]);

  function applyTier(cloud: any) {
    const paidPro = cloud.tier === 'pro';
    const trialActive = cloud.tier === 'trial';
    setIsPro(paidPro || trialActive);
    setIsTrial(trialActive && !paidPro);
    setTrialEnd(cloud.trial_end ?? null);
  }

  // ── Promo: load state, redeem pending referral, review prompt ──
  const promoLoadedRef = useRef(false);
  useEffect(() => {
    if (!session?.user?.email || promoLoadedRef.current) return;
    promoLoadedRef.current = true;
    (async () => {
      // Small delay so the first sync (new users) creates the data row first
      await new Promise(r => setTimeout(r, 4000));
      let res = await getPromoState();
      // Redeem pending referral code captured from a share link (?ref=CODE)
      try {
        const pending = localStorage.getItem('despensa_pending_ref');
        if (pending && res?.ok && res.promo && pending !== res.promo.ref_code) {
          const redeemed = await redeemReferral(pending);
          if (redeemed?.ok || ['Already redeemed', 'Code not found', 'Own code'].includes(redeemed?.error ?? '')) {
            localStorage.removeItem('despensa_pending_ref');
          }
          if (redeemed?.ok && redeemed.promo) res = redeemed;
        } else if (pending && res?.ok && res.promo && pending === res.promo.ref_code) {
          localStorage.removeItem('despensa_pending_ref');
        }
      } catch {}
      if (res?.ok && res.promo) setPromoState(res.promo);
      // Review prompt: once per user, from the 3rd app open, if not yet reviewed
      try {
        const opensKey = `u_${uid}_promo_opens`;
        const opens = parseInt(localStorage.getItem(opensKey) || '0') + 1;
        localStorage.setItem(opensKey, String(opens));
        const promptedKey = `u_${uid}_review_prompted`;
        if (opens >= 3 && !localStorage.getItem(promptedKey) && res?.ok && res.promo && !res.promo.review_claimed) {
          localStorage.setItem(promptedKey, '1');
          setShowReviewPrompt(true);
        }
      } catch {}
    })();
  }, [session]);

  async function refreshTierFromCloud() {
    const email = session?.user?.email;
    if (!email) return;
    const cloud = await loadFromCloud(email);
    if (cloud && !cloud.error) applyTier(cloud);
  }

  function handlePromoUpdate(p: PromoState, grantedDays: number) {
    setPromoState(p);
    if (grantedDays > 0) refreshTierFromCloud();
  }

  // Stripe activation URL cleanup on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('activated') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Migrate: add new initIngredients not yet in localStorage
  useEffect(() => {
    const existingIds = new Set(ingredients.map(i => i.id));
    const missing = initIngredients.filter(i => !existingIds.has(i.id));
    const needsMigration = ingredients.some(i => i.needed === undefined);
    if (missing.length > 0 || needsMigration) {
      setIngredients(prev => [
        ...prev.map(i => i.needed === undefined ? { ...i, needed: false } : i),
        ...missing.map(i => ({ ...i, needed: false })),
      ]);
    }
  }, []);

  // Auto-sync to cloud on data change
  useEffect(() => {
    if (!userEmail) return;
    const ts = Date.now();
    try { localStorage.setItem(`u_${uid}_despensa_local_ts`, String(ts)); } catch {}
    const savedPinHash = (() => { try { return localStorage.getItem(`u_${uid}_despensa_pin_hash`) || undefined; } catch { return undefined; } })();
    scheduleSyncToCloud(userEmail, () => ({
      dishes, ingredients, tickets, price_history: priceHistory, plan, updated_at: ts,
      ...(savedPinHash ? { recovery_pin_hash: savedPinHash } : {}),
    }));
  }, [dishes, ingredients, tickets, priceHistory, plan, userEmail]);

  const neededCount = ingredients.filter(i => i.needed).length;
  const pendingCount = tickets.filter(t => (t.unmatched || []).length > 0).length;

  const exportData = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), ingredients, dishes, plan, tickets, priceHistory };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `despensa-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.ingredients || !data.dishes) throw new Error('Fichero no válido');
        if (data.ingredients) setIngredients(data.ingredients);
        if (data.dishes) setDishes(data.dishes);
        if (data.plan) setPlan(data.plan);
        if (data.tickets) setTickets(data.tickets);
        if (data.priceHistory) setPriceHistory(data.priceHistory);
        setImportError(''); setShowSettings(false);
        alert('✅ Datos importados correctamente');
      } catch { setImportError('Error al leer el fichero. Asegúrate de que es un backup válido.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const resetWizard = () => { setWizardDone(false); setShowSettings(false); };

  // ── Onboarding wizard ─────────────────────────────────────────
  if (!wizardDone) {
    return (
      <OnboardingWizard
        ingredients={ingredients}
        setIngredients={setIngredients}
        dishes={dishes}
        setDishes={setDishes}
        tickets={tickets}
        setTickets={setTickets}
        priceHistory={priceHistory}
        setPriceHistory={setPriceHistory}
        onComplete={() => {
          setWizardDone(true);
          setSection('plan');
        }}
      />
    );
  }

  // ── Trial helpers ─────────────────────────────────────────────
  const now = Date.now();
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : 0;

  // ── Plan status for Settings modal ────────────────────────────
  const planLabel = isTrial
    ? isEN
      ? `🎁 Pro trial · ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`
      : `🎁 Prueba Pro · ${trialDaysLeft} día${trialDaysLeft !== 1 ? 's' : ''} restante${trialDaysLeft !== 1 ? 's' : ''}`
    : isPro
      ? (isEN ? '✨ Pro version active' : '✨ Versión Pro activa')
      : (isEN ? '🔒 Free plan' : '🔒 Plan gratuito');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8faf9' }}>
        <a href="#main-content" className="skip-nav">Skip to content</a>
      <Header
        section={section} isPro={isPro} neededCount={neededCount}
        pendingCount={pendingCount} syncStatus={syncStatus}
        onSettings={() => setShowSettings(true)} onNavigate={setSection}
      />

      {/* Trial banner — only visible during active trial period */}
      {isTrial && (
        <div style={{
          background: trialDaysLeft <= 2 ? '#fffbeb' : '#f0fdf4',
          borderBottom: `1px solid ${trialDaysLeft <= 2 ? '#fde68a' : '#bbf7d0'}`,
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontSize: '0.74rem',
          color: trialDaysLeft <= 2 ? '#92400e' : '#166534',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 500 }}>
            {trialDaysLeft <= 0
              ? (isEN ? '⏰ Your Pro trial has ended' : '⏰ Tu periodo de prueba Pro ha terminado')
              : trialDaysLeft === 1
              ? (isEN ? '⏳ Last day of your Pro trial' : '⏳ Último día de prueba Pro')
              : isEN
              ? `🎁 ${trialDaysLeft} days of Pro trial left`
              : `🎁 ${trialDaysLeft} días de prueba Pro restantes`}
          </span>
          <button
            onClick={() => setUpgradeModal('trial')}
            style={{
              background: trialDaysLeft <= 2 ? '#d97706' : '#0d9488',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isEN
              ? `Subscribe · ${formatPrice(stripeConfig.monthly)}/mo →`
              : `Suscribirse · ${formatPrice(stripeConfig.monthly)}/mes →`}
          </button>
        </div>
      )}

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => { setShowSettings(false); setImportError(''); setRecoverEmail(''); setRecoverMsg(''); }} title={isEN ? '⚙️ Settings' : '⚙️ Ajustes'}>
        <SettingsPanel
          session={session}
          syncStatus={syncStatus}
          isPro={isPro}
          isTrial={isTrial}
          trialDaysLeft={trialDaysLeft}
          dishes={dishes}
          tickets={tickets}
          freeDishLimit={FREE_DISH_LIMIT}
          freeTicketLimit={FREE_TICKET_LIMIT}
          isEN={isEN}
          isUS={isUS}
          formatPrice={formatPrice}
          stripeConfig={stripeConfig}
          exportData={exportData}
          importData={importData}
          importError={importError}
          resetWizard={resetWizard}
          onInstallPWA={() => { setShowSettings(false); setShowPWAWizard(true); }}
          isStandalone={isStandaloneApp()}
          onUpgrade={(reason) => { setShowSettings(false); setUpgradeModal(reason); }}
          onClose={() => setShowSettings(false)}
          promo={promoState}
          onPromoUpdate={handlePromoUpdate}
        />
      </Modal>

      {showReviewPrompt && (
        <ReviewPromptModal
          isEN={isEN}
          onClose={() => setShowReviewPrompt(false)}
          onClaimed={(days) => {
            setPromoState(p => p ? { ...p, review_claimed: true } : p);
            if (days > 0) refreshTierFromCloud();
          }}
        />
      )}

      <UpgradeModal
        open={!!upgradeModal}
        reason={upgradeModal || 'reports'}
        onClose={() => setUpgradeModal(null)}
        onUnlockPro={() => setIsPro(true)}
        userEmail={userEmail}
      />

      {showMigration && (
        <MigrationModal
          onMigrate={async () => {
            const email = session?.user?.email || userEmail;
            if (!email) return;
            const { data: { session: s } } = await supabase.auth.getSession();
            const token = s?.access_token;
            if (!token) return;
            const ts = Date.now();
            try { localStorage.setItem(`u_${uid}_despensa_local_ts`, String(ts)); } catch {}
            await fetch('/api/sync-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ email, dishes, ingredients, tickets, price_history: priceHistory, plan, updated_at: ts }),
            });
            setShowMigration(false);
            setSyncStatus('☁️ Datos importados');
            setTimeout(() => setSyncStatus(''), 3000);
          }}
          onSkip={() => setShowMigration(false)}
        />
      )}

      <CookieBanner />
      <PWAInstallWizard />
      {showPWAWizard && <PWAInstallWizard forceOpen onClose={() => setShowPWAWizard(false)} />}

      <main id="main-content" className="flex-1 max-w-lg mx-auto w-full px-4 pb-28" style={{ paddingTop: 20 }}>
        {/* Sub-navigation toggles for grouped sections */}
        {(section === 'plan' || section === 'lista') && (
          <SubNav
            items={[
              { id: 'plan', label: isEN ? '🗓 Plan' : '🗓 Plan' },
              { id: 'lista', label: isEN ? '🛒 Shopping list' : '🛒 Lista de compra' },
            ]}
            active={section}
            onChange={(id) => setSection(id as Section)}
          />
        )}
        {(section === 'ticket' || section === 'gastos') && (
          <SubNav
            items={[
              { id: 'ticket', label: isEN ? '🧾 Receipts' : '🧾 Tickets' },
              { id: 'gastos', label: isEN ? '💰 Spending' : '💰 Gastos' },
            ]}
            active={section}
            onChange={(id) => setSection(id as Section)}
          />
        )}

        <div className="section-fade-enter" key={section}>
          {section === 'plan' && <PlanMensual plan={plan} setPlan={setPlan} dishes={dishes} ingredients={ingredients} setIngredients={setIngredients} tickets={tickets} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
          {section === 'platos' && <Platos dishes={dishes} setDishes={setDishes} ingredients={ingredients} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
          {section === 'cat' && <Catalogo ingredients={ingredients} setIngredients={setIngredients} isPro={isPro} />}
          {section === 'ticket' && <Tickets tickets={tickets} setTickets={setTickets} ingredients={ingredients} setIngredients={setIngredients} priceHistory={priceHistory} setPriceHistory={setPriceHistory} learnedMappings={learnedMappings} setLearnedMappings={setLearnedMappings} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
          {section === 'lista' && <ListaCompra plan={plan} dishes={dishes} ingredients={ingredients} setIngredients={setIngredients} priceHistory={priceHistory} isPro={isPro} />}
          {section === 'nutri' && <Nutricion isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
          {section === 'gastos' && <ResumenGasto tickets={tickets} ingredients={ingredients} priceHistory={priceHistory} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
        </div>
      </main>

      <Nav section={section} neededCount={neededCount} pendingCount={pendingCount} isPro={isPro} onNavigate={setSection} />
    </div>
  );
}
