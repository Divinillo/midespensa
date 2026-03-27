// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import type { Ingredient, Dish, Ticket } from '../../data/types';
import { CATEGORIES, CAT_EMOJI, CAT_BG, CAT_TEXT, getIngEmoji } from '../../data/categories';
import { uid } from '../../utils/helpers';
import { processPdf, applyTicket } from '../../utils/ticketProcess';

/* ── Quick-pick ingredient categories for step 2 ─────────────────── */
const WIZARD_CATS = [
  'verduras', 'fruta', 'carnes', 'pescado',
  'lácteos', 'pasta y harinas', 'legumbres', 'conservas',
  'especias y condimentos',
];

/* ── Feature highlights for welcome screen ───────────────────────── */
const FEATURES = [
  { emoji: '🧾', title: 'Sube tu ticket del super', desc: 'Escanea el PDF y la despensa se rellena sola.' },
  { emoji: '🗓️', title: 'Planifica tu semana', desc: 'Asigna platos a cada día del mes fácilmente.' },
  { emoji: '🛒', title: 'Lista de la compra', desc: 'Genera automáticamente lo que te falta.' },
];

interface Props {
  ingredients: Ingredient[];
  setIngredients: (fn: (prev: Ingredient[]) => Ingredient[]) => void;
  dishes: Dish[];
  setDishes: (fn: (prev: Dish[]) => Dish[]) => void;
  tickets: Ticket[];
  setTickets: (fn: (prev: Ticket[]) => Ticket[]) => void;
  priceHistory: Record<string, any>;
  setPriceHistory: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onComplete: () => void;
}

export function OnboardingWizard({ ingredients, setIngredients, dishes, setDishes, tickets, setTickets, priceHistory, setPriceHistory, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [catFilter, setCatFilter] = useState('verduras');
  const [dishName, setDishName] = useState('');
  const [dishIngs, setDishIngs] = useState<string[]>([]);
  const [animKey, setAnimKey] = useState(0);

  // Ticket step state
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [ticketStatus, setTicketStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [ticketMatched, setTicketMatched] = useState(0);
  const [ticketName, setTicketName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const availableCount = ingredients.filter(i => i.available).length;
  const availableIngs = ingredients.filter(i => i.available);

  // Total user-facing steps (1-4), step 0 is welcome (no progress bar)
  const PROGRESS_STEPS = 4;

  useEffect(() => {
    if ((window as any).pdfjsLib) {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsReady(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsReady(true);
    };
    document.head.appendChild(s);
  }, []);

  const goNext = () => { setAnimKey(k => k + 1); setStep(s => s + 1); };

  const toggleIng = (id: string) => {
    setIngredients(prev => prev.map(i =>
      i.id === id ? { ...i, available: !i.available, needed: i.available ? i.needed : false } : i
    ));
  };

  const toggleDishIng = (id: string) => {
    setDishIngs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const saveDishAndContinue = () => {
    if (dishName.trim()) {
      setDishes(prev => [
        ...prev.filter(d => !d.example),
        { id: 'd' + uid(), name: dishName.trim(), ingredients: dishIngs, example: false },
      ]);
    }
    goNext();
  };

  const handleTicketFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setTicketStatus('error');
      return;
    }
    if (!pdfjsReady) { alert('PDF aún cargando, espera un momento.'); return; }
    setTicketStatus('loading');
    setTicketName(file.name);
    try {
      const ticket = await processPdf(file);
      const { updatedIngs, newHistory, matched } = applyTicket(ticket, ingredients, priceHistory || {});
      setIngredients(() => updatedIngs);
      setPriceHistory(() => newHistory);
      setTickets(ts => [...ts, { ...ticket, matched, unmatched: [] }]);
      setTicketMatched(matched.length);
      setTicketStatus('done');
    } catch (e) {
      console.error(e);
      setTicketStatus('error');
    }
  };

  const visibleIngs = ingredients.filter(i => i.category === catFilter);

  // ── Step 0: Bienvenida ──────────────────────────────────────────
  const StepWelcome = (
    <div className="flex flex-col items-center text-center px-6">
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 mt-2"
        style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', boxShadow: '0 8px 32px rgba(22,163,74,.35)', fontSize: '3rem' }}>
        🥗
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
        Mi<span style={{ color: '#16a34a' }}>Despensa</span>
      </h1>
      <p className="text-gray-400 text-sm mb-8 leading-relaxed">
        Organiza tu cocina, planifica tu semana<br />y simplifica la compra.
      </p>

      <div className="w-full space-y-3 mb-8">
        {FEATURES.map(f => (
          <div key={f.title} className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3.5 text-left"
            style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: '#f0fdf4' }}>
              {f.emoji}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">{f.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={goNext} className="w-full py-4 rounded-2xl text-white font-bold text-base"
        style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', boxShadow: '0 4px 16px rgba(22,163,74,.4)' }}>
        Empezar →
      </button>
      <p className="text-xs text-gray-300 mt-3">Configuración rápida en 2 minutos</p>
    </div>
  );

  // ── Step 1: Ticket ──────────────────────────────────────────────
  const StepTicket = (
    <div className="flex flex-col h-full px-5">
      <div className="pb-4">
        <div className="text-4xl mb-3">🧾</div>
        <h2 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
          Sube tu último ticket
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Si tienes el PDF del super a mano, súbelo y tu despensa<br />
          se rellenará <strong style={{ color: '#16a34a' }}>automáticamente</strong>.
        </p>
      </div>

      {/* Upload zone */}
      {ticketStatus === 'idle' && (
        <div
          onClick={() => pdfjsReady && fileRef.current?.click()}
          style={{
            borderRadius: 20, border: '2px dashed #86efac', background: '#f0fdf4',
            padding: '32px 20px', textAlign: 'center', cursor: pdfjsReady ? 'pointer' : 'default',
            transition: 'all .15s', marginBottom: 16,
          }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 10 }}>📄</div>
          <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.95rem', marginBottom: 4 }}>
            {pdfjsReady ? 'Toca para seleccionar PDF' : 'Cargando lector PDF…'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#86efac' }}>Soporta tickets de Mercadona, Lidl, Carrefour…</div>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleTicketFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}

      {ticketStatus === 'loading' && (
        <div style={{ borderRadius: 20, background: '#f0fdf4', border: '1.5px solid #86efac', padding: '28px 20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
          <div style={{ fontWeight: 700, color: '#15803d', fontSize: '0.9rem' }}>Procesando {ticketName}…</div>
          <div style={{ fontSize: '0.72rem', color: '#86efac', marginTop: 4 }}>Leyendo productos del ticket</div>
        </div>
      )}

      {ticketStatus === 'done' && (
        <div style={{ borderRadius: 20, background: '#f0fdf4', border: '2px solid #4ade80', padding: '24px 20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 6 }}>🎉</div>
          <div style={{ fontWeight: 900, color: '#15803d', fontSize: '1.05rem', marginBottom: 4 }}>
            ¡Ticket procesado!
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
            {ticketMatched} ingrediente{ticketMatched !== 1 ? 's' : ''} actualizado{ticketMatched !== 1 ? 's' : ''} en tu despensa ✓
          </div>
        </div>
      )}

      {ticketStatus === 'error' && (
        <div style={{ borderRadius: 20, background: '#fef2f2', border: '1.5px solid #fca5a5', padding: '24px 20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>⚠️</div>
          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9rem', marginBottom: 4 }}>No se pudo leer el ticket</div>
          <div style={{ fontSize: '0.72rem', color: '#f87171' }}>Asegúrate de subir un PDF válido</div>
          <button onClick={() => setTicketStatus('idle')}
            style={{ marginTop: 10, fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {/* Explanation chips */}
      {ticketStatus === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['PDF del email del Super'].map(t => (
              <span key={t} style={{ fontSize: '0.68rem', fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fff', border: '1px solid #e2e8f0', color: '#64748b' }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, background: 'linear-gradient(135deg,#fef3c7,#fef9ee)', border: '1px solid #fcd34d' }}>
            <span style={{ fontSize: '1rem' }}>👑</span>
            <span style={{ fontSize: '0.68rem', color: '#92400e', fontWeight: 600, lineHeight: 1.4 }}>
              Con la versión <strong>ULTRA</strong> podrás además hacerle fotos a tus tickets físicos
            </span>
          </div>
        </div>
      )}

      <div className="mt-auto space-y-2 pb-2">
        {(ticketStatus === 'done') && (
          <button onClick={goNext}
            className="w-full py-4 rounded-2xl text-white font-bold text-base"
            style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', boxShadow: '0 4px 16px rgba(22,163,74,.35)' }}>
            Continuar →
          </button>
        )}
        <button onClick={goNext}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-400 hover:text-gray-600 transition-all"
          style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
          {ticketStatus === 'done' ? 'O añadir ingredientes manualmente' : 'No tengo tickets a mano →'}
        </button>
      </div>
    </div>
  );

  // ── Step 2: Ingredientes ────────────────────────────────────────
  const StepIngredients = (
    <div className="flex flex-col h-full">
      <div className="px-5 pb-4">
        <div className="text-4xl mb-3">🧺</div>
        <h2 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
          ¿Qué tienes en casa?
        </h2>
        <p className="text-sm text-gray-400">Toca los ingredientes que tengas ahora mismo. Podrás modificarlos después.</p>
      </div>

      {/* Category tabs */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {WIZARD_CATS.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: catFilter === cat ? '#16a34a' : '#fff',
                color: catFilter === cat ? '#fff' : '#64748b',
                border: catFilter === cat ? 'none' : '1px solid #e2e8f0',
                boxShadow: catFilter === cat ? '0 2px 8px rgba(22,163,74,.3)' : 'none',
              }}>
              {CAT_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredient grid */}
      <div className="flex-1 overflow-y-auto px-5">
        <div className="grid grid-cols-3 gap-2 pb-4">
          {visibleIngs.map(ing => (
            <button key={ing.id} onClick={() => toggleIng(ing.id)}
              className="relative flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all active:scale-95"
              style={{
                background: ing.available ? '#f0fdf4' : '#fff',
                border: ing.available ? '2px solid #86efac' : '1px solid #f1f5f9',
                boxShadow: ing.available ? '0 2px 8px rgba(22,163,74,.15)' : '0 1px 3px rgba(0,0,0,.04)',
              }}>
              {ing.available && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                  style={{ fontSize: '0.5rem', color: '#fff', fontWeight: 800 }}>✓</div>
              )}
              <span style={{ fontSize: '1.6rem', lineHeight: 1, marginBottom: 4 }}>
                {getIngEmoji(ing.name, ing.category)}
              </span>
              <span className="text-center leading-tight font-medium"
                style={{ fontSize: '0.6rem', color: ing.available ? '#15803d' : '#94a3b8', wordBreak: 'break-word', maxHeight: '2.2em', overflow: 'hidden' }}>
                {ing.name}
              </span>
            </button>
          ))}
          {!visibleIngs.length && (
            <div className="col-span-3 text-center text-gray-300 py-8 text-sm">Sin ingredientes en esta categoría</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pt-3 pb-2 border-t border-gray-50">
        {availableCount > 0 && (
          <p className="text-xs text-green-600 font-semibold text-center mb-3">
            ✓ {availableCount} ingrediente{availableCount !== 1 ? 's' : ''} seleccionado{availableCount !== 1 ? 's' : ''}
          </p>
        )}
        <button onClick={goNext} disabled={availableCount === 0}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all"
          style={{
            background: availableCount > 0 ? 'linear-gradient(135deg,#15803d,#16a34a)' : '#e2e8f0',
            color: availableCount > 0 ? '#fff' : '#9ca3af',
            boxShadow: availableCount > 0 ? '0 4px 16px rgba(22,163,74,.35)' : 'none',
          }}>
          {availableCount > 0 ? `Continuar con ${availableCount} ingrediente${availableCount !== 1 ? 's' : ''} →` : 'Selecciona al menos uno'}
        </button>
      </div>
    </div>
  );

  // ── Step 3: Primer plato ────────────────────────────────────────
  const StepDish = (
    <div className="flex flex-col h-full px-5">
      <div className="pb-4">
        <div className="text-4xl mb-3">🍳</div>
        <h2 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
          Tu primer plato
        </h2>
        <p className="text-sm text-gray-400">¿Cómo se llama un plato que preparas habitualmente?</p>
      </div>

      <div className="mb-5">
        <input
          value={dishName}
          onChange={e => setDishName(e.target.value)}
          placeholder="ej: Tortilla de patatas, Ensalada mixta…"
          className="w-full rounded-2xl px-4 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-green-300"
          style={{ border: '2px solid #e2e8f0', background: '#f8fafc' }}
          autoFocus
        />
      </div>

      {availableIngs.length > 0 && dishName.trim() && (
        <div className="flex-1 overflow-y-auto mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Ingredientes del plato (opcional)
          </p>
          <div className="flex flex-wrap gap-2">
            {availableIngs.map(ing => (
              <button key={ing.id} onClick={() => toggleDishIng(ing.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: dishIngs.includes(ing.id) ? '#f0fdf4' : '#f8fafc',
                  border: dishIngs.includes(ing.id) ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                  color: dishIngs.includes(ing.id) ? '#15803d' : '#64748b',
                }}>
                <span>{getIngEmoji(ing.name, ing.category)}</span> {ing.name}
                {dishIngs.includes(ing.id) && <span style={{ color: '#16a34a', fontWeight: 900 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto space-y-2 pb-2">
        <button onClick={saveDishAndContinue}
          disabled={!dishName.trim()}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all"
          style={{
            background: dishName.trim() ? 'linear-gradient(135deg,#15803d,#16a34a)' : '#e2e8f0',
            color: dishName.trim() ? '#fff' : '#9ca3af',
            boxShadow: dishName.trim() ? '0 4px 16px rgba(22,163,74,.35)' : 'none',
          }}>
          {dishName.trim() ? `Guardar "${dishName}" y continuar →` : 'Escribe el nombre del plato'}
        </button>
        <button onClick={goNext}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-400 hover:text-gray-600 transition-all"
          style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
          Ahora no, usar ejemplos
        </button>
      </div>
    </div>
  );

  // ── Step 4: ¡Listo! ────────────────────────────────────────────
  const StepDone = (
    <div className="flex flex-col items-center text-center px-6">
      <div className="text-7xl mb-5 mt-4" style={{ lineHeight: 1 }}>🎉</div>
      <h2 className="text-3xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.03em' }}>
        ¡Todo listo!
      </h2>
      <p className="text-gray-400 text-sm mb-8">Tu cocina está configurada. Ya puedes empezar a usar MiDespensa.</p>

      <div className="w-full grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white rounded-2xl p-4 text-center" style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <div className="text-3xl font-black text-green-600 leading-none">{availableCount}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">🧺 En despensa</div>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center" style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
          <div className="text-3xl font-black text-green-600 leading-none">{dishes.filter(d => !d.example).length || dishes.length}</div>
          <div className="text-xs text-gray-400 font-medium mt-1">🍳 Platos</div>
        </div>
      </div>

      <div className="w-full space-y-2.5 mb-8">
        {[
          ['🗓️', 'Planifica tu menú', 'Asigna platos a los días del mes'],
          ['🛒', 'Genera tu lista', 'Descubre qué necesitas comprar'],
          ['🧾', 'Sube más tickets', 'Actualiza tu despensa automáticamente'],
        ].map(([e, t, d]) => (
          <div key={t} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left"
            style={{ border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <span className="text-xl">{e}</span>
            <div>
              <div className="text-sm font-bold text-gray-800">{t}</div>
              <div className="text-xs text-gray-400">{d}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onComplete}
        className="w-full py-4 rounded-2xl text-white font-bold text-base"
        style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', boxShadow: '0 4px 16px rgba(22,163,74,.4)' }}>
        Empezar a usar la app →
      </button>
    </div>
  );

  const showProgress = step > 0;

  const STEP_LABELS = ['', 'Paso 1 · Tu ticket', 'Paso 2 · Tu despensa', 'Paso 3 · Tu primer plato', 'Paso 4 · ¡Todo listo!'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f8fdf9' }}>
      {/* Progress bar */}
      {showProgress && (
        <div className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex gap-1.5 flex-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: step > i ? '100%' : step === i ? '50%' : '0%',
                      background: 'linear-gradient(90deg, #16a34a, #15803d)',
                    }} />
                </div>
              ))}
            </div>
            <span className="text-xs font-bold text-gray-400 shrink-0">
              {step} / 4
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{STEP_LABELS[step] || ''}</p>
        </div>
      )}

      {/* Step content */}
      <div
        key={animKey}
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: showProgress ? 8 : 40,
          paddingBottom: 32,
          animation: 'wizardSlideIn .28s cubic-bezier(.22,1,.36,1)',
        }}
      >
        <div className="max-w-lg mx-auto w-full h-full">
          {step === 0 && StepWelcome}
          {step === 1 && StepTicket}
          {step === 2 && StepIngredients}
          {step === 3 && StepDish}
          {step === 4 && StepDone}
        </div>
      </div>

      <style>{`
        @keyframes wizardSlideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
