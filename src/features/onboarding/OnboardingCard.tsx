// @ts-nocheck
import React, { useState } from 'react';
import type { Ingredient, Dish, Plan, Ticket } from '../../data/types';
import { FREE_DISH_LIMIT, FREE_TICKET_LIMIT } from '../../data/categories';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../utils/supabase';
import { useMarket } from '../../i18n/useMarket';


export function OnboardingCard({tickets, ingredients, dishes, plan, onNavigate, onDismiss}) {
  const [expanded, setExpanded] = useState(true);

  const steps = [
    {
      emoji: '📤',
      title: 'Sube tu primer ticket',
      desc: 'Sube un ticket del supermercado. La app detectará automáticamente qué ingredientes tienes en casa y los añadirá a tu despensa.',
      done: tickets.length > 0,
      action: () => onNavigate('ticket'),
      actionLabel: 'Ir a Tickets',
    },
    {
      emoji: '🥕',
      title: 'Añade tus ingredientes habituales',
      desc: 'Si compras cosas que el ticket no detecta, añádelas manualmente a la despensa. Los ingredientes que ves ahora son solo ejemplos.',
      done: ingredients.some(i => i.available),
      action: () => onNavigate('cat'),
      actionLabel: 'Ir a Despensa',
    },
    {
      emoji: '🍽️',
      title: 'Crea tus propios platos',
      desc: 'Define los platos que cocinas habitualmente y asígnales sus ingredientes. Los 2 platos que ves son solo ejemplos: edítalos o elimínalos.',
      done: dishes.some(d => !d.example),
      action: () => onNavigate('platos'),
      actionLabel: 'Crear un plato',
    },
    {
      emoji: '📅',
      title: 'Planifica tu menú mensual',
      desc: 'Asigna platos a los días del mes. Así podrás generar la lista de la compra automáticamente con lo que te falta.',
      done: Object.keys(plan).length > 0,
      action: () => onNavigate('plan'),
      actionLabel: 'Ver el calendario',
    },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const allDone   = doneCount === steps.length;

  if (allDone) return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3 fade">
      <span className="text-3xl">🎉</span>
      <div className="flex-1">
        <p className="font-bold text-emerald-700 text-sm">¡Configuración completada!</p>
        <p className="text-xs text-emerald-600 mt-0.5">Ya tienes todo listo para usar Despensa Familiar.</p>
      </div>
      <button onClick={onDismiss} className="text-xs text-emerald-400 hover:text-emerald-600 font-medium shrink-0">Ocultar</button>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-teal-50 to-amber-50 rounded-2xl border border-teal-100 mb-5 overflow-hidden fade">
      {/* Cabecera */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <div>
            <h2 className="font-bold text-gray-800 text-sm leading-tight">Primeros pasos</h2>
            <p className="text-xs text-gray-400 mt-0.5">{doneCount} de {steps.length} completados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {steps.map((s,i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${s.done?'bg-emerald-400':'bg-teal-200'}`}/>
            ))}
          </div>
          <span className="text-gray-400 text-sm ml-1">{expanded?'▲':'▼'}</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="px-5 pb-2">
        <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-500 to-amber-400 rounded-full transition-all duration-500"
            style={{width:`${(doneCount/steps.length)*100}%`}}/>
        </div>
      </div>

      {/* Pasos */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2.5 pt-1">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl transition-all
              ${step.done ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5 font-bold
                ${step.done ? 'bg-emerald-500 text-white text-sm' : 'bg-teal-100 text-teal-600'}`}>
                {step.done ? '✓' : (i + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${step.done ? 'text-emerald-700' : 'text-gray-800'}`}>
                  {step.emoji} {step.title}
                  {step.done && <span className="ml-1 text-emerald-500 font-normal">✓</span>}
                </p>
                {!step.done && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{step.desc}</p>}
              </div>
              {!step.done && (
                <button onClick={step.action}
                  className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg font-semibold shrink-0 hover:bg-teal-700 whitespace-nowrap mt-0.5">
                  {step.actionLabel}
                </button>
              )}
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button onClick={onDismiss} className="text-xs text-gray-300 hover:text-gray-500">Ocultar guía</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   MODAL UPGRADE / UNLOCK PRO
═══════════════════════════════════════ */


export function UpgradeModal({ open, onClose, reason, onUnlockPro, userEmail = '' }) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const { isUS, stripeConfig, formatPrice } = useMarket();

  const monthlyPrice = stripeConfig.monthly;
  const yearlyPrice = stripeConfig.yearly;
  const fmtMonthly = formatPrice(monthlyPrice);
  const fmtYearly = formatPrice(yearlyPrice);

  const close = () => { onClose(); };

  const REASONS = {
    dishes:   { icon: '🍽️', title: 'Límite de platos alcanzado',  desc: `Con el plan gratuito puedes guardar hasta ${FREE_DISH_LIMIT} platos. Actualiza a Pro para platos ilimitados.` },
    tickets:  { icon: '🧾', title: 'Límite de tickets alcanzado',  desc: `Con el plan gratuito puedes subir ${FREE_TICKET_LIMIT} tickets. Actualiza a Pro para tickets ilimitados.` },
    reports:  { icon: '📊', title: 'Informes PDF — función Pro',    desc: 'Genera informes mensuales en PDF con tu historial de gasto y más.' },
    automenu: { icon: '✨', title: 'Menú automático — función Pro', desc: 'Rellena tu plan mensual automáticamente según tu despensa.' },
    autodish: { icon: '✨', title: 'Sugerir platos — función Pro',  desc: 'Sugiere recetas compatibles con tu despensa y añádelas directamente.' },
    upgrade:  { icon: '🎁', title: 'Suscríbete a MiDespensa Pro',  desc: 'Accede a todas las funciones sin límites.' },
    trial:    { icon: '⏳', title: 'Tu prueba gratuita está a punto de acabar', desc: 'Suscríbete ahora para mantener acceso a platos ilimitados, escáner nutricional, informes y todo lo Pro sin interrupciones.' },
  };
  const r = REASONS[reason] || REASONS.reports;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const token = s?.access_token;
      if (!token) { alert('Sesión expirada. Por favor recarga la página.'); setLoading(false); return; }
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ period, currency: stripeConfig.currency }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { alert('Error al iniciar el pago. Inténtalo de nuevo.'); setLoading(false); }
    } catch { alert('Error de conexión. Inténtalo de nuevo.'); setLoading(false); }
  };

  return (
    <Modal open={open} onClose={close} title="💎 Desbloquear versión Pro">
      <div className="space-y-4">
        <div className="rounded-2xl p-4 text-center border bg-gradient-to-br from-teal-50 to-purple-50 border-teal-100">
          <div className="text-3xl mb-1.5">{r.icon}</div>
          <h3 className="font-bold text-gray-800 text-sm mb-1">{r.title}</h3>
          <p className="text-xs text-gray-500">{r.desc}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">✨ Pro incluye todo, sin límites</p>
          {[
            ['🍽️', 'Platos ilimitados'],
            ['🧾', 'Tickets ilimitados'],
            ['✨', 'Menú automático'],
            ['🍳', 'Sugerir platos con IA'],
            ['🥗', 'Filtros de dieta y macros'],
            ['📊', 'Informes de gasto en PDF'],
            ['☁️', 'Sincronización en la nube'],
          ].map(([e, t]) => (
            <div key={t} className="flex items-center gap-2.5">
              <span className="text-base">{e}</span>
              <span className="text-sm text-gray-700">{t}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPeriod('monthly')}
            className={`rounded-xl p-3 border-2 text-center transition-all ${period === 'monthly' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white'}`}
          >
            <div className={`text-sm font-bold ${period === 'monthly' ? 'text-teal-700' : 'text-gray-700'}`}>{fmtMonthly}/{isUS?'mo':'mes'}</div>
            <div className="text-xs text-gray-400 mt-0.5">{isUS?'Monthly':'Mensual'}</div>
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`rounded-xl p-3 border-2 text-center relative transition-all ${period === 'yearly' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'}`}
          >
            <div className={`text-sm font-bold ${period === 'yearly' ? 'text-purple-700' : 'text-gray-700'}`}>{fmtYearly}/{isUS?'yr':'año'}</div>
            <div className="text-xs text-gray-400 mt-0.5">{isUS?'Billed annually':'Facturación anual'}</div>
            <span className="absolute -top-2 -right-1 text-white text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#7c3aed', fontSize: '0.6rem' }}>{isUS?'BEST':'MEJOR'}</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">Cancela cuando quieras</p>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full text-white rounded-xl py-3.5 text-sm font-bold hover:opacity-90 shadow-md disabled:opacity-60"
          style={{ background: 'linear-gradient(to right, #0d9488, #7c3aed)' }}
        >
          {loading ? (isUS ? 'Loading...' : 'Cargando...') : `💳 ${isUS ? 'Subscribe' : 'Suscribirse'} · ${period === 'yearly' ? `${fmtYearly}/${isUS?'yr':'año'}` : `${fmtMonthly}/${isUS?'mo':'mes'}`}`}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════
   APP
═══════════════════════════════════════ */
const NAV=[
  {id:'plan',  label:'Plan',    emoji:'📅'},
  {id:'platos',label:'Platos',  emoji:'🍽️'},
  {id:'cat',   label:'Despensa',emoji:'🥕'},
  {id:'ticket',label:'Tickets', emoji:'🧾'},
  {id:'lista', label:'Compra',  emoji:'🛒'},
  {id:'gastos',label:'Gastos',  emoji:'💰'},
];
const TITLES={plan:'Plan mensual',platos:'Platos habituales',cat:'Catálogo de ingredientes',ticket:'Tickets del supermercado',lista:'Lista de la compra',gastos:'Resumen de gasto'};


