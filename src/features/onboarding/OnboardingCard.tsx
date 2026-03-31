// @ts-nocheck
import React, { useState } from 'react';
import type { Ingredient, Dish, Plan, Ticket } from '../../data/types';
import { FREE_DISH_LIMIT, FREE_TICKET_LIMIT } from '../../data/categories';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../utils/supabase';


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


export function UpgradeModal({open, onClose, reason, onUnlockPro, onUnlockUltra, userEmail = ''}) {
  const [showKey, setShowKey]=useState(false);
  const [keyVal, setKeyVal]=useState('');
  const [keyErr, setKeyErr]=useState('');

  const isUltraReason = reason==='ultra';
  const close=()=>{ onClose(); setShowKey(false); setKeyVal(''); setKeyErr(''); };
  const [unlocking, setUnlocking]=useState(false);
  const tryUnlock=async()=>{
    const clave=keyVal.trim();
    if(!clave){ setKeyErr('Introduce tu clave de licencia.'); return; }
    setUnlocking(true);
    setKeyErr('');
    const tier = await validateLicenseRemote(clave);
    setUnlocking(false);
    if(tier==='ultra'){ onUnlockUltra(); close(); }
    else if(tier==='pro'){ onUnlockPro(); close(); }
    else setKeyErr('Clave inválida o inactiva. Comprueba que la has introducido correctamente.');
  };

  const REASONS={
    dishes: {icon:'🍽️', tier:'pro',   title:'Límite de platos alcanzado', desc:`Con el plan gratuito puedes guardar hasta ${FREE_DISH_LIMIT} platos. Actualiza a Pro para platos ilimitados.`},
    tickets:{icon:'🧾', tier:'pro',   title:'Límite de tickets alcanzado', desc:`Con el plan gratuito puedes subir ${FREE_TICKET_LIMIT} ticket. Actualiza a Pro para tickets ilimitados.`},
    reports:{icon:'📊', tier:'pro',   title:'Informes PDF — función Pro',  desc:'Genera informes mensuales en PDF con tu historial de gasto, lista de ingredientes y más.'},
    automenu:{icon:'✨',tier:'pro',   title:'Menú automático — función Pro',desc:'Rellena automáticamente tu plan semanal o mensual según los ingredientes disponibles en tu despensa.'},
    autodish:{icon:'✨',tier:'pro',   title:'Sugerir platos — función Pro', desc:'Sugiere recetas compatibles con tu despensa. Añádelas directamente a tu lista de platos.'},
    ultra:   {icon:'👨‍🍳',tier:'ultra', title:'Ultra Chef — macros y dietas', desc:'Filtra recetas por tipo de dieta, obtén estimación de macronutrientes e informes nutricionales por días.'},
  };
  const r=REASONS[reason]||REASONS.reports;
  const isUltraTier=r.tier==='ultra';

  return (
    <Modal open={open} onClose={close} title={isUltraTier?'👨‍🍳 Desbloquear Ultra Chef':'✨ Desbloquear versión Pro'}>
      <div className="space-y-4">
        <div className={`rounded-2xl p-5 text-center border ${isUltraTier?'bg-gradient-to-br from-amber-50 to-teal-50 border-amber-100':'bg-gradient-to-br from-teal-50 to-amber-50 border-teal-100'}`}>
          <div className="text-4xl mb-2">{r.icon}</div>
          <h3 className="font-bold text-gray-800 mb-1">{r.title}</h3>
          <p className="text-sm text-gray-500">{r.desc}</p>
        </div>

        {isUltraTier?(
          <div className="bg-white rounded-2xl border border-amber-100 p-4 space-y-2.5">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">👨‍🍳 Ultra Chef incluye (además de Pro)</p>
            {[['🥗','6 sets de dieta: saludable, vegano, vegetariano, paleo, foodie…'],['🔥','Macronutrientes y kcal por plato'],['📊','Informes nutricionales con selección de días'],['🔒','Todas las funciones Pro incluidas']].map(([e,t])=>(
              <div key={t} className="flex items-start gap-2.5"><span className="text-base mt-0.5">{e}</span><span className="text-sm text-gray-700">{t}</span></div>
            ))}
          </div>
        ):(
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">✨ La versión Pro incluye</p>
            {[['🍽️','Platos ilimitados'],['🧾','Tickets ilimitados'],['✨','Menú automático'],['✨','Sugerir platos'],['📊','Informes mensuales PDF'],['🔄','Exportación e importación']].map(([e,t])=>(
              <div key={t} className="flex items-center gap-2.5"><span className="text-base">{e}</span><span className="text-sm text-gray-700">{t}</span></div>
            ))}
          </div>
        )}

        {!showKey?(
          <div className="space-y-2">
            <button onClick={async()=>{
                const tier=isUltraTier?'ultra':'pro';
                try{
                  const { data: { session: s } } = await supabase.auth.getSession();
                  const token = s?.access_token;
                  if (!token) { alert('Sesión expirada. Por favor recarga la página.'); return; }
                  const res=await fetch('/api/create-checkout',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({tier})});
                  const data=await res.json();
                  if(data.url) window.location.href=data.url;
                  else alert('Error al iniciar el pago. Inténtalo de nuevo.');
                }catch(e){ alert('Error de conexión. Inténtalo de nuevo.'); }
              }}
              className="flex items-center justify-center gap-2 w-full text-white rounded-xl py-3.5 text-sm font-bold hover:opacity-90 shadow-md"
              style={{background: isUltraTier
                ? 'linear-gradient(135deg,#b45309,#d97706,#fbbf24)'
                : 'linear-gradient(to right, #0d9488, #d97706)'}}>
              💳 {isUltraTier?'Suscribirse a Ultra Chef · 4,99 €/mes':'Suscribirse a Pro · 2,99 €/mes'}
            </button>
            <button onClick={()=>setShowKey(true)} className="w-full border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
              🔑 Ya tengo una clave de licencia
            </button>
          </div>
        ):(
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Introduce tu clave de licencia</label>
              <input value={keyVal} onChange={e=>{setKeyVal(e.target.value.toUpperCase());setKeyErr('');}}
                placeholder="XXXX-XXXX-XXXX-XXXX" 
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-200"
                onKeyDown={e=>e.key==='Enter'&&tryUnlock()}/>
              {keyErr&&<p className="text-xs text-red-500 mt-1.5">{keyErr}</p>}
            </div>
            <button onClick={tryUnlock} disabled={unlocking}
              className={`w-full text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 ${isUltraTier?'bg-amber-600 hover:bg-amber-700':'bg-teal-600 hover:bg-teal-700'}`}>
              {unlocking?'Verificando...':'Activar licencia ✨'}
            </button>
            <button onClick={()=>{setShowKey(false);setKeyErr('');}} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">← Volver</button>
          </div>
        )}
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


