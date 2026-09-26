import React, { useRef, useState } from 'react';
import { Microphone, X } from '@phosphor-icons/react';
import { supabase } from '../utils/supabase';
import { uid as makeId, dateKey } from '../utils/helpers';
import type { Ingredient, Dish, Plan } from '../data/types';

const FREE_VOICE_MONTHLY = 10;

interface AssistantAction {
  type: string;
  items?: { name: string; category?: string }[];
  names?: string[];
  menu?: { date: string; lunch?: string; dinner?: string }[];
}

interface VoiceAssistantProps {
  isEN: boolean;
  isUS: boolean;
  userKey: string;          // short uid for per-user localStorage keys
  isPro: boolean;
  categories: string[];
  ingredients: Ingredient[];
  setIngredients: (fn: (prev: Ingredient[]) => Ingredient[]) => void;
  dishes: Dish[];
  setPlan: (fn: (prev: Plan) => Plan) => void;
  onUpgrade: (reason: string) => void;
}

type Status = 'idle' | 'listening' | 'thinking' | 'done' | 'error' | 'quota';

export function VoiceAssistant({
  isEN, isUS, userKey, isPro, categories,
  ingredients, setIngredients, dishes, setPlan, onUpgrade,
}: VoiceAssistantProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [summary, setSummary] = useState<string[]>([]);
  const recRef = useRef<any>(null);
  const ingredientsRef = useRef(ingredients);
  ingredientsRef.current = ingredients;

  const SR = typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  const monthKey = () => {
    const d = new Date();
    return `u_${userKey}_voice_uses_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const usesThisMonth = () => { try { return parseInt(localStorage.getItem(monthKey()) || '0'); } catch { return 0; } };
  const bumpUses = () => { try { localStorage.setItem(monthKey(), String(usesThisMonth() + 1)); } catch {} };

  function speak(text: string) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = isEN ? 'en-US' : 'es-ES';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function start() {
    if (!SR) { setOpen(true); setStatus('error'); setReply(isEN ? 'Voice is not supported on this browser.' : 'Este navegador no soporta voz.'); return; }
    if (!isPro && usesThisMonth() >= FREE_VOICE_MONTHLY) { setOpen(true); setStatus('quota'); return; }
    setOpen(true); setStatus('listening'); setTranscript(''); setReply(''); setSummary([]);
    const rec = new SR();
    recRef.current = rec;
    rec.lang = isEN ? 'en-US' : 'es-ES';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = '';
      for (const r of e.results) text += r[0].transcript;
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) { rec.stop(); handleCommand(text); }
    };
    rec.onerror = () => { setStatus('error'); setReply(isEN ? 'I could not hear you. Try again.' : 'No te he oído bien. Prueba otra vez.'); };
    rec.onend = () => { setStatus(s => (s === 'listening' ? 'idle' : s)); };
    rec.start();
  }

  function stop() {
    try { recRef.current?.stop(); } catch {}
    window.speechSynthesis?.cancel();
    setOpen(false); setStatus('idle');
  }

  async function handleCommand(text: string) {
    if (!text.trim()) { setStatus('idle'); return; }
    setStatus('thinking');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('auth');
      const res = await fetch('/api/gemini-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          transcript: text,
          lang: isEN ? 'en' : 'es',
          today: (() => { const d = new Date(); return dateKey(d.getFullYear(), d.getMonth(), d.getDate()); })(),
          ingredients: ingredientsRef.current.map(i => ({ name: i.name, available: i.available, needed: !!i.needed })),
          dishes: dishes.map(d => d.name),
          categories,
        }),
      });
      if (res.status === 429) {
        setStatus('quota');
        setReply(isEN ? 'Daily voice limit reached. Try again tomorrow.' : 'Límite diario de voz alcanzado. Prueba mañana.');
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error || 'error');
      bumpUses();
      const done = applyActions(Array.isArray(data.actions) ? data.actions : []);
      setSummary(done);
      setReply(data.reply);
      setStatus('done');
      speak(data.reply);
    } catch {
      setStatus('error');
      setReply(isEN ? 'Something went wrong. Try again.' : 'Algo ha fallado. Prueba otra vez.');
    }
  }

  function applyActions(actions: AssistantAction[]): string[] {
    const done: string[] = [];
    const norm = (s: string) => s.toLowerCase().trim();
    const fallbackCat = categories.includes('conservas') ? 'conservas' : (categories[0] || 'pantry');

    const findIdx = (list: Ingredient[], name: string) => {
      const n = norm(name);
      return list.findIndex(i =>
        norm(i.name) === n || (i.nameEs && norm(i.nameEs) === n) || (i.nameEn && norm(i.nameEn) === n));
    };

    for (const a of actions) {
      if (a.type === 'add_ingredients' && a.items?.length) {
        setIngredients(prev => {
          const next = [...prev];
          for (const it of a.items!) {
            if (!it?.name) continue;
            const idx = findIdx(next, it.name);
            if (idx >= 0) next[idx] = { ...next[idx], available: true };
            else next.push({
              id: makeId(), name: it.name.trim(),
              category: it.category && categories.includes(it.category) ? it.category : fallbackCat,
              available: true, needed: false,
            });
          }
          return next;
        });
        done.push((isEN ? '✓ Added to pantry: ' : '✓ En despensa: ') + a.items.map(i => i.name).join(', '));
      }

      if ((a.type === 'consume' || a.type === 'add_to_list' || a.type === 'remove_from_list') && a.names?.length) {
        setIngredients(prev => {
          const next = [...prev];
          for (const name of a.names!) {
            const idx = findIdx(next, name);
            if (a.type === 'consume') {
              if (idx >= 0) next[idx] = { ...next[idx], available: false, needed: true };
              else next.push({ id: makeId(), name: name.trim(), category: fallbackCat, available: false, needed: true });
            } else if (a.type === 'add_to_list') {
              if (idx >= 0) next[idx] = { ...next[idx], needed: true };
              else next.push({ id: makeId(), name: name.trim(), category: fallbackCat, available: false, needed: true });
            } else {
              if (idx >= 0) next[idx] = { ...next[idx], needed: false, available: true };
            }
          }
          return next;
        });
        const label = a.type === 'consume'
          ? (isEN ? '✓ Marked used + shopping list: ' : '✓ Gastado + lista de compra: ')
          : a.type === 'add_to_list'
            ? (isEN ? '✓ Shopping list: ' : '✓ Lista de compra: ')
            : (isEN ? '✓ Off the list: ' : '✓ Fuera de la lista: ');
        done.push(label + a.names.join(', '));
      }

      if (a.type === 'plan_week' && a.menu?.length) {
        setPlan(prev => {
          const next = { ...prev };
          for (const day of a.menu!) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date || '')) continue;
            next[day.date] = { ...next[day.date], ...(day.lunch ? { lunch: day.lunch } : {}), ...(day.dinner ? { dinner: day.dinner } : {}) };
          }
          return next;
        });
        done.push((isEN ? `✓ Menu planned (${a.menu.length} days)` : `✓ Menú planificado (${a.menu.length} días)`));
      }
    }
    return done;
  }

  const remaining = Math.max(0, FREE_VOICE_MONTHLY - usesThisMonth());

  return (
    <>
      {/* Floating mic button */}
      <button
        onClick={() => (open ? stop() : start())}
        aria-label={isEN ? 'Voice assistant' : 'Asistente de voz'}
        style={{
          position: 'fixed', right: 16, bottom: 88, zIndex: 55,
          width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: status === 'listening' ? '#ef4444' : '#0d9488',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(13,148,136,.4)',
          animation: status === 'listening' ? 'pulse 1.2s infinite' : undefined,
        }}
      >
        <Microphone size={26} weight="fill" />
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', right: 16, bottom: 152, zIndex: 56, width: 'min(340px, calc(100vw - 32px))',
          background: '#fff', borderRadius: 18, padding: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
              🎙️ {isEN ? 'Assistant' : 'Asistente'}
            </span>
            <button onClick={stop} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={16} weight="bold" />
            </button>
          </div>

          {status === 'quota' ? (
            <>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, margin: '0 0 10px' }}>
                {reply || (isEN
                  ? `You've used your ${FREE_VOICE_MONTHLY} free voice commands this month. Go Pro for unlimited voice.`
                  : `Has gastado tus ${FREE_VOICE_MONTHLY} comandos de voz gratis de este mes. Pásate a Pro para voz ilimitada.`)}
              </p>
              <button
                onClick={() => { stop(); onUpgrade('reports'); }}
                style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: 'none', background: '#0d9488', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {isEN ? 'Unlock Pro →' : 'Desbloquear Pro →'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, margin: 0, minHeight: 20 }}>
                {status === 'listening' && (transcript || (isEN ? 'Listening… speak now.' : 'Escuchando… habla ahora.'))}
                {status === 'thinking' && (isEN ? 'Thinking…' : 'Pensando…')}
                {(status === 'done' || status === 'error') && reply}
                {status === 'idle' && !reply && (isEN
                  ? 'Try: "I have milk, eggs and chicken in the fridge" or "Plan my meals for the week".'
                  : 'Prueba: "Tengo leche, huevos y pollo en la nevera" o "Hazme el menú de la semana".')}
              </p>
              {transcript && status !== 'listening' && (
                <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '8px 0 0', fontStyle: 'italic' }}>«{transcript}»</p>
              )}
              {summary.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {summary.map((s, i) => (
                    <div key={i} style={{ fontSize: '0.7rem', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '4px 8px' }}>{s}</div>
                  ))}
                </div>
              )}
              {!isPro && (
                <p style={{ fontSize: '0.62rem', color: '#94a3b8', margin: '10px 0 0' }}>
                  {isEN ? `${remaining} free commands left this month` : `${remaining} comandos gratis restantes este mes`}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
