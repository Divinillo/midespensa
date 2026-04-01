import React, { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { FREE_DISH_LIMIT, FREE_TICKET_LIMIT } from './data/categories';
import { Header } from './components/layout/Header';
import { Nav } from './components/layout/Nav';
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
import { supabase } from './utils/supabase';
import { INIT_INGS } from './data/ingredients';
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

const INIT_DISHES: Dish[] = [
  { id: 'd12', name: 'Salmón con espárragos', ingredients: ['i3', 'i24'], example: true },
];

const TITLES: Record<Section, string> = {
  plan: 'Plan mensual', platos: 'Platos habituales', cat: 'Catálogo de ingredientes',
  ticket: 'Tickets del supermercado', lista: 'Lista de la compra',
  nutri: 'Valor nutricional', gastos: 'Resumen de gasto',
};

/** Días restantes de prueba (negativo si expirada) */
function trialDaysLeft(trialEnd: number): number {
  return Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24));
}

export function App() {
  // ── Supabase auth session ─────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [section, setSection] = useLS<Section>('despensa_section_v1', 'plan');
  const [ingredients, setIngredients] = useLS<Ingredient[]>('despensa_ings_v4', INIT_INGS);
  const [dishes, setDishes] = useLS<Dish[]>('despensa_dishes_v4', INIT_DISHES);
  const [plan, setPlan] = useLS<Plan>('despensa_plan_v4', {});
  const [tickets, setTickets] = useLS<Ticket[]>('despensa_tickets_v4', []);
  const [priceHistory, setPriceHistory] = useLS<PriceHistory>('despensa_prices_v4', {});
  const [learnedMappings, setLearnedMappings] = useLS<Record<string,string>>('despensa_learned_v1', {});
  // isPro is derived exclusively from the cloud tier — never from localStorage
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [trialEnd, setTrialEnd] = useState<number>(0);
  const [wizardDone, setWizardDone] = useLS<boolean>('despensa_wizard_v1', false);
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
  const importRef = useRef<HTMLInputElement>(null);

  // Sync session email → userEmail + load cloud data when session is ready
  const cloudLoadedRef = useRef(false);
  useEffect(() => {
    if (!session?.user?.email) return;
    const email = session.user.email;
    setUserEmail(email);
    if (cloudLoadedRef.current) return;
    cloudLoadedRef.current = true;
    loadFromCloud(email).then(cloud => {
      if (!cloud || cloud.error === 'No data found') {
        if (hasLocalDataToMigrate()) setShowMigration(true);
        markMigrationOffered();
        return;
      }
      const localTs = parseInt(localStorage.getItem('despensa_local_ts') || '0');
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
    if (cloud.tier === 'pro') {
      setIsPro(true);
      setIsTrial(false);
    } else if (cloud.tier === 'trial') {
      setIsPro(true);
      setIsTrial(true);
      if (cloud.trial_end) setTrialEnd(cloud.trial_end);
    } else {
      setIsPro(false);
      setIsTrial(false);
    }
  }

  // Stripe activation URL cleanup on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('activated') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Migrate: add new INIT_INGS not yet in localStorage
  useEffect(() => {
    const existingIds = new Set(ingredients.map(i => i.id));
    const missing = INIT_INGS.filter(i => !existingIds.has(i.id));
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
    try { localStorage.setItem('despensa_local_ts', String(ts)); } catch {}
    const savedPinHash = (() => { try { return localStorage.getItem('despensa_pin_hash') || undefined; } catch { return undefined; } })();
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

  // ── Auth guard ────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 100%)',
      }}>
        <div style={{ fontSize: '2rem' }}>🥦</div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;

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

  // ── Plan status for Settings modal ────────────────────────────
  const daysLeft = isTrial && trialEnd ? trialDaysLeft(trialEnd) : 0;
  const planLabel = isPro && !isTrial
    ? '✨ Versión Pro activa'
    : isTrial
      ? `🎁 Prueba gratuita · ${daysLeft > 0 ? `${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}` : 'Expirada'}`
      : '🔒 Plan gratuito';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <Header
        section={section} isPro={isPro} neededCount={neededCount}
        pendingCount={pendingCount} syncStatus={syncStatus}
        onSettings={() => setShowSettings(true)} onNavigate={setSection}
      />

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => { setShowSettings(false); setImportError(''); setRecoverEmail(''); setRecoverMsg(''); }} title="⚙️ Ajustes y datos">
        <div className="space-y-4">
          {/* Cuenta */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h3 className="font-bold text-blue-800 text-sm mb-1">☁️ Cuenta</h3>
            <p className="text-xs text-blue-600 mb-1">Sesión iniciada como <strong>{session?.user?.email}</strong></p>
            {syncStatus && <p className="text-xs text-teal-600 mb-2">{syncStatus}</p>}
            <button
              onClick={async () => {
                if (window.confirm('¿Cerrar sesión?')) {
                  await supabase.auth.signOut();
                  setShowSettings(false);
                }
              }}
              style={{marginTop:8,borderRadius:10,padding:'8px 14px',fontSize:'0.82rem',fontWeight:700,border:'none',background:'#ef4444',color:'#fff',cursor:'pointer'}}
            >
              Cerrar sesión
            </button>
          </div>
          {/* Storage warning */}
          <div style={{borderRadius:12,padding:'12px 14px',background:'#fffbeb',border:'1px solid #fde68a',display:'flex',gap:10,alignItems:'flex-start'}}>
            <span style={{fontSize:'1.1rem',flexShrink:0}}>⚠️</span>
            <div>
              <div style={{fontWeight:700,fontSize:'0.78rem',color:'#92400e',marginBottom:2}}>Datos guardados solo en este dispositivo</div>
              <div style={{fontSize:'0.7rem',color:'#b45309',lineHeight:1.5}}>Si limpias el caché del navegador o cambias de dispositivo perderás tus datos. Haz un backup periódico con el botón de abajo.</div>
            </div>
          </div>
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
            <h3 className="font-bold text-green-800 text-sm mb-1">📤 Exportar datos</h3>
            <p className="text-xs text-teal-600 mb-3">Descarga todos tus datos como copia de seguridad.</p>
            <button onClick={exportData} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{background:'#0d9488',color:'#fff'}}>Descargar backup .json</button>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <h3 className="font-bold text-emerald-800 text-sm mb-1">📥 Importar datos</h3>
            <p className="text-xs text-emerald-600 mb-3">Carga un backup. <strong>Reemplazará todos los datos actuales.</strong></p>
            <button onClick={() => importRef.current?.click()} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{background:'#059669',color:'#fff'}}>Cargar fichero .json</button>
            <input ref={importRef} type="file" accept=".json" onChange={importData} className="hidden" />
            {importError && <p className="text-xs text-red-500 mt-2">{importError}</p>}
          </div>
          <div className="bg-sky-50 rounded-xl p-4 border border-sky-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sky-800 text-sm">🚀 Repetir configuración inicial</h3>
              <p className="text-xs text-sky-600 mt-0.5">Vuelve a ver el wizard de bienvenida</p>
            </div>
            <button onClick={resetWizard} className="text-xs px-3 py-2 rounded-xl font-semibold shrink-0" style={{background:'#0284c7',color:'#fff'}}>Reiniciar</button>
          </div>
          {!isStandaloneApp() && (
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-teal-800 text-sm">📲 Añadir a pantalla de inicio</h3>
                <p className="text-xs text-teal-600 mt-0.5">Ver cómo instalar la app en tu dispositivo</p>
              </div>
              <button
                onClick={() => { setShowSettings(false); setShowPWAWizard(true); }}
                className="text-xs px-3 py-2 rounded-xl font-semibold shrink-0"
                style={{ background: '#0d9488', color: '#fff' }}
              >
                Ver guía
              </button>
            </div>
          )}
          {/* Plan status */}
          <div className={`rounded-xl p-4 border ${isPro && !isTrial ? 'bg-amber-50 border-amber-100' : isTrial ? 'bg-purple-50 border-purple-100' : 'bg-teal-50 border-teal-100'}`}>
            <h3 className={`font-bold text-sm mb-1 ${isPro && !isTrial ? 'text-amber-800' : isTrial ? 'text-purple-800' : 'text-teal-800'}`}>{planLabel}</h3>
            {isPro && !isTrial ? (
              <p className="text-xs text-amber-600">Todas las funciones desbloqueadas. Gracias por apoyar MiDespensa.</p>
            ) : isTrial ? (
              <div>
                <p className="text-xs text-purple-600 mb-2">Tienes acceso completo durante tu prueba. Sin compromiso.</p>
                <button onClick={() => { setShowSettings(false); setUpgradeModal('upgrade'); }} className="w-full rounded-xl py-2 text-xs font-bold" style={{background:'#7c3aed',color:'#fff'}}>Suscribirse · desde 2,99 €/mes →</button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-teal-600 mb-2">Platos: {dishes.length}/{FREE_DISH_LIMIT} · Tickets: {tickets.length}/{FREE_TICKET_LIMIT}</p>
                <button onClick={() => { setShowSettings(false); setUpgradeModal('reports'); }} className="w-full rounded-xl py-2 text-xs font-bold" style={{background:'#0d9488',color:'#fff'}}>Desbloquear versión Pro →</button>
              </div>
            )}
          </div>
        </div>
      </Modal>

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
            try { localStorage.setItem('despensa_local_ts', String(ts)); } catch {}
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

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-28" style={{ paddingTop: 20 }}>
        {section === 'plan' && <PlanMensual plan={plan} setPlan={setPlan} dishes={dishes} ingredients={ingredients} setIngredients={setIngredients} tickets={tickets} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
        {section === 'platos' && <Platos dishes={dishes} setDishes={setDishes} ingredients={ingredients} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
        {section === 'cat' && <Catalogo ingredients={ingredients} setIngredients={setIngredients} />}
        {section === 'ticket' && <Tickets tickets={tickets} setTickets={setTickets} ingredients={ingredients} setIngredients={setIngredients} priceHistory={priceHistory} setPriceHistory={setPriceHistory} learnedMappings={learnedMappings} setLearnedMappings={setLearnedMappings} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
        {section === 'lista' && <ListaCompra plan={plan} dishes={dishes} ingredients={ingredients} setIngredients={setIngredients} priceHistory={priceHistory} isPro={isPro} />}
        {section === 'nutri' && <Nutricion isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
        {section === 'gastos' && <ResumenGasto tickets={tickets} ingredients={ingredients} priceHistory={priceHistory} isPro={isPro} onUpgrade={r => setUpgradeModal(r)} />}
      </main>

      <Nav section={section} neededCount={neededCount} pendingCount={pendingCount} isPro={isPro} onNavigate={setSection} />
    </div>
  );
}
