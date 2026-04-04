// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { X, Trash } from '@phosphor-icons/react';

/* ── Redimensionar imagen a max 600px y devolver base64 ─────── */
function resizeImage(file: File, maxPx = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}
import { Modal } from '../../components/ui/Modal';
import { Confirm } from '../../components/ui/Confirm';
import { uid } from '../../utils/helpers';
import { CAT_BG, CAT_TEXT, CAT_EMOJI, CATEGORIES, FREE_DISH_LIMIT, FREE_SUGGESTION_LIMIT, ING_EMOJI } from '../../data/categories';
import { RECIPE_DB } from '../../data/recipes';
import { useMarket } from '../../i18n/useMarket';
import type { Ingredient, Dish } from '../../data/types';

/* ═══════════════════════════════════════
   RECIPE MODAL — Ultra: pasos estáticos + YouTube
═══════════════════════════════════════ */
function RecipeModal({ open, onClose, dishName, ings, youtubeUrl='', customSteps=[] }) {
  const recipeData = React.useMemo(() => {
    if (!dishName) return null;
    return RECIPE_DB.find(r => r.name.toLowerCase() === dishName.toLowerCase()) ?? null;
  }, [dishName]);

  // Si el plato tiene enlace propio de YouTube, úsalo; si no, búsqueda genérica
  const ytUrl = youtubeUrl?.trim()
    ? youtubeUrl.trim()
    : `https://www.youtube.com/results?search_query=${encodeURIComponent('como preparar ' + dishName)}`;

  // Abre YouTube en el navegador externo / app de YouTube en Android
  const openYoutube = (e: React.MouseEvent) => {
    e.preventDefault();
    // En Android PWA standalone, window.open fuerza apertura fuera de la WebView
    const w = window.open(ytUrl, '_blank', 'noopener,noreferrer');
    if (!w) { window.location.href = ytUrl; } // fallback por si el popup fue bloqueado
  };
  // Pasos del usuario tienen prioridad sobre los del RECIPE_DB
  const steps: string[] = (customSteps && customSteps.length > 0) ? customSteps : (recipeData?.steps ?? []);
  const tiempo: string = customSteps?.length ? '' : (recipeData?.tiempo ?? '');
  const dificultad: string = customSteps?.length ? '' : (recipeData?.dificultad ?? '');
  const consejo: string = customSteps?.length ? '' : (recipeData?.consejo ?? '');

  return (
    <Modal open={open} onClose={onClose} title={dishName} wide>
      <div className="space-y-4">
        {/* YouTube always visible */}
        <a href={ytUrl} target="_blank" rel="noopener noreferrer" onClick={openYoutube}
          style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
            borderRadius:14, background:'#fef2f2', border:'1.5px solid #fecaca',
            textDecoration:'none', color:'#dc2626', fontWeight:700, fontSize:'0.85rem',
          }}>
          <span style={{fontSize:'1.4rem', flexShrink:0}}>▶️</span>
          <div>
            <div style={{fontSize:'0.85rem', fontWeight:700}}>Ver en YouTube</div>
            <div style={{fontSize:'0.72rem', fontWeight:400, color:'#f87171'}}>Tutoriales de "{dishName}"</div>
          </div>
          <span style={{marginLeft:'auto', fontSize:'0.75rem', opacity:.7}}>↗</span>
        </a>

        {steps.length > 0 ? (
          <div style={{background:'#f0fdf4', borderRadius:14, padding:'14px', border:'1px solid #99f6e4'}}>
            {/* Time + difficulty */}
            {(tiempo || dificultad) && (
              <div style={{display:'flex', gap:8, marginBottom:14}}>
                {tiempo && (
                  <span style={{fontSize:'0.75rem', background:'#f0fdfa', color:'#0d9488', padding:'4px 10px', borderRadius:20, fontWeight:700}}>
                    ⏱ {tiempo}
                  </span>
                )}
                {dificultad && (
                  <span style={{
                    fontSize:'0.75rem', padding:'4px 10px', borderRadius:20, fontWeight:700,
                    background: dificultad==='Fácil'?'#f0fdfa': dificultad==='Media'?'#fef9c3':'#fee2e2',
                    color: dificultad==='Fácil'?'#0d9488': dificultad==='Media'?'#ca8a04':'#dc2626',
                  }}>
                    {dificultad==='Fácil'?'🟢':dificultad==='Media'?'🟡':'🔴'} {dificultad}
                  </span>
                )}
              </div>
            )}
            {/* Steps */}
            {steps.map((paso, i) => (
              <div key={i} style={{display:'flex', gap:10, marginBottom:10, alignItems:'flex-start'}}>
                <div style={{
                  width:24, height:24, borderRadius:'50%', background:'#0d9488',
                  color:'#fff', fontSize:'0.7rem', fontWeight:800, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1,
                }}>{i+1}</div>
                <p style={{fontSize:'0.83rem', color:'#134e4a', lineHeight:1.5, margin:0}}>{paso}</p>
              </div>
            ))}
            {/* Chef tip */}
            {consejo && (
              <div style={{marginTop:12, padding:'10px 12px', background:'#fff', borderRadius:10, border:'1px solid #99f6e4'}}>
                <p style={{fontSize:'0.75rem', color:'#0d9488', fontWeight:700, margin:'0 0 3px'}}>💡 Consejo del chef</p>
                <p style={{fontSize:'0.78rem', color:'#134e4a', margin:0, lineHeight:1.4}}>{consejo}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{background:'#f9fafb', borderRadius:12, padding:'14px', textAlign:'center', border:'1px solid #e5e7eb'}}>
            <p style={{color:'#6b7280', fontSize:'0.82rem', margin:0}}>
              Ingredientes: {ings?.join(', ') || 'sin datos'}
            </p>
            <p style={{color:'#9ca3af', fontSize:'0.75rem', marginTop:6}}>Busca el vídeo en YouTube para ver la preparación</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

const DIET_SETS_ES = [
  { id: 'omnivora',    icon: '🍽️', label: 'Omnívora',    desc: 'Todo tipo de alimentos' },
  { id: 'vegetariano', icon: '🥗',  label: 'Vegetariana', desc: 'Sin carne ni pescado' },
  { id: 'vegano',      icon: '🌱',  label: 'Vegana',      desc: 'Sin productos animales' },
  { id: 'saludable',   icon: '💪',  label: 'Saludable',   desc: 'Baja en grasas y azúcar' },
  { id: 'paleolitica', icon: '🥩',  label: 'Paleo',       desc: 'Sin cereales ni lácteos' },
  { id: 'foodie',      icon: '👨‍🍳', label: 'Foodie',      desc: 'Recetas elaboradas' },
];

const DIET_SETS_US = [
  { id: 'omnivora',    icon: '🍽️', label: 'Omnivore',    desc: 'All food types' },
  { id: 'vegetariano', icon: '🥗',  label: 'Vegetarian', desc: 'No meat or fish' },
  { id: 'vegano',      icon: '🌱',  label: 'Vegan',       desc: 'No animal products' },
  { id: 'saludable',   icon: '💪',  label: 'Healthy',     desc: 'Low fat and sugar' },
  { id: 'paleolitica', icon: '🥩',  label: 'Paleo',       desc: 'No grains or dairy' },
  { id: 'foodie',      icon: '👨‍🍳', label: 'Foodie',      desc: 'Elaborate recipes' },
];

function matchRecipeIng(recipeIng, catalogIngs) {
  const r=recipeIng.toLowerCase();
  return catalogIngs.find(ci=>{
    const n=ci.name.toLowerCase();
    return n===r||n.includes(r)||r.includes(n);
  });
}

/* ── Gemini: sugerir recetas con ingredientes disponibles ───
   La clave Gemini está en el servidor — nunca en el bundle.
   Límite silencioso: 5 llamadas/mes por dispositivo (UX soft-limit).
   Al agotarse, vuelve al scoring por reglas sin avisar.
──────────────────────────────────────────────────────── */
const _sKey = () => `gds_${new Date().toISOString().slice(0,7)}`;
const _getU  = () => parseInt(localStorage.getItem(_sKey()) || '0', 10);
const _incU  = () => localStorage.setItem(_sKey(), String(_getU() + 1));
const _canAI = () => _getU() < 5;

async function _geminiRecipes(availIngs, recipeNames, qty, diet) {
  if (!recipeNames.length) return [];
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return [];
  try {
    const r = await fetch('/api/gemini-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ availIngs, recipeNames, qty, diet }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d.names) ? d.names : [];
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════
   SUGERIR PLATOS — Modal Premium
═══════════════════════════════════════ */
function AutoDishModal({open,onClose,ingredients,dishes,setDishes,isPro,onUpgrade}) {
  const { isUS } = useMarket();
  const DIET_SETS = isUS ? DIET_SETS_US : DIET_SETS_ES;
  // Slots libres que le quedan al usuario free hasta llegar a FREE_DISH_LIMIT
  const freeSlots = Math.max(0, FREE_DISH_LIMIT - dishes.length);
  const [qty,setQty]=useState(isPro ? 3 : Math.max(1, freeSlots));
  const [diet,setDiet]=useState('omnivora');
  const [results,setResults]=useState(null);
  const [selected,setSelected]=useState({});
  const [added,setAdded]=useState(false);
  const [recipePreview,setRecipePreview]=useState<{name:string,ings:string[]}|null>(null);
  const [useGemini,setUseGemini]=useState(false);
  const [loading,setLoading]=useState(false);

  React.useEffect(()=>{
    if(open){
      setResults(null);setSelected({});setAdded(false);setLoading(false);
      if(!isPro) setQty(Math.max(1, Math.max(0, FREE_DISH_LIMIT - dishes.length)));
    }
  },[open]);

  function scoreRecipes() {
    const existingNames=new Set(dishes.map(d=>d.name.toLowerCase()));
    // Solo recetas completas: 4+ ings y no son guarniciones/caldos ligeros (< 200 kcal Y < 10g prot)
    let candidates=RECIPE_DB.filter(r=>!existingNames.has(r.name.toLowerCase()) && r.ings.length >= 4 && !(r.kcal < 200 && r.prot < 10));
    if(isPro && diet!=='omnivora') candidates=candidates.filter(r=>r.diets.includes(diet));

    const scored=candidates.map(recipe=>{
      const matched=recipe.ings.map(ri=>{
        const cat=matchRecipeIng(ri,ingredients);
        return {name:ri, catIng:cat||null, available:cat?cat.available:false};
      });
      const total=matched.length;
      const availCnt=matched.filter(m=>m.available).length;
      const missing=matched.filter(m=>!m.available);
      return {recipe,matched,total,availCnt,missing, score:total>0?availCnt/total:0};
    });

    scored.sort((a,b)=>b.score-a.score||a.recipe.name.localeCompare(b.recipe.name));
    // Free: solo ve exactamente FREE_SUGGESTION_LIMIT resultados (sin extras para elegir)
    // Pro: ve qty*3 para poder seleccionar entre más opciones
    const showCount = isPro ? Math.min(qty*3, scored.length) : Math.min(FREE_SUGGESTION_LIMIT, scored.length);
    const top=scored.slice(0,showCount);
    setResults({all:top,requested:qty});
    const pre={};
    top.slice(0,qty).forEach(s=>pre[s.recipe.id]=true);
    setSelected(pre);
  }

  async function searchRecipes() {
    if (useGemini && _canAI()) {
      setLoading(true);
      try {
        const existingNames=new Set(dishes.map(d=>d.name.toLowerCase()));
        let candidates=RECIPE_DB.filter(r=>!existingNames.has(r.name.toLowerCase()) && r.ings.length>=4 && !(r.kcal<200&&r.prot<10));
        if(isPro&&diet!=='omnivora') candidates=candidates.filter(r=>r.diets.includes(diet));
        const availIngs=ingredients.filter(i=>i.available).map(i=>i.name);
        // Pre-score candidates by ingredient match so Gemini only sees high-match recipes
        const _ingGroup=(name:string)=>name.toLowerCase().split(/[\s,]+/)[0];
        const preScored=candidates
          .map(r=>{
            const avail=r.ings.filter(ri=>{ const c=matchRecipeIng(ri,ingredients); return c?.available; }).length;
            return { r, score: r.ings.length ? avail/r.ings.length : 0 };
          })
          .filter(({score})=>score>0)           // at least 1 ingredient available
          .sort((a,b)=>b.score-a.score)         // best match first
          .slice(0,80)                           // top 80 → Gemini picks the most varied
          .map(({r})=>r);
        // Diversity filter: max 2 per ingredient group
        const _groupCount=new Map<string,number>();
        const diverseCandidates=preScored.filter(r=>{
          const g=_ingGroup(r.name); const n=_groupCount.get(g)||0;
          if(n>=2) return false; _groupCount.set(g,n+1); return true;
        });
        const geminiNames=await _geminiRecipes(availIngs, diverseCandidates.map(r=>r.name), qty, diet);
        if(geminiNames.length){
          _incU();
          const map=new Map(candidates.map(r=>[r.name.toLowerCase(),r]));
          let ordered=geminiNames.map(n=>map.get(n.toLowerCase())).filter(Boolean);
          // Post-dedup: remove recipes that share the same main ingredient as an earlier pick
          const _usedGroups=new Set<string>();
          ordered=ordered.filter(r=>{ const g=_ingGroup(r.name); if(_usedGroups.has(g)) return false; _usedGroups.add(g); return true; });
          if(ordered.length<qty){
            const usedIds=new Set(ordered.map(r=>r.id));
            const _usedGroups2=new Set(ordered.map(r=>_ingGroup(r.name)));
            // fill with best-matching candidates not yet used (preScored is already sorted by match%)
            const fills=preScored.filter(r=>!usedIds.has(r.id)&&!_usedGroups2.has(_ingGroup(r.name)));
            ordered=[...ordered,...fills.slice(0,qty-ordered.length)];
          }
          const scored=ordered.map(recipe=>{
            const matched=recipe.ings.map(ri=>{const cat=matchRecipeIng(ri,ingredients);return{name:ri,catIng:cat||null,available:cat?cat.available:false};});
            const availCnt=matched.filter(m=>m.available).length;
            return{recipe,matched,total:matched.length,availCnt,missing:matched.filter(m=>!m.available),score:matched.length?availCnt/matched.length:0};
          });
          setLoading(false);
          // Free: limitar también los resultados Gemini a FREE_SUGGESTION_LIMIT
          const visibleScored = isPro ? scored : scored.slice(0, FREE_SUGGESTION_LIMIT);
          setResults({all:visibleScored,requested:qty});
          const pre={};visibleScored.forEach(s=>{pre[s.recipe.id]=true;});setSelected(pre);
          return;
        }
      } catch {}
      setLoading(false);
    }
    scoreRecipes();
  }

  function addSelected() {
    if(!results) return;
    let toAdd=results.all.filter(s=>selected[s.recipe.id]);
    if(!toAdd.length) return;
    // Free: nunca superar FREE_DISH_LIMIT en total
    if(!isPro) toAdd=toAdd.slice(0, freeSlots);
    if(!toAdd.length) return;
    const newDishes=toAdd.map(s=>({
      id:'d'+uid(), name:s.recipe.name,
      ingredients:s.matched.filter(m=>m.catIng).map(m=>m.catIng.id),
      kcal:s.recipe.kcal, prot:s.recipe.prot, carbs:s.recipe.carbs, fat:s.recipe.fat,
    }));
    setDishes(ds=>[...ds,...newDishes]);
    setAdded(true);
  }

  const toggleSel=id=>setSelected(s=>({...s,[id]:!s[id]}));
  const selCount=Object.values(selected).filter(Boolean).length;
  const pct=n=>Math.round(n*100);

  return (
    <>
    <Modal open={open} onClose={onClose} title={isUS ? '✨ Suggest recipes' : '✨ Sugerir platos'} wide>
      {added?(
        <div className="space-y-4 text-center py-2">
          <div className="text-4xl">🎉</div>
          <p className="font-bold text-gray-800">{isUS ? 'Recipes added!' : '¡Platos añadidos!'}</p>
          <p className="text-sm text-gray-500">{selCount} {isUS ? 'recipe' : 'plato'}{selCount!==1?'s':''} {isUS ? 'added' : 'añadido'}{selCount!==1?'s':''} {isUS ? 'to your list.' : 'a tu lista.'}</p>
          <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{background:'#0d9488',color:'#fff'}}>{isUS ? 'Perfect, close' : 'Perfecto, cerrar'}</button>
        </div>
      ):!results?(
        <div className="space-y-4">
          {/* Diet selector — Pro only */}
          {isPro?(
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">{isUS ? 'Diet type' : 'Tipo de dieta'}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DIET_SETS.map(ds=>(
                  <button key={ds.id} type="button" onClick={()=>setDiet(ds.id)}
                    className={`py-2 px-2.5 rounded-xl border-2 text-left transition-all
                      ${diet===ds.id?'border-teal-400 bg-teal-50':'border-gray-200 bg-white hover:border-teal-200'}`}
                    style={{boxShadow: diet===ds.id?'0 3px 10px rgba(13,148,136,.18)':'0 2px 6px rgba(0,0,0,.07)'}}>
                    <div className="text-base mb-0.5">{ds.icon}</div>
                    <div className={`text-xs font-bold ${diet===ds.id?'text-teal-700':'text-gray-600'}`}>{ds.label}</div>
                    <div className={`text-[10px] ${diet===ds.id?'text-teal-600':'text-gray-400'}`}>{ds.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ):(
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 cursor-pointer" onClick={()=>onUpgrade('upgrade')}>
              <span className="text-lg">🥗</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-teal-700">{isUS ? 'Diet filters — Pro' : 'Filtros de dieta — Pro'}</p>
                <p className="text-[10px] text-teal-600">{isUS ? 'Vegan · Healthy · Paleo · Foodie and more' : 'Vegano · Saludable · Paleo · Foodie y más'}</p>
              </div>
              <span className="text-xs font-bold text-teal-600">🔒 {isUS ? 'See' : 'Ver'}</span>
            </div>
          )}
          {/* ── Toggle "Con lo que tengo en despensa" ── */}
          <button type="button" onClick={()=>setUseGemini(v=>!v)}
            className={`w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl border-2 transition-all text-left
              ${useGemini?'border-emerald-400 bg-emerald-50':'border-gray-200 bg-white hover:border-emerald-200'}`}
            style={{boxShadow:useGemini?'0 3px 10px rgba(16,185,129,.18)':'0 2px 6px rgba(0,0,0,.07)'}}>
            <span className="text-lg">🥬</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold leading-tight ${useGemini?'text-emerald-700':'text-gray-600'}`}>{isUS ? 'From my pantry' : 'Con lo que tengo en despensa'}</p>
              <p className={`text-[10px] leading-tight mt-0.5 ${useGemini?'text-emerald-500':'text-gray-400'}`}>{isUS ? 'Prioritize ingredients you already have' : 'Prioriza los ingredientes que ya tienes disponibles'}</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 shrink-0 ${useGemini?'bg-emerald-500':'bg-gray-200'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${useGemini?'translate-x-5':'translate-x-0'}`}/>
            </div>
          </button>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              {isUS ? 'How many recipes?' : '¿Cuántos platos?'}
              {!isPro && <span className="ml-2 text-xs text-gray-400 font-normal">{freeSlots > 0 ? (isUS ? `you can add ${freeSlots} more` : `puedes añadir ${freeSlots} más`) : (isUS ? 'limit reached' : 'límite alcanzado')}</span>}
            </p>
            {!isPro && freeSlots === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-3 text-center">
                <p className="text-xs font-bold text-amber-700 mb-1">{isUS ? `You've reached the limit of ${FREE_DISH_LIMIT} recipes` : `Has alcanzado el límite de ${FREE_DISH_LIMIT} platos`}</p>
                <button onClick={()=>onUpgrade('upgrade')} className="text-xs font-bold text-teal-600">{isUS ? 'Unlock Pro →' : 'Desbloquear Pro →'}</button>
              </div>
            ) : (
              <div className="flex gap-2">
                {(isPro ? [1,2,3,4,5,6,8,10] : Array.from({length: freeSlots}, (_,i)=>i+1)).map(n=>(
                  <button key={n} type="button" onClick={()=>setQty(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all
                      ${qty===n?'border-teal-500 bg-teal-50 text-teal-700':'border-gray-200 bg-white text-gray-500 hover:border-teal-200'}`}
                    style={{boxShadow: qty===n?'0 3px 10px rgba(13,148,136,.18)':'0 2px 6px rgba(0,0,0,.07)'}}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
            📦 +100 {isUS ? 'recipes' : 'recetas'} · {ingredients.filter(i=>i.available).length} {isUS ? 'ingredients available' : 'ingredientes disponibles'}
            {isPro&&diet!=='omnivora'&&<span className="ml-1 text-amber-600 font-semibold">· {DIET_SETS.find(d=>d.id===diet)?.label}</span>}
          </div>
          <button onClick={searchRecipes} disabled={loading}
            className="w-full rounded-xl py-3 font-bold text-sm transition-all"
            style={{background:loading?'#5eead4':'#0d9488',color:'#fff',boxShadow:'0 2px 8px rgba(13,148,136,.3)',opacity:loading?.85:1}}>
            {loading ? (isUS ? 'Searching...' : 'Buscando...') : (isUS ? 'Find recipes' : 'Buscar recetas')}
          </button>
        </div>
      ):(
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">{isUS ? 'Suggested recipes' : 'Recetas sugeridas'}</p>
            <button onClick={()=>setResults(null)} className="text-xs text-gray-400 hover:text-gray-600">← {isUS ? 'Change' : 'Cambiar'}</button>
          </div>
          <p className="text-xs text-gray-400">{isUS ? 'Select the ones you want to add.' : 'Selecciona las que quieres añadir.'} {selCount} {isUS ? 'selected' : 'seleccionada'}{selCount!==1?'s':''}.</p>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-0.5">
            {results.all.map((s)=>{
              const isSel=!!selected[s.recipe.id];
              const pctVal=pct(s.score);
              const barColor=pctVal===100?'bg-teal-500':pctVal>=60?'bg-amber-400':'bg-red-300';
              return (
                <button key={s.recipe.id} type="button" onClick={()=>toggleSel(s.recipe.id)}
                  className="w-full text-left rounded-2xl border-2 p-3 transition-all"
                  style={{
                    borderColor: isSel ? '#2dd4bf' : '#e2e8f0',
                    background: isSel ? '#f0fdf4' : '#fff',
                    boxShadow: isSel ? '0 3px 12px rgba(13,148,136,.15)' : '0 2px 8px rgba(0,0,0,.07)',
                  }}>
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                      ${isSel?'border-teal-500 bg-teal-500':'border-gray-300'}`}>
                      {isSel&&<span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{s.recipe.name}</p>
                        <span className={`text-xs font-bold shrink-0 px-1.5 py-0.5 rounded-full
                          ${pctVal===100?'bg-teal-100 text-teal-700':pctVal>=60?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                          {pctVal}%
                        </span>
                      </div>
                      {/* Macros — solo Ultra */}
                      {isPro&&s.recipe.kcal&&(
                        <>
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">🔥 {s.recipe.kcal} kcal</span>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">P {s.recipe.prot}g</span>
                          <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full font-semibold">C {s.recipe.carbs}g</span>
                          <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-semibold">G {s.recipe.fat}g</span>
                          {(s.recipe.sugar||0)>0&&<span className="text-[10px] bg-pink-50 text-pink-500 px-1.5 py-0.5 rounded-full font-semibold">Az {s.recipe.sugar}g</span>}
                        </div>
                        <p className="text-[9px] text-gray-300 mb-1.5">Valores por ración (100g aprox.)</p>
                        </>
                      )}
                      {/* Barra de compatibilidad */}
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{width:`${pctVal}%`}}/>
                      </div>
                      {/* Ingredientes chips */}
                      <div className="flex flex-wrap gap-1">
                        {s.matched.map((m,mi)=>(
                          <span key={mi} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                            ${m.available?'bg-teal-100 text-teal-700':m.catIng?'bg-amber-100 text-amber-600':'bg-gray-100 text-gray-400'}`}>
                            {m.available?'✓ ':m.catIng?'⚠ ':'✗ '}{m.name}
                          </span>
                        ))}
                      </div>
                      {s.missing.length>0&&(
                        <p className="text-[10px] text-amber-600 mt-1.5 leading-snug">
                          Faltan: {s.missing.map(m=>m.name).join(', ')}
                        </p>
                      )}
                      {isPro&&(
                        <button
                          type="button"
                          onClick={e=>{e.stopPropagation();setRecipePreview({name:s.recipe.name,ings:s.recipe.ings});}}
                          style={{
                            marginTop:6, fontSize:'0.7rem', fontWeight:700,
                            color:'#0d9488', background:'#f0fdf4',
                            border:'1px solid #99f6e4', borderRadius:8,
                            padding:'3px 9px', cursor:'pointer',
                          }}>
                          📖 Ver preparación
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={addSelected} disabled={selCount===0}
            className="w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{
              background: selCount===0 ? '#e5e7eb' : '#0d9488',
              color: selCount===0 ? '#6b7280' : '#fff',
              boxShadow: selCount===0 ? 'none' : '0 3px 12px rgba(13,148,136,.35)',
              cursor: selCount===0 ? 'not-allowed' : 'pointer',
            }}>
            {isUS ? 'Add' : 'Añadir'} {selCount>0 ? (isUS ? `${selCount} recipe${selCount!==1?'s':''}` : `${selCount} plato${selCount!==1?'s':''}`) : (isUS ? 'selected recipes' : ' platos seleccionados')}
          </button>
        </div>
      )}
    </Modal>
    <RecipeModal
      open={!!recipePreview}
      onClose={()=>setRecipePreview(null)}
      dishName={recipePreview?.name ?? ''}
      ings={recipePreview?.ings ?? []}
    />
    </>
  );
}

/* ═══════════════════════════════════════
   PLATOS
═══════════════════════════════════════ */
function DishForm({form,setForm,ingredients,toggleIng,onSave}) {
  const { isUS } = useMarket();
  const [openCats,setOpenCats]=useState({});
  const toggleCat=cat=>setOpenCats(o=>({...o,[cat]:!o[cat]}));
  const photoRef=useRef(null);
  const cameraRef=useRef(null);

  const handleFile=async(file)=>{
    if(!file) return;
    try { const b64=await resizeImage(file); setForm(f=>({...f,photo:b64})); } catch {}
  };

  return (
    <div className="space-y-4">
      {/* ── Foto del plato ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{isUS ? 'Recipe photo' : 'Foto del plato'}</label>
        <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
          {/* Preview */}
          <div style={{
            width:80,height:80,borderRadius:16,overflow:'hidden',flexShrink:0,
            background:'#f1f5f9',border:'2px dashed #cbd5e1',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',
          }}>
            {form.photo
              ? <img src={form.photo} alt="foto" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : '🍳'}
          </div>
          {/* Botones */}
          <div style={{display:'flex',flexDirection:'column',gap:6,flex:1}}>
            <button type="button" onClick={()=>cameraRef.current?.click()}
              style={{borderRadius:12,padding:'8px 12px',fontWeight:700,fontSize:'0.78rem',color:'#fff',background:'#0d9488',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              📷 {isUS ? 'Take photo' : 'Hacer foto'}
            </button>
            <button type="button" onClick={()=>photoRef.current?.click()}
              style={{borderRadius:12,padding:'8px 12px',fontWeight:700,fontSize:'0.78rem',color:'#0d9488',background:'#f0fdf4',border:'1.5px solid #5eead4',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              🖼️ {isUS ? 'Upload image' : 'Subir imagen'}
            </button>
            {form.photo && (
              <button type="button" onClick={()=>setForm(f=>({...f,photo:''}))}
                style={{borderRadius:12,padding:'6px 12px',fontWeight:600,fontSize:'0.72rem',color:'#ef4444',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                ✕ Quitar foto
              </button>
            )}
          </div>
        </div>
        {/* Inputs ocultos */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}}
          onChange={e=>{handleFile(e.target.files?.[0]);e.target.value='';}}/>
        <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}}
          onChange={e=>{handleFile(e.target.files?.[0]);e.target.value='';}}/>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{isUS ? 'Name' : 'Nombre'}</label>
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={isUS ? 'Recipe name...' : 'Nombre del plato...'}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">▶️ {isUS ? 'YouTube link' : 'Enlace YouTube'} <span style={{fontWeight:400,color:'#9ca3af'}}>{isUS ? '(optional)' : '(opcional)'}</span></label>
        <input value={form.youtubeUrl||''} onChange={e=>setForm(f=>({...f,youtubeUrl:e.target.value}))}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
          style={{fontFamily:'monospace',fontSize:'0.8rem'}}/>
        {form.youtubeUrl?.trim() && !/youtu/.test(form.youtubeUrl) && (
          <p style={{fontSize:'0.7rem',color:'#f97316',marginTop:4}}>No parece un enlace de YouTube</p>
        )}
      </div>

      {/* ── Preparación ── */}
      <div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <label className="block text-sm font-medium text-gray-700">🍳 {isUS ? 'Instructions' : 'Preparación'} <span style={{fontWeight:400,color:'#9ca3af'}}>{isUS ? '(optional)' : '(opcional)'}</span></label>
          <button type="button"
            onClick={()=>setForm(f=>({...f,steps:[...(f.steps||[]),'']}))}
            style={{fontSize:'0.72rem',fontWeight:700,color:'#0d9488',background:'#f0fdf4',border:'1.5px solid #5eead4',borderRadius:8,padding:'3px 10px',cursor:'pointer'}}>
            + {isUS ? 'Step' : 'Paso'}
          </button>
        </div>
        {(form.steps||[]).length===0 && (
          <p style={{fontSize:'0.75rem',color:'#9ca3af',padding:'8px 0'}}>{isUS ? 'No steps — press "+ Step" to add instructions' : 'Sin pasos — pulsa "+ Paso" para añadir instrucciones'}</p>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {(form.steps||[]).map((step,i)=>(
            <div key={i} style={{display:'flex',gap:6,alignItems:'flex-start'}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:'#0d9488',color:'#fff',fontSize:'0.7rem',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:6}}>{i+1}</div>
              <textarea
                value={step}
                onChange={e=>{const s=[...(form.steps||[])];s[i]=e.target.value;setForm(f=>({...f,steps:s}));}}
                placeholder={isUS ? `Step ${i+1}...` : `Paso ${i+1}...`}
                rows={2}
                style={{flex:1,borderRadius:10,border:'1.5px solid #e2e8f0',padding:'7px 10px',fontSize:'0.82rem',resize:'vertical',lineHeight:1.4,fontFamily:'inherit'}}
                className="focus:outline-none focus:ring-2 focus:ring-teal-200"
              />
              <button type="button"
                onClick={()=>setForm(f=>({...f,steps:(f.steps||[]).filter((_,j)=>j!==i)}))}
                style={{color:'#ef4444',background:'none',border:'none',cursor:'pointer',fontSize:'1rem',padding:'4px',marginTop:4}}>
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{isUS ? 'Ingredients' : 'Ingredientes'} ({form.ingredients.length} {isUS ? 'sel.' : 'sel.'})</label>
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {CATEGORIES.map(cat=>{
            const ci=ingredients.filter(i=>i.category===cat);
            if(!ci.length) return null;
            const selCount=ci.filter(i=>form.ingredients.includes(i.id)).length;
            const isOpen=!!openCats[cat];
            return(
              <div key={cat} className="rounded-xl overflow-hidden border border-gray-100">
                <button type="button" onClick={()=>toggleCat(cat)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-teal-50 transition-colors">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {CAT_EMOJI[cat]} {cat}
                  </span>
                  <span className="flex items-center gap-2">
                    {selCount>0&&<span className="text-[10px] bg-teal-100 text-teal-700 font-bold px-1.5 py-0.5 rounded-full">{selCount} sel.</span>}
                    <span className="text-gray-400 text-xs">{isOpen?'▲':'▼'}</span>
                  </span>
                </button>
                {isOpen&&(
                  <div className="bg-white px-2 py-1">
                    {ci.map(ing=>(
                      <label key={ing.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 rounded-lg px-2">
                        <input type="checkbox" checked={form.ingredients.includes(ing.id)} onChange={()=>toggleIng(ing.id)} className="w-4 h-4 rounded accent-teal-600"/>
                        <span className="text-sm text-gray-700">{ing.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={onSave}
        className="w-full rounded-xl py-3 text-sm font-bold"
        style={{background:'#0d9488',color:'#fff',boxShadow:'0 2px 8px rgba(13,148,136,.3)'}}>
        💾 {isUS ? 'Save recipe' : 'Guardar plato'}
      </button>
    </div>
  );
}

export function Platos({dishes,setDishes,ingredients,isPro,onUpgrade}) {
  const { isUS } = useMarket();
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({name:'',ingredients:[]});
  const [confirm,setConfirm]=useState(null);
  const [confirmClear,setConfirmClear]=useState(false);
  const [autoModal,setAutoModal]=useState(false);
  const [recipeModal,setRecipeModal]=useState<{name:string,ings:string[]}|null>(null);
  const ingMap=useMemo(()=>Object.fromEntries(ingredients.map(i=>[i.id,i])),[ingredients]);

  const openAdd=()=>{
    if(!isPro && dishes.length >= FREE_DISH_LIMIT){ onUpgrade('dishes'); return; }
    setForm({name:'',ingredients:[],photo:'',youtubeUrl:'',steps:[]});setModal('add');
  };
  const openEdit=d=>{setForm({...d,ingredients:[...d.ingredients],photo:d.photo||'',youtubeUrl:d.youtubeUrl||'',steps:d.steps||[]});setModal(d.id);};
  const toggleIng=id=>setForm(f=>({...f,ingredients:f.ingredients.includes(id)?f.ingredients.filter(x=>x!==id):[...f.ingredients,id]}));
  const save=()=>{
    if(!form.name.trim()) return;
    const yt=form.youtubeUrl?.trim()||undefined;
    const st=(form.steps||[]).map(s=>s.trim()).filter(Boolean);
    if(modal==='add') setDishes(ds=>[...ds,{id:'d'+uid(),name:form.name.trim(),ingredients:form.ingredients,photo:form.photo||undefined,youtubeUrl:yt,steps:st.length?st:undefined}]);
    else setDishes(ds=>ds.map(d=>d.id===modal?{...d,...form,name:form.name.trim(),photo:form.photo||undefined,youtubeUrl:yt,steps:st.length?st:undefined}:d));
    setModal(null);
  };
  const atLimit = !isPro && dishes.length >= FREE_DISH_LIMIT;

  return (
    <div className="fade-in">

      {/* ── Free plan banner ── */}
      {!isPro&&(
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
          style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
          <span className="text-xs text-amber-700 font-semibold">{isUS ? 'Free plan' : 'Plan gratuito'} · {dishes.length}/{FREE_DISH_LIMIT} {isUS ? 'recipes' : 'platos'}</span>
          <button onClick={()=>onUpgrade('dishes')} className="text-xs font-bold text-teal-600">{isUS ? 'Unlock Pro →' : 'Desbloquear Pro →'}</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-none" style={{letterSpacing:'-0.02em'}}>
              {isUS ? 'My Recipes' : 'Mis platos'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              <span className="font-bold text-teal-600">{dishes.filter(d=>!d.example).length}</span> {isUS ? 'own' : 'propios'}
              {dishes.some(d=>d.example) && <> · <span className="text-gray-300">{dishes.filter(d=>d.example).length} {isUS ? 'examples' : 'ejemplos'}</span></>}
            </p>
          </div>
          <div className="flex gap-2">
            {dishes.length > 0 && (
              <button onClick={()=>setConfirmClear(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{background:'#fef2f2',color:'#ef4444',border:'1px solid #fecaca'}}>
                <span style={{display:'flex',alignItems:'center',gap:6}}><Trash size={14}/> {isUS ? 'All' : 'Todos'}</span>
              </button>
            )}
            <button onClick={()=>setAutoModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{background:'#f0fdf4',color:'#0d9488',border:'1px solid #99f6e4'}}>
              {isUS ? 'Suggest' : 'Sugerir'}
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
              style={{
                background: atLimit ? '#e2e8f0' : '#0d9488',
                color: atLimit ? '#94a3b8' : '#fff',
                boxShadow: atLimit ? 'none' : '0 2px 8px rgba(13,148,136,.3)',
              }}>
              {atLimit ? (isUS ? 'New recipe' : 'Nuevo plato') : (isUS ? 'New recipe' : 'Nuevo plato')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Dish cards ── */}
      <div className="space-y-3">
        {dishes.map(dish=>(
          <div key={dish.id} className="bg-white rounded-2xl p-4"
            style={{
              border: dish.example ? '1px solid #fde68a' : '1px solid #e8edf2',
              background: dish.example ? '#fffbeb' : '#fff',
              boxShadow: dish.example ? '0 2px 8px rgba(217,119,6,.1)' : '0 2px 8px rgba(0,0,0,.08)',
            }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="shrink-0" style={{width:40,height:40,borderRadius:12,overflow:'hidden',background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem'}}>
                    {dish.photo
                      ? <img src={dish.photo} alt={dish.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      : '🍳'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{dish.name}</h3>
                    {dish.example&&<span className="text-[10px] font-bold uppercase tracking-wide" style={{color:'#d97706'}}>{isUS ? 'example' : 'ejemplo'}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 ml-10">
                  {[...new Set(dish.ingredients)].map(iid=>{const ing=ingMap[iid];if(!ing)return null;return(
                    <span key={iid} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CAT_BG[ing.category]} ${CAT_TEXT[ing.category]}`}>{ing.name}</span>
                  );})}
                  {!dish.ingredients.length&&<span className="text-xs text-gray-300">{isUS ? 'No ingredients' : 'Sin ingredientes'}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={()=>{
                    const recipeMatch = RECIPE_DB.find(r=>r.name.toLowerCase()===dish.name.toLowerCase());
                    const ingNames = recipeMatch
                      ? recipeMatch.ings
                      : dish.ingredients.map((iid:string)=>ingMap[iid]?.name).filter(Boolean);
                    setRecipeModal({name:dish.name, ings:ingNames, youtubeUrl:dish.youtubeUrl||'', steps:dish.steps||[]});
                  }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-sm"
                    style={{background:'#f0fdf4',border:'1px solid #99f6e4'}}
                    title={isUS ? 'View recipe' : 'Ver receta'}>📖</button>
                <button onClick={()=>openEdit(dish)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-sm"
                  style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>✏️</button>
                <button onClick={()=>setConfirm(dish.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-sm"
                  style={{background:'#fef2f2',border:'1px solid #fecaca',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash size={14}/></button>
              </div>
            </div>
          </div>
        ))}
        {!dishes.length&&(
          <div className="text-center py-12">
            <div className="text-5xl mb-3" style={{display:'flex',alignItems:'center',justifyContent:'center'}}></div>
            <p className="font-semibold text-gray-400 text-sm">{isUS ? 'You have no recipes yet' : 'Aún no tienes platos'}</p>
            <p className="text-xs text-gray-300 mt-1">{isUS ? 'Add your favorite recipes' : 'Añade tus recetas habituales'}</p>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='add' ? (isUS ? 'New recipe' : 'Nuevo plato') : (isUS ? 'Edit recipe' : 'Editar plato')} wide>
        <DishForm form={form} setForm={setForm} ingredients={ingredients} toggleIng={toggleIng} onSave={save}/>
      </Modal>
      <Confirm open={!!confirm} msg={isUS ? 'Delete this recipe?' : '¿Eliminar este plato?'}
        onOk={()=>{setDishes(ds=>ds.filter(d=>d.id!==confirm));setConfirm(null);}}
        onCancel={()=>setConfirm(null)}/>
      <Confirm open={confirmClear} msg={isUS ? `Delete all ${dishes.length} recipes? This action cannot be undone.` : `¿Eliminar los ${dishes.length} platos? Esta acción no se puede deshacer.`}
        onOk={()=>{setDishes([]);setConfirmClear(false);}}
        onCancel={()=>setConfirmClear(false)}/>
      <AutoDishModal open={autoModal} onClose={()=>setAutoModal(false)}
        ingredients={ingredients} dishes={dishes} setDishes={setDishes}
        isPro={isPro} onUpgrade={onUpgrade}/>
      <RecipeModal
        open={!!recipeModal}
        onClose={()=>setRecipeModal(null)}
        dishName={recipeModal?.name ?? ''}
        ings={recipeModal?.ings ?? []}
        youtubeUrl={recipeModal?.youtubeUrl ?? ''}
        customSteps={recipeModal?.steps ?? []}
      />
    </div>
  );
}


