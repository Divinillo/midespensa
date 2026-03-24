// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Confirm } from '../../components/ui/Confirm';
import { uid } from '../../utils/helpers';
import { CAT_BG, CAT_TEXT, CAT_EMOJI, CATEGORIES, FREE_DISH_LIMIT, ING_EMOJI } from '../../data/categories';
import { RECIPE_DB } from '../../data/recipes';
import type { Ingredient, Dish } from '../../data/types';

function matchRecipeIng(recipeIng, catalogIngs) {
  const r=recipeIng.toLowerCase();
  return catalogIngs.find(ci=>{
    const n=ci.name.toLowerCase();
    return n===r||n.includes(r)||r.includes(n);
  });
}

/* ═══════════════════════════════════════
   SUGERIR PLATOS — Modal Premium
═══════════════════════════════════════ */
function AutoDishModal({open,onClose,ingredients,dishes,setDishes,isUltra,onUpgrade}) {
  const [qty,setQty]=useState(3);
  const [diet,setDiet]=useState('omnivora');
  const [results,setResults]=useState(null);
  const [selected,setSelected]=useState({});
  const [added,setAdded]=useState(false);

  React.useEffect(()=>{ if(open){setResults(null);setSelected({});setAdded(false);} },[open]);

  function scoreRecipes() {
    const existingNames=new Set(dishes.map(d=>d.name.toLowerCase()));
    let candidates=RECIPE_DB.filter(r=>!existingNames.has(r.name.toLowerCase()));
    if(isUltra && diet!=='omnivora') candidates=candidates.filter(r=>r.diets.includes(diet));

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
    const top=scored.slice(0,Math.min(qty*3,scored.length));
    setResults({all:top,requested:qty});
    const pre={};
    top.slice(0,qty).forEach(s=>pre[s.recipe.id]=true);
    setSelected(pre);
  }

  function addSelected() {
    if(!results) return;
    const toAdd=results.all.filter(s=>selected[s.recipe.id]);
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
    <Modal open={open} onClose={onClose} title="✨ Sugerir platos" wide>
      {added?(
        <div className="space-y-4 text-center py-2">
          <div className="text-4xl">🎉</div>
          <p className="font-bold text-gray-800">¡Platos añadidos!</p>
          <p className="text-sm text-gray-500">{selCount} plato{selCount!==1?'s':''} añadido{selCount!==1?'s':''} a tu lista.</p>
          <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{background:'#16a34a',color:'#fff'}}>Perfecto, cerrar</button>
        </div>
      ):!results?(
        <div className="space-y-4">
          {/* Diet selector — Ultra only */}
          {isUltra?(
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Tipo de dieta</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DIET_SETS.map(ds=>(
                  <button key={ds.id} type="button" onClick={()=>setDiet(ds.id)}
                    className={`py-2 px-2.5 rounded-xl border-2 text-left transition-all
                      ${diet===ds.id?'border-purple-400 bg-purple-50':'border-gray-100 bg-gray-50 hover:border-purple-200'}`}>
                    <div className={`text-xs font-bold ${diet===ds.id?'text-purple-700':'text-gray-600'}`}>{ds.label}</div>
                    <div className={`text-[10px] ${diet===ds.id?'text-purple-500':'text-gray-400'}`}>{ds.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ):(
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 cursor-pointer" onClick={()=>onUpgrade('ultra')}>
              <span className="text-lg">👨‍🍳</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-purple-700">Filtros de dieta — Ultra Chef</p>
                <p className="text-[10px] text-purple-500">Vegano · Saludable · Paleo · Foodie y más</p>
              </div>
              <span className="text-xs font-bold text-purple-500">🔒 Ver</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">¿Cuántos platos?</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n=>(
                <button key={n} type="button" onClick={()=>setQty(n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all
                    ${qty===n?'border-green-500 bg-green-50 text-green-700':'border-gray-100 bg-gray-50 text-gray-500 hover:border-green-200'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
            📦 +100 recetas · {ingredients.filter(i=>i.available).length} ingredientes disponibles
            {isUltra&&diet!=='omnivora'&&<span className="ml-1 text-purple-500 font-semibold">· {DIET_SETS.find(d=>d.id===diet)?.label}</span>}
          </div>
          <button onClick={scoreRecipes}
            className="w-full rounded-xl py-3 font-bold text-sm active:scale-95 transition-all"
            style={{background:'#16a34a',color:'#fff',boxShadow:'0 2px 8px rgba(22,163,74,.3)'}}>
            🔍 Buscar recetas
          </button>
        </div>
      ):(
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Recetas sugeridas</p>
            <button onClick={()=>setResults(null)} className="text-xs text-gray-400 hover:text-gray-600">← Cambiar</button>
          </div>
          <p className="text-xs text-gray-400">Selecciona las que quieres añadir. {selCount} seleccionada{selCount!==1?'s':''}.</p>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-0.5">
            {results.all.map((s)=>{
              const isSel=!!selected[s.recipe.id];
              const pctVal=pct(s.score);
              const barColor=pctVal===100?'bg-green-500':pctVal>=60?'bg-amber-400':'bg-red-300';
              return (
                <button key={s.recipe.id} type="button" onClick={()=>toggleSel(s.recipe.id)}
                  className={`w-full text-left rounded-2xl border-2 p-3 transition-all
                    ${isSel?'border-green-400 bg-green-50':'border-gray-100 bg-white hover:border-green-200'}`}>
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                      ${isSel?'border-green-500 bg-green-500':'border-gray-300'}`}>
                      {isSel&&<span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{s.recipe.name}</p>
                        <span className={`text-xs font-bold shrink-0 px-1.5 py-0.5 rounded-full
                          ${pctVal===100?'bg-green-100 text-green-700':pctVal>=60?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                          {pctVal}%
                        </span>
                      </div>
                      {/* Macros — solo Ultra */}
                      {isUltra&&s.recipe.kcal&&(
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
                            ${m.available?'bg-green-100 text-green-700':m.catIng?'bg-amber-100 text-amber-600':'bg-gray-100 text-gray-400'}`}>
                            {m.available?'✓ ':m.catIng?'⚠ ':'✗ '}{m.name}
                          </span>
                        ))}
                      </div>
                      {s.missing.length>0&&(
                        <p className="text-[10px] text-amber-600 mt-1.5 leading-snug">
                          🛒 Faltan: {s.missing.map(m=>m.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={addSelected} disabled={selCount===0}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all
              ${selCount===0?'bg-gray-100 text-gray-300 cursor-not-allowed':'bg-green-600 text-white hover:bg-green-700 shadow-sm active:scale-95'}`}>
            ➕ Añadir {selCount>0?`${selCount} plato${selCount!==1?'s':''}`:' platos seleccionados'}
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════
   PLATOS
═══════════════════════════════════════ */
function DishForm({form,setForm,ingredients,toggleIng,onSave}) {
  const [openCats,setOpenCats]=useState({});
  const toggleCat=cat=>setOpenCats(o=>({...o,[cat]:!o[cat]}));
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nombre del plato..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes ({form.ingredients.length} sel.)</label>
        <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {CATEGORIES.map(cat=>{
            const ci=ingredients.filter(i=>i.category===cat);
            if(!ci.length) return null;
            const selCount=ci.filter(i=>form.ingredients.includes(i.id)).length;
            const isOpen=!!openCats[cat];
            return(
              <div key={cat} className="rounded-xl overflow-hidden border border-gray-100">
                <button type="button" onClick={()=>toggleCat(cat)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-green-50 transition-colors">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                    {CAT_EMOJI[cat]} {cat}
                  </span>
                  <span className="flex items-center gap-2">
                    {selCount>0&&<span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">{selCount} sel.</span>}
                    <span className="text-gray-400 text-xs">{isOpen?'▲':'▼'}</span>
                  </span>
                </button>
                {isOpen&&(
                  <div className="bg-white px-2 py-1">
                    {ci.map(ing=>(
                      <label key={ing.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 rounded-lg px-2">
                        <input type="checkbox" checked={form.ingredients.includes(ing.id)} onChange={()=>toggleIng(ing.id)} className="w-4 h-4 rounded accent-green-600"/>
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
        style={{background:'#16a34a',color:'#fff',boxShadow:'0 2px 8px rgba(22,163,74,.3)'}}>
        💾 Guardar plato
      </button>
    </div>
  );
}

export function Platos({dishes,setDishes,ingredients,isPro,isUltra,onUpgrade}) {
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({name:'',ingredients:[]});
  const [confirm,setConfirm]=useState(null);
  const [autoModal,setAutoModal]=useState(false);
  const ingMap=useMemo(()=>Object.fromEntries(ingredients.map(i=>[i.id,i])),[ingredients]);

  const openAdd=()=>{
    if(!isPro && dishes.length >= FREE_DISH_LIMIT){ onUpgrade('dishes'); return; }
    setForm({name:'',ingredients:[]});setModal('add');
  };
  const openEdit=d=>{setForm({...d,ingredients:[...d.ingredients]});setModal(d.id);};
  const toggleIng=id=>setForm(f=>({...f,ingredients:f.ingredients.includes(id)?f.ingredients.filter(x=>x!==id):[...f.ingredients,id]}));
  const save=()=>{
    if(!form.name.trim()) return;
    if(modal==='add') setDishes(ds=>[...ds,{id:'d'+uid(),name:form.name.trim(),ingredients:form.ingredients}]);
    else setDishes(ds=>ds.map(d=>d.id===modal?{...d,...form,name:form.name.trim()}:d));
    setModal(null);
  };
  const atLimit = !isPro && dishes.length >= FREE_DISH_LIMIT;

  return (
    <div className="fade-in">

      {/* ── Free plan banner ── */}
      {!isPro&&(
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
          style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
          <span className="text-xs text-amber-700 font-semibold">🔒 Plan gratuito · {dishes.length}/{FREE_DISH_LIMIT} platos</span>
          <button onClick={()=>onUpgrade('dishes')} className="text-xs font-bold text-green-600">Desbloquear Pro →</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-none" style={{letterSpacing:'-0.02em'}}>
              Mis platos 🍳
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              <span className="font-bold text-green-600">{dishes.filter(d=>!d.example).length}</span> propios
              {dishes.some(d=>d.example) && <> · <span className="text-gray-300">{dishes.filter(d=>d.example).length} ejemplos</span></>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>isPro?setAutoModal(true):onUpgrade('autodish')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>
              {isPro ? '✨ Sugerir' : '🔒 Sugerir'}
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
              style={{
                background: atLimit ? '#e2e8f0' : '#16a34a',
                color: atLimit ? '#94a3b8' : '#fff',
                boxShadow: atLimit ? 'none' : '0 2px 8px rgba(22,163,74,.3)',
              }}>
              {atLimit ? '🔒 Nuevo plato' : '➕ Nuevo plato'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Dish cards ── */}
      <div className="space-y-3">
        {dishes.map(dish=>(
          <div key={dish.id} className="bg-white rounded-2xl p-4"
            style={{
              border: dish.example ? '1px solid #fde68a' : '1px solid #f1f5f9',
              background: dish.example ? '#fffbeb' : '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,.05)',
            }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{background:'#f0fdf4'}}>🍳</div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{dish.name}</h3>
                    {dish.example&&<span className="text-[10px] font-bold uppercase tracking-wide" style={{color:'#d97706'}}>ejemplo</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 ml-10">
                  {[...new Set(dish.ingredients)].map(iid=>{const ing=ingMap[iid];if(!ing)return null;return(
                    <span key={iid} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CAT_BG[ing.category]} ${CAT_TEXT[ing.category]}`}>{ing.name}</span>
                  );})}
                  {!dish.ingredients.length&&<span className="text-xs text-gray-300">Sin ingredientes</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={()=>openEdit(dish)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-sm"
                  style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>✏️</button>
                <button onClick={()=>setConfirm(dish.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-sm"
                  style={{background:'#fef2f2',border:'1px solid #fecaca'}}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
        {!dishes.length&&(
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🍳</div>
            <p className="font-semibold text-gray-400 text-sm">Aún no tienes platos</p>
            <p className="text-xs text-gray-300 mt-1">Añade tus recetas habituales</p>
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==='add'?'Nuevo plato':'Editar plato'} wide>
        <DishForm form={form} setForm={setForm} ingredients={ingredients} toggleIng={toggleIng} onSave={save}/>
      </Modal>
      <Confirm open={!!confirm} msg="¿Eliminar este plato?"
        onOk={()=>{setDishes(ds=>ds.filter(d=>d.id!==confirm));setConfirm(null);}}
        onCancel={()=>setConfirm(null)}/>
      <AutoDishModal open={autoModal} onClose={()=>setAutoModal(false)}
        ingredients={ingredients} dishes={dishes} setDishes={setDishes}
        isUltra={isUltra} onUpgrade={onUpgrade}/>
    </div>
  );
}


