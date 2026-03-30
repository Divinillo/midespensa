// @ts-nocheck
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Confirm } from '../../components/ui/Confirm';
import { uid, getDays, getFirstWD, dateKey, fmt2 } from '../../utils/helpers';
import { generateNutriPDF } from '../../utils/pdfReport';
import type { Ingredient, Dish, Plan, Ticket } from '../../data/types';
import { FREE_DISH_LIMIT, MONTH_NAMES, WEEK_DAYS, CAT_EMOJI } from '../../data/categories';
import { RECIPE_DB } from '../../data/recipes';

function DayPicker({year,month,plan,selected,setSelected,highlightHasFood=true}) {
  const days=getDays(year,month);
  const firstWD=getFirstWD(year,month);
  const isDragging=React.useRef(false);
  const dragAnchor=React.useRef(null);  // día donde empezó el drag
  const [dragOver,setDragOver]=React.useState(null); // día actual del drag

  // Rango visual durante drag
  function dragRange(over) {
    if(dragAnchor.current===null||over===null) return [];
    const lo=Math.min(dragAnchor.current,over), hi=Math.max(dragAnchor.current,over);
    return Array.from({length:hi-lo+1},(_,i)=>lo+i);
  }

  function commitDrag(endDay) {
    const range=dragRange(endDay);
    if(!range.length) return;
    setSelected(prev=>{
      const s=new Set(prev);
      const allIn=range.every(d=>s.has(d));
      if(allIn) range.forEach(d=>s.delete(d));
      else range.forEach(d=>s.add(d));
      return [...s];
    });
  }

  // ── Mouse handlers ──
  function onMouseDown(e,d){e.preventDefault();isDragging.current=true;dragAnchor.current=d;setDragOver(d);}
  function onMouseEnter(d){if(isDragging.current)setDragOver(d);}
  function onMouseUp(){if(isDragging.current){commitDrag(dragOver);isDragging.current=false;dragAnchor.current=null;setDragOver(null);}}

  // ── Touch handlers (el move se dispara sobre el elemento origen, usamos elementFromPoint) ──
  const containerRef=React.useRef();
  function dayFromPoint(x,y){
    const el=document.elementFromPoint(x,y);
    if(!el) return null;
    const cell=el.closest('[data-day]');
    return cell?parseInt(cell.dataset.day,10):null;
  }
  function onTouchStart(e,d){e.preventDefault();isDragging.current=true;dragAnchor.current=d;setDragOver(d);}
  function onTouchMove(e){
    e.preventDefault();
    const t=e.touches[0];
    const d=dayFromPoint(t.clientX,t.clientY);
    if(d!==null)setDragOver(d);
  }
  function onTouchEnd(e){
    e.preventDefault();
    const t=e.changedTouches[0];
    const d=dayFromPoint(t.clientX,t.clientY)||dragOver;
    if(isDragging.current&&d!==null)commitDrag(d);
    isDragging.current=false;dragAnchor.current=null;setDragOver(null);
  }

  const sel=new Set(selected);
  const dr=new Set(dragRange(dragOver));

  return (
    <div ref={containerRef} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{touchAction:'none',userSelect:'none'}}>
      {/* Cabecera días semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(w=><div key={w} className="text-center text-[10px] font-bold text-green-500 py-1">{w}</div>)}
      </div>
      {/* Celdas */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({length:firstWD}).map((_,i)=><div key={'e'+i}/>)}
        {Array.from({length:days}).map((_,i)=>{
          const d=i+1;
          const k=dateKey(year,month,d);
          const hasFood=highlightHasFood&&!!(plan[k]?.lunch||plan[k]?.dinner);
          const isSel=sel.has(d);
          const inDrag=dr.has(d)&&!isSel;
          return (
            <div key={d} data-day={d}
              onMouseDown={e=>onMouseDown(e,d)} onMouseEnter={()=>onMouseEnter(d)}
              onTouchStart={e=>onTouchStart(e,d)}
              className={`relative rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors
                ${isSel?'bg-green-500':inDrag?'bg-green-200':hasFood?'bg-green-50 border border-green-200':'bg-gray-50 hover:bg-gray-100'}`}
              style={{aspectRatio:'1',minHeight:'36px'}}>
              <span className={`text-xs font-bold leading-none ${isSel?'text-white':hasFood?'text-green-700':'text-gray-600'}`}>{d}</span>
              {hasFood&&!isSel&&<div className="w-1 h-1 rounded-full bg-green-400 mt-0.5"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   LIMPIAR DÍAS — Modal
═══════════════════════════════════════ */
function ClearDaysModal({open,onClose,year,month,plan,setPlan}) {
  const [selected,setSelected]=useState([]);
  const days=getDays(year,month);

  React.useEffect(()=>{if(open)setSelected([]);},[open]);

  const daysWithFood=Array.from({length:days},(_,i)=>i+1).filter(d=>{
    const k=dateKey(year,month,d); return !!(plan[k]?.lunch||plan[k]?.dinner);
  });

  function selectAll(){setSelected(Array.from({length:days},(_,i)=>i+1));}
  function selectWithFood(){setSelected(daysWithFood);}
  function clearAll(){setSelected([]);}

  function doClear(){
    if(!selected.length)return;
    setPlan(p=>{
      const n={...p};
      selected.forEach(d=>{const k=dateKey(year,month,d);delete n[k];});
      return n;
    });
    onClose();
  }

  const selCount=selected.length;
  const withFoodSel=selected.filter(d=>daysWithFood.includes(d)).length;

  return (
    <Modal open={open} onClose={onClose} title="🗑️ Limpiar días" wide>
      <div className="space-y-4">
        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2">
          <button onClick={selectWithFood} className="text-xs px-3 py-1.5 rounded-xl bg-green-50 text-green-700 font-semibold border border-green-200 hover:bg-green-100 transition-all">
            🍽️ Con comida ({daysWithFood.length})
          </button>
          <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 font-semibold border border-gray-200 hover:bg-gray-100 transition-all">
            Todos ({days})
          </button>
          <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 text-gray-400 font-semibold border border-gray-200 hover:bg-gray-100 transition-all">
            Limpiar selección
          </button>
        </div>
        {/* Instrucción */}
        <p className="text-xs text-gray-400">Toca un día o arrastra para seleccionar varios.</p>
        {/* Calendario picker */}
        <DayPicker year={year} month={month} plan={plan} selected={selected} setSelected={setSelected}/>
        {/* Botón acción */}
        <button onClick={doClear} disabled={selCount===0}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all
            ${selCount===0?'bg-gray-200 text-gray-400 cursor-not-allowed':'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm'}`}>
          {selCount===0?'Selecciona días para borrar':`🗑️ Borrar ${selCount} día${selCount!==1?'s':''} ${withFoodSel>0?`(${withFoodSel} con comida)`:''}`}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════
   MENÚ AUTOMÁTICO — Modal Premium
═══════════════════════════════════════ */
function AutoMenuModal({open,onClose,year,month,plan,setPlan,dishes,ingredients,setIngredients}) {
  const now=new Date();
  const [range,setRange]=useState('semana');
  const [customDays,setCustomDays]=useState([]);
  const [overwrite,setOverwrite]=useState(false);
  const [result,setResult]=useState(null);

  React.useEffect(()=>{ if(open){setResult(null);setCustomDays([]);} },[open]);

  const days=getDays(year,month);

  function getDaysArr() {
    if(range==='custom') return customDays.sort((a,b)=>a-b);
    if(range==='hoy') {
      const d=(now.getFullYear()===year&&now.getMonth()===month)?now.getDate():1;
      return [d];
    }
    if(range==='semana') {
      const refD=(now.getFullYear()===year&&now.getMonth()===month)?now.getDate():1;
      const dow=new Date(year,month,refD).getDay();
      const mon=refD-(dow===0?6:dow-1);
      const arr=[];
      for(let i=0;i<7;i++){const d=mon+i;if(d>=1&&d<=days)arr.push(d);}
      return arr;
    }
    return Array.from({length:days},(_,i)=>i+1);
  }

  function generate() {
    if(!dishes.length) return;
    const availIds=new Set(ingredients.filter(i=>i.available).map(i=>i.id));
    const ingMap=Object.fromEntries(ingredients.map(i=>[i.id,i]));

    // Obtener kcal de un plato (desde RECIPE_DB o del propio plato)
    const getKcal=dish=>{
      if(dish.kcal) return dish.kcal;
      const rec=RECIPE_DB.find(r=>r.name.toLowerCase()===dish.name.toLowerCase());
      return rec?rec.kcal:300;
    };

    // Puntuar platos: 1=todos disponibles, 0=ninguno
    const scored=dishes.map(dish=>{
      const total=dish.ingredients.length;
      if(total===0) return {dish,score:0.5,missing:[],kcal:getKcal(dish)};
      const avail=dish.ingredients.filter(id=>availIds.has(id)).length;
      const missing=dish.ingredients.filter(id=>!availIds.has(id));
      return {dish,score:avail/total,missing,kcal:getKcal(dish)};
    }).sort((a,b)=>b.score-a.score);

    // Mezclar aleatoriamente dentro de cada grupo de igual puntuación
    const shuffleGroup=arr=>{
      const out=[]; let i=0;
      while(i<arr.length){
        let j=i;
        while(j<arr.length&&arr[j].score===arr[i].score)j++;
        const group=arr.slice(i,j).sort(()=>Math.random()-0.5);
        out.push(...group); i=j;
      }
      return out;
    };
    const shuffled=shuffleGroup(scored);

    // Separar en comidas (más calóricas) y cenas (más ligeras)
    const lunchPool=[...shuffled].sort((a,b)=>b.score-a.score||(b.kcal-a.kcal));
    const dinnerPool=[...shuffled].sort((a,b)=>b.score-a.score||(a.kcal-b.kcal));

    const daysArr=getDaysArr();
    const newPlan={...plan};
    const missingMap={};
    let filled=0;

    // Ventana de los últimos 2 días: [[lunchId|null, dinnerId|null], ...]
    // Se usa para garantizar que un plato no se repite en días consecutivos
    // (mínimo 2 días de separación → puede volver al 3er día)
    const recentWindow: Array<[string|null, string|null]> = [];

    // Inicializar la ventana con los días anteriores al primero seleccionado (si existen en el plan)
    if(daysArr.length>0){
      const firstDay=daysArr[0];
      for(let d=Math.max(1,firstDay-2);d<firstDay;d++){
        const k=dateKey(year,month,d);
        const dp=newPlan[k]||{};
        recentWindow.push([dp.lunch||null, dp.dinner||null]);
      }
    }

    // Offsets de rotación independientes por pool
    const lunchOff={v:0}, dinnerOff={v:0};

    // Selecciona el mejor plato del pool que no esté en recentIds
    // Si todos son recientes, elige el primero del pool (fallback)
    function pickFrom(pool, recentIds, off){
      const n=pool.length;
      for(let attempt=0;attempt<n;attempt++){
        const s=pool[(off.v+attempt)%n];
        if(!recentIds.has(s.dish.id)){
          off.v=(off.v+attempt+1)%n;
          return s;
        }
      }
      // Fallback: todos recientes, devuelve el siguiente en rotación
      const s=pool[off.v%n];
      off.v=(off.v+1)%n;
      return s;
    }

    for(const day of daysArr){
      const k=dateKey(year,month,day);
      const ex=newPlan[k]||{};
      let dayLunchId=ex.lunch||null;
      let dayDinnerId=ex.dinner||null;

      // IDs usados en los últimos 2 días (cualquier franja)
      const recentIds=new Set(recentWindow.flatMap(([l,d])=>[l,d]).filter(Boolean));

      if(overwrite||!ex.lunch){
        const s=pickFrom(lunchPool, recentIds, lunchOff);
        newPlan[k]={...(newPlan[k]||{}),lunch:s.dish.id};
        dayLunchId=s.dish.id;
        s.missing.forEach(id=>{
          if(!missingMap[id])missingMap[id]={ing:ingMap[id],dishNames:[]};
          if(!missingMap[id].dishNames.includes(s.dish.name))missingMap[id].dishNames.push(s.dish.name);
        });
        filled++;
      }

      if(overwrite||!ex.dinner){
        // Excluir además el plato ya asignado como comida del mismo día
        const recentWithLunch=new Set([...recentIds, dayLunchId].filter(Boolean));
        const s=pickFrom(dinnerPool, recentWithLunch, dinnerOff);
        newPlan[k]={...(newPlan[k]||{}),dinner:s.dish.id};
        dayDinnerId=s.dish.id;
        s.missing.forEach(id=>{
          if(!missingMap[id])missingMap[id]={ing:ingMap[id],dishNames:[]};
          if(!missingMap[id].dishNames.includes(s.dish.name))missingMap[id].dishNames.push(s.dish.name);
        });
        filled++;
      }

      // Avanzar ventana (siempre registra lo que queda asignado en el día, sea nuevo o existente)
      const actualLunch=newPlan[k]?.lunch||null;
      const actualDinner=newPlan[k]?.dinner||null;
      recentWindow.push([actualLunch, actualDinner]);
      if(recentWindow.length>2) recentWindow.shift();
    }

    setPlan(newPlan);
    setResult({filled,daysCount:daysArr.length,missing:Object.values(missingMap)});
  }

  const handleClose=()=>{setResult(null);onClose();};
  const canGenerate=dishes.length>=2&&(range!=='custom'||customDays.length>0);

  return (
    <Modal open={open} onClose={handleClose} title="✨ Menú automático">
      {!result?(
        <div className="space-y-5">
          {/* Selector de rango */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">¿Para qué período?</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[['hoy','📅 Hoy','solo hoy'],['semana','🗓️ Semana','lun → dom'],['mes',`📆 Mes`,MONTH_NAMES[month]],['custom','🎯 Personalizado','elige días']].map(([r,label,sub])=>(
                <button key={r} type="button" onClick={()=>setRange(r)}
                  className={`py-2.5 px-1 rounded-xl border-2 text-center transition-all ${range===r?'border-green-500 bg-green-50':'border-gray-200 bg-white hover:border-green-300'}`}
                  style={{boxShadow: range===r?'0 3px 10px rgba(22,163,74,.15)':'0 2px 6px rgba(0,0,0,.07)'}}>
                  <div className={`text-sm font-bold ${range===r?'text-green-700':'text-gray-600'}`}>{label}</div>
                  <div className={`text-[10px] mt-0.5 ${range===r?'text-green-500':'text-gray-400'}`}>{sub}</div>
                </button>
              ))}
            </div>
            {range==='custom'&&(
              <div className="border border-green-100 rounded-2xl p-3 bg-green-50/40">
                <p className="text-xs text-gray-500 mb-2">Toca o arrastra para seleccionar días · <span className="font-semibold text-green-700">{customDays.length} días</span></p>
                <DayPicker year={year} month={month} plan={plan} selected={customDays} setSelected={setCustomDays}/>
              </div>
            )}
          </div>

          {/* Cómo funciona */}
          <div className="bg-green-50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-bold text-green-800 mb-1.5">¿Cómo funciona?</p>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold text-xs shrink-0">1.</span>
              <p className="text-xs text-green-700">Asigna primero los platos con <strong>todos los ingredientes disponibles</strong> en tu despensa.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold text-xs shrink-0">2.</span>
              <p className="text-xs text-green-700">Completa con los platos a los que les faltan <strong>menos ingredientes</strong>.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold text-xs shrink-0">3.</span>
              <p className="text-xs text-green-700">Te muestra la <strong>lista de la compra</strong> de ingredientes que necesitas.</p>
            </div>
          </div>

          {/* Opción sobrescribir */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={overwrite} onChange={e=>setOverwrite(e.target.checked)} className="w-4 h-4 rounded accent-green-600"/>
            <span className="text-sm text-gray-600">Sobrescribir días ya planificados</span>
          </label>

          {dishes.length===0&&(
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              ⚠️ No tienes platos guardados. Añade platos en la pestaña <strong>Platos</strong> primero.
            </p>
          )}
          {dishes.length===1&&(
            <div style={{borderRadius:12,padding:'12px 14px',background:'#fef3c7',border:'1px solid #fde68a',display:'flex',gap:10,alignItems:'flex-start'}}>
              <span style={{fontSize:'1.2rem',flexShrink:0}}>🍽️</span>
              <div>
                <div style={{fontSize:'0.8rem',fontWeight:700,color:'#92400e',marginBottom:3}}>Solo tienes 1 plato</div>
                <div style={{fontSize:'0.72rem',color:'#b45309',lineHeight:1.5}}>Con un único plato, comida y cena serían siempre lo mismo. Añade al menos otro plato en la pestaña <strong>Platos</strong> para tener variedad.</div>
              </div>
            </div>
          )}

          <button onClick={generate} disabled={!canGenerate}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all
              ${!canGenerate?'cursor-not-allowed':'active:scale-95'}`}
            style={{
              background: !canGenerate ? '#e5e7eb' : '#16a34a',
              color: !canGenerate ? '#6b7280' : '#fff',
              boxShadow: !canGenerate ? 'none' : '0 4px 14px rgba(22,163,74,.35)',
              border: !canGenerate ? '1px solid #d1d5db' : 'none',
            }}>
            {dishes.length===0?'Añade platos primero':dishes.length===1?'Añade al menos 2 platos':range==='custom'&&customDays.length===0?'Selecciona días en el calendario':'🚀 Generar menú'}
          </button>
        </div>
      ):(
        <div className="space-y-4">
          <div className="text-center py-1">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-gray-800 text-base">¡Menú generado!</p>
            <p className="text-sm text-gray-500 mt-0.5">{result.filled} comidas añadidas · {result.daysCount} días</p>
          </div>

          {result.missing.length===0?(
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-3xl mb-1.5">✅</p>
              <p className="font-semibold text-green-700 text-sm">¡Tienes todos los ingredientes!</p>
              <p className="text-xs text-green-600 mt-0.5">No necesitas comprar nada extra para este menú.</p>
            </div>
          ):(
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">🛒 Te faltan {result.missing.length} ingredientes</p>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                {result.missing.map(({ing,dishNames},idx)=>(
                  <div key={ing?.id||idx} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <span className="text-lg leading-none mt-0.5">{CAT_EMOJI[ing?.category]||'🥗'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 leading-tight">{ing?.name||'Ingrediente'}</p>
                      <p className="text-[10px] text-amber-500 leading-tight mt-0.5 truncate">Para: {dishNames.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
              {setIngredients&&(
                <button onClick={()=>{
                  const ids=new Set(result.missing.map(m=>m.ing?.id).filter(Boolean));
                  setIngredients(prev=>prev.map(i=>ids.has(i.id)?{...i,needed:true,available:false}:i));
                }}
                  className="mt-2.5 w-full rounded-xl py-2.5 text-sm font-semibold active:scale-95 transition-all"
                  style={{background:'#f59e0b',color:'#fff',boxShadow:'0 3px 10px rgba(245,158,11,.35)'}}>
                  🛒 Agregar a lista de la compra
                </button>
              )}
            </div>
          )}

          <button onClick={handleClose}
            className="w-full rounded-xl py-2.5 text-sm font-semibold"
            style={{background:'#16a34a',color:'#fff'}}>
            Perfecto, cerrar
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════
   PDF EXPORT — Informe Nutricional
═══════════════════════════════════════ */
function NutriReportModal({open,onClose,year,month,plan,dishes,tickets=[]}) {
  const [selected,setSelected]=useState([]);
  const [showReport,setShowReport]=useState(false);
  const [pdfLoading,setPdfLoading]=useState(false);

  React.useEffect(()=>{ if(open){setSelected([]);setShowReport(false);setPdfLoading(false);} },[open]);

  async function handleDownloadPDF(report){
    setPdfLoading(true);
    try{ await generateNutriPDF(report,year,month,tickets); }
    catch(e){ alert('Error al generar el PDF. Comprueba la conexión a internet.'); console.error(e); }
    finally{ setPdfLoading(false); }
  }

  const dishMap=useMemo(()=>Object.fromEntries(dishes.map(d=>[d.id,d])),[dishes]);
  const days=getDays(year,month);

  // Busca macros: primero en el plato guardado (si viene de AutoDishModal), luego en RECIPE_DB
  function getMacros(dish) {
    if(dish.kcal) return {kcal:dish.kcal,prot:dish.prot,carbs:dish.carbs,fat:dish.fat,sugar:dish.sugar||0};
    const rec=RECIPE_DB.find(r=>r.name.toLowerCase()===dish.name.toLowerCase());
    if(rec) return {kcal:rec.kcal,prot:rec.prot,carbs:rec.carbs,fat:rec.fat,sugar:rec.sugar||0};
    return null;
  }

  function buildReport() {
    const rows=selected.sort((a,b)=>a-b).map(d=>{
      const k=dateKey(year,month,d);
      const dp=plan[k];
      if(!dp) return null;
      const lunch=dp.lunch?dishMap[dp.lunch]:null;
      const dinner=dp.dinner?dishMap[dp.dinner]:null;
      const lMacros=lunch?getMacros(lunch):null;
      const dMacros=dinner?getMacros(dinner):null;
      const totKcal=(lMacros?.kcal||0)+(dMacros?.kcal||0);
      const totProt=(lMacros?.prot||0)+(dMacros?.prot||0);
      const totCarbs=(lMacros?.carbs||0)+(dMacros?.carbs||0);
      const totFat=(lMacros?.fat||0)+(dMacros?.fat||0);
      const totSugar=(lMacros?.sugar||0)+(dMacros?.sugar||0);
      return {day:d,lunch,dinner,lMacros,dMacros,totKcal,totProt,totCarbs,totFat,totSugar};
    }).filter(Boolean);

    // Totales
    const totals=rows.reduce((acc,r)=>({
      kcal:acc.kcal+r.totKcal, prot:acc.prot+r.totProt,
      carbs:acc.carbs+r.totCarbs, fat:acc.fat+r.totFat, sugar:acc.sugar+r.totSugar
    }),{kcal:0,prot:0,carbs:0,fat:0,sugar:0});
    const avg=rows.length>0?{
      kcal:Math.round(totals.kcal/rows.length),
      prot:Math.round(totals.prot/rows.length),
      carbs:Math.round(totals.carbs/rows.length),
      fat:Math.round(totals.fat/rows.length),
      sugar:Math.round(totals.sugar/rows.length),
    }:{kcal:0,prot:0,carbs:0,fat:0,sugar:0};

    return {rows,totals,avg};
  }

  const MacroBadge=({label,val,unit='g',color})=>(
    <div className={`flex flex-col items-center px-2 py-1 rounded-lg ${color}`}>
      <span className="text-[10px] font-semibold opacity-70">{label}</span>
      <span className="text-sm font-bold">{val}{unit}</span>
    </div>
  );

  const report=showReport?buildReport():null;

  const daysWithFood=Array.from({length:days},(_,i)=>i+1).filter(d=>{
    const k=dateKey(year,month,d); return !!(plan[k]?.lunch||plan[k]?.dinner);
  });

  return (
    <Modal open={open} onClose={onClose} title="📊 Informe nutricional" wide>
      {!showReport?(
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Selecciona los días para generar el informe con estimación de macronutrientes.</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            <button onClick={()=>setSelected(daysWithFood)} style={{fontSize:'0.75rem',padding:'6px 12px',borderRadius:12,background:'#f0fdf4',color:'#15803d',fontWeight:600,border:'1px solid #bbf7d0',cursor:'pointer'}}>🍽️ Con comida ({daysWithFood.length})</button>
            <button onClick={()=>setSelected(Array.from({length:days},(_,i)=>i+1))} style={{fontSize:'0.75rem',padding:'6px 12px',borderRadius:12,background:'#f8fafc',color:'#475569',fontWeight:600,border:'1px solid #e2e8f0',cursor:'pointer'}}>Todos</button>
            <button onClick={()=>setSelected([])} style={{fontSize:'0.75rem',padding:'6px 12px',borderRadius:12,background:'#f8fafc',color:'#94a3b8',fontWeight:600,border:'1px solid #e2e8f0',cursor:'pointer'}}>Limpiar</button>
          </div>
          <p style={{fontSize:'0.75rem',color:'#94a3b8'}}>Toca o arrastra para seleccionar días · <span style={{fontWeight:700,color:'#7c3aed'}}>{selected.length} días</span></p>
          <DayPicker year={year} month={month} plan={plan} selected={selected} setSelected={setSelected}/>
          <button onClick={()=>setShowReport(true)} disabled={selected.length===0}
            style={{width:'100%',padding:'10px',borderRadius:12,fontWeight:700,fontSize:'0.875rem',border:'none',cursor:selected.length===0?'not-allowed':'pointer',
              background:selected.length===0?'#e2e8f0':'#7c3aed',color:selected.length===0?'#94a3b8':'#fff',
              boxShadow:selected.length===0?'none':'0 2px 8px rgba(124,58,237,.3)'}}>
            {selected.length===0?'Selecciona días':'📊 Generar informe'}
          </button>
        </div>
      ):(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">Informe · {report.rows.length} días · {MONTH_NAMES[month]} {year}</p>
            <button onClick={()=>setShowReport(false)} className="text-xs text-gray-400 hover:text-gray-600">← Volver</button>
          </div>

          {/* Resumen total + media */}
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3">
            <p className="text-xs font-bold text-purple-700 mb-2">📈 Media diaria estimada</p>
            <div className="flex gap-2 justify-around">
              <MacroBadge label="Kcal" val={report.avg.kcal} unit="" color="bg-orange-100 text-orange-700"/>
              <MacroBadge label="Prot" val={report.avg.prot} color="bg-blue-100 text-blue-700"/>
              <MacroBadge label="HC" val={report.avg.carbs} color="bg-yellow-100 text-yellow-700"/>
              <MacroBadge label="Grasas" val={report.avg.fat} color="bg-red-100 text-red-600"/>
              <MacroBadge label="Azúcar" val={report.avg.sugar} color="bg-pink-100 text-pink-600"/>
            </div>
            <p className="text-[10px] text-purple-400 mt-2 text-center">Total: {report.totals.kcal} kcal · {report.totals.prot}g prot · {report.totals.carbs}g HC · {report.totals.fat}g grasas · {report.totals.sugar}g azúcar</p>
          </div>

          {/* Detalle por día */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-0.5">
            {report.rows.map(r=>(
              <div key={r.day} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-gray-700">{r.day} {MONTH_NAMES[month]}</p>
                  {r.totKcal>0&&<span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">🔥 {r.totKcal} kcal</span>}
                </div>
                {r.lunch&&<p className="text-[10px] text-gray-500 truncate">🍽 {r.lunch.name}{r.lMacros?` · ${r.lMacros.kcal}kcal`:''}</p>}
                {r.dinner&&<p className="text-[10px] text-gray-500 truncate">🌙 {r.dinner.name}{r.dMacros?` · ${r.dMacros.kcal}kcal`:''}</p>}
                {r.totProt>0&&(
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-semibold">P {r.totProt}g</span>
                    <span className="text-[9px] bg-yellow-50 text-yellow-600 px-1 py-0.5 rounded font-semibold">HC {r.totCarbs}g</span>
                    <span className="text-[9px] bg-red-50 text-red-500 px-1 py-0.5 rounded font-semibold">G {r.totFat}g</span>
                    {r.totSugar>0&&<span className="text-[9px] bg-pink-50 text-pink-500 px-1 py-0.5 rounded font-semibold">🍬 {r.totSugar}g</span>}
                  </div>
                )}
                {!r.totKcal&&<p className="text-[10px] text-gray-300 italic">Sin datos de macros para estos platos</p>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-300 text-center">* Estimaciones orientativas por ración. No sustituyen asesoramiento nutricional.</p>

          {/* Botones acción */}
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>handleDownloadPDF(report)} disabled={pdfLoading}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,borderRadius:12,padding:'10px',fontSize:'0.875rem',fontWeight:700,border:'none',
                cursor:pdfLoading?'not-allowed':'pointer',
                background:pdfLoading?'#ede9fe':'#7c3aed',
                color:pdfLoading?'#a78bfa':'#fff',
                boxShadow:pdfLoading?'none':'0 2px 12px rgba(109,40,217,0.35)'}}>
              {pdfLoading
                ? <><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⏳</span> Generando…</>
                : <><span>📄</span> Descargar PDF</>}
            </button>
            <button onClick={onClose}
              style={{flex:1,borderRadius:12,padding:'10px',fontSize:'0.875rem',fontWeight:600,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#475569',cursor:'pointer'}}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function PlanMensual({plan,setPlan,dishes,ingredients,setIngredients,tickets,isPro,isUltra,onUpgrade}) {
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [selDay,setSelDay]=useState(null);
  const [dayMeal,setDayMeal]=useState({lunch:'',dinner:''});
  const [autoModal,setAutoModal]=useState(false);
  const [clearModal,setClearModal]=useState(false);
  const [nutriModal,setNutriModal]=useState(false);
  const [recipeModal,setRecipeModal]=useState(null); // {name,ings}
  const days=getDays(year,month); const firstWD=getFirstWD(year,month);
  const dishMap=useMemo(()=>Object.fromEntries(dishes.map(d=>[d.id,d])),[dishes]);
  const ingMap=useMemo(()=>Object.fromEntries(ingredients.map(i=>[i.id,i])),[ingredients]);

  // Dishes used elsewhere this month (excluding current day being edited)
  const usedInMonth=useMemo(()=>{
    const counts={};
    Object.entries(plan).forEach(([k,dp])=>{
      if(!k.startsWith(`${year}-${fmt2(month+1)}`)) return;
      if(selDay&&k===dateKey(year,month,selDay)) return;
      [dp.lunch,dp.dinner].filter(Boolean).forEach(id=>{counts[id]=(counts[id]||0)+1;});
    });
    return counts;
  },[plan,year,month,selDay]);

  // How many dishes can be made with current ingredients
  const makeableDishes=useMemo(()=>dishes.filter(d=>
    d.ingredients.length===0||d.ingredients.some(iid=>ingMap[iid]?.available)
  ).length,[dishes,ingMap]);

  // Same-day duplicate guard
  const sameDayDup=!!(dayMeal.lunch&&dayMeal.lunch===dayMeal.dinner);

  // Repeat warning message
  const repeatWarning=useMemo(()=>{
    const repeated=[dayMeal.lunch,dayMeal.dinner].filter(Boolean).filter(id=>usedInMonth[id]>0);
    if(!repeated.length) return null;
    const names=repeated.map(id=>dishMap[id]?.name).filter(Boolean);
    return {names,fewDishes:makeableDishes<4};
  },[dayMeal,usedInMonth,dishMap,makeableDishes]);

  // Macros per 100g for a dish (from RECIPE_DB, scaled to 100g assuming 300g portion)
  const getMacros100=useCallback((dishId)=>{
    if(!dishId) return null;
    const dish=dishMap[dishId]; if(!dish) return null;
    const recipe=RECIPE_DB.find(r=>
      r.name.toLowerCase()===dish.name.toLowerCase()||
      dish.name.toLowerCase().includes(r.name.toLowerCase().split(' ')[0])
    );
    if(!recipe) return null;
    const factor=100/300; // scale from per-portion (~300g) to per 100g
    return {
      kcal:Math.round(recipe.kcal*factor),
      prot:Math.round(recipe.prot*factor*10)/10,
      carbs:Math.round(recipe.carbs*factor*10)/10,
      fat:Math.round(recipe.fat*factor*10)/10,
    };
  },[dishMap]);

  const openDay=d=>{
    const k=dateKey(year,month,d);
    setDayMeal(plan[k]||{lunch:'',dinner:''});
    setSelDay(d);
  };
  const saveDay=()=>{setPlan(p=>({...p,[dateKey(year,month,selDay)]:dayMeal}));setSelDay(null);};
  const clearDay=d=>{const k=dateKey(year,month,d);setPlan(p=>{const n={...p};delete n[k];return n;});};
  const prevM=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);};
  const nextM=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);};
  const planned=Object.keys(plan).filter(k=>k.startsWith(`${year}-${fmt2(month+1)}`)).length;

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className="mb-4">
        <h1 className="text-2xl font-black text-gray-900 leading-none" style={{letterSpacing:'-0.02em'}}>
          Plan mensual 🗓️
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {planned>0
            ? <><span className="font-bold text-green-600">{planned}</span> días planificados en {MONTH_NAMES[month]}</>
            : 'Toca un día para asignar un plato'}
        </p>
      </div>

      {/* ── Month nav ── */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevM}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-gray-600 text-xl font-bold"
          style={{background:'#fff',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>‹</button>
        <div className="text-center">
          <h2 className="text-lg font-black text-gray-900 leading-none">{MONTH_NAMES[month]} {year}</h2>
        </div>
        <button onClick={nextM}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-gray-600 text-xl font-bold"
          style={{background:'#fff',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,.05)'}}>›</button>
      </div>

      <div className="flex justify-end mb-2">
        <button onClick={()=>setClearModal(true)}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-1 rounded-xl hover:bg-red-50">
          🗑️ Limpiar días
        </button>
      </div>

      {/* ── Calendario full-bleed ── */}
      <div className="-mx-4 bg-white rounded-none overflow-hidden" style={{borderTop:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9'}}>
        {/* Cabecera días */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEK_DAYS.map(w=>(
            <div key={w} className="text-center py-2" style={{fontSize:'0.65rem',fontWeight:700,color:'#16a34a',letterSpacing:'.05em'}}>
              {w}
            </div>
          ))}
        </div>
        {/* Celdas */}
        <div className="grid grid-cols-7" style={{gap:'1px',background:'#e2e8f0'}}>
          {Array.from({length:firstWD}).map((_,i)=><div key={'e'+i} style={{background:'#f8fdf8'}}/>)}
          {Array.from({length:days}).map((_,i)=>{
            const d=i+1,k=dateKey(year,month,d),dp=plan[k];
            const isToday=year===now.getFullYear()&&month===now.getMonth()&&d===now.getDate();
            const hasFood=dp?.lunch||dp?.dinner;
            return (
              <div key={d} onClick={()=>openDay(d)}
                className="relative cursor-pointer group transition-colors"
                style={{
                  minHeight:82,
                  padding:'5px 5px 4px',
                  background: isToday ? '#f0fdf4' : '#fff',
                }}>
                {/* Today indicator */}
                {isToday&&<div className="absolute top-0 left-0 right-0 h-0.5 bg-green-400"/>}
                {/* Day number */}
                <div style={{
                  fontSize:'0.82rem',fontWeight:isToday?800:hasFood?700:400,
                  color:isToday?'#16a34a':hasFood?'#0f172a':'#cbd5e1',
                  lineHeight:1,marginBottom:5,
                }}>
                  {d}
                </div>
                {/* Lunch */}
                {dp?.lunch&&(
                  <div style={{fontSize:'0.6rem',lineHeight:1.35,background:'#fef3c7',color:'#92400e',borderRadius:5,padding:'3px 5px',marginBottom:3,fontWeight:600,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                    🍽 {dishMap[dp.lunch]?.name||'?'}
                  </div>
                )}
                {/* Dinner */}
                {dp?.dinner&&(
                  <div style={{fontSize:'0.6rem',lineHeight:1.35,background:'#dcfce7',color:'#14532d',borderRadius:5,padding:'3px 5px',fontWeight:600,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                    🌙 {dishMap[dp.dinner]?.name||'?'}
                  </div>
                )}
                {/* Clear btn on hover */}
                {hasFood&&(
                  <button onClick={e=>{e.stopPropagation();clearDay(d);}}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] items-center justify-center transition-all hidden group-hover:flex"
                    style={{background:'#f1f5f9',color:'#94a3b8'}}>
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="mt-4 flex gap-2">
        {isPro?(
          <button onClick={()=>setAutoModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm text-white"
            style={{background:'#16a34a',boxShadow:'0 2px 8px rgba(22,163,74,.3)'}}>
            ✨ Menú auto
          </button>
        ):(
          <button onClick={()=>onUpgrade('automenu')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm"
            style={{background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>
            🔒 Menú auto <span className="font-normal text-xs" style={{color:'#86efac'}}>Pro</span>
          </button>
        )}
        {isUltra?(
          <button onClick={()=>setNutriModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm"
            style={{background:'#7c3aed',color:'#fff',boxShadow:'0 2px 8px rgba(124,58,237,.25)'}}>
            📊 Nutrición
          </button>
        ):(
          <button onClick={()=>onUpgrade('ultra')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm"
            style={{background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe'}}>
            🔒 Nutrición <span className="font-normal text-xs" style={{color:'#c4b5fd'}}>Ultra</span>
          </button>
        )}
      </div>

      <AutoMenuModal open={autoModal} onClose={()=>setAutoModal(false)}
        year={year} month={month} plan={plan} setPlan={setPlan}
        dishes={dishes} ingredients={ingredients} setIngredients={setIngredients}/>
      <NutriReportModal open={nutriModal} onClose={()=>setNutriModal(false)}
        year={year} month={month} plan={plan} dishes={dishes} tickets={tickets}/>
      <ClearDaysModal open={clearModal} onClose={()=>setClearModal(false)}
        year={year} month={month} plan={plan} setPlan={setPlan}/>

      {/* ── Recipe modal (Ultra) ── */}
      {recipeModal && (()=>{
        const rd=RECIPE_DB.find(r=>r.name.toLowerCase()===recipeModal.name.toLowerCase());
        const ytUrl=`https://www.youtube.com/results?search_query=${encodeURIComponent('como preparar '+recipeModal.name)}`;
        return (
          <Modal open={!!recipeModal} onClose={()=>setRecipeModal(null)} title={`📖 ${recipeModal.name}`} wide>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* YouTube link */}
              <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:14,background:'#fef2f2',border:'1.5px solid #fecaca',textDecoration:'none',color:'#dc2626',fontWeight:700,fontSize:'0.85rem'}}>
                <span style={{fontSize:'1.4rem',flexShrink:0}}>▶️</span>
                <div>
                  <div style={{fontSize:'0.85rem',fontWeight:700}}>Ver en YouTube</div>
                  <div style={{fontSize:'0.72rem',fontWeight:400,color:'#f87171'}}>Tutoriales de "{recipeModal.name}"</div>
                </div>
                <span style={{marginLeft:'auto',fontSize:'0.75rem',opacity:.7}}>↗</span>
              </a>
              {rd?.steps?.length>0?(
                <div style={{background:'#f0fdf4',borderRadius:14,padding:14,border:'1px solid #bbf7d0'}}>
                  {(rd.tiempo||rd.dificultad)&&(
                    <div style={{display:'flex',gap:8,marginBottom:14}}>
                      {rd.tiempo&&<span style={{fontSize:'0.75rem',background:'#dcfce7',color:'#16a34a',padding:'4px 10px',borderRadius:20,fontWeight:700}}>⏱ {rd.tiempo}</span>}
                      {rd.dificultad&&<span style={{fontSize:'0.75rem',padding:'4px 10px',borderRadius:20,fontWeight:700,background:rd.dificultad==='Fácil'?'#dcfce7':rd.dificultad==='Media'?'#fef9c3':'#fee2e2',color:rd.dificultad==='Fácil'?'#16a34a':rd.dificultad==='Media'?'#ca8a04':'#dc2626'}}>{rd.dificultad==='Fácil'?'🟢':rd.dificultad==='Media'?'🟡':'🔴'} {rd.dificultad}</span>}
                    </div>
                  )}
                  {rd.steps.map((paso,i)=>(
                    <div key={i} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:'#16a34a',color:'#fff',fontSize:'0.7rem',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{i+1}</div>
                      <p style={{fontSize:'0.83rem',color:'#166534',lineHeight:1.5,margin:0}}>{paso}</p>
                    </div>
                  ))}
                  {rd.consejo&&(
                    <div style={{marginTop:12,padding:'10px 12px',background:'#fff',borderRadius:10,border:'1px solid #bbf7d0'}}>
                      <p style={{fontSize:'0.75rem',color:'#16a34a',fontWeight:700,margin:'0 0 3px'}}>💡 Consejo del chef</p>
                      <p style={{fontSize:'0.78rem',color:'#166534',margin:0,lineHeight:1.4}}>{rd.consejo}</p>
                    </div>
                  )}
                </div>
              ):(
                <div style={{background:'#f9fafb',borderRadius:12,padding:14,textAlign:'center',border:'1px solid #e5e7eb'}}>
                  <p style={{color:'#6b7280',fontSize:'0.82rem',margin:0}}>Ingredientes: {recipeModal.ings?.join(', ')||'sin datos'}</p>
                  <p style={{color:'#9ca3af',fontSize:'0.75rem',marginTop:6}}>Busca el vídeo en YouTube para ver la preparación</p>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* ── Day editor card overlay ── */}
      {!!selDay && (
        <div
          style={{position:'fixed',inset:0,zIndex:60,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
          onClick={e=>{if(e.target===e.currentTarget)setSelDay(null);}}
        >
          <div style={{background:'#fff',borderRadius:24,width:'100%',maxWidth:420,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 60px rgba(0,0,0,.22)'}}>

            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#15803d,#16a34a)',borderRadius:'24px 24px 0 0',padding:'18px 20px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{color:'#fff',fontWeight:900,fontSize:'1.1rem',letterSpacing:'-0.02em'}}>
                  📅 {selDay} de {MONTH_NAMES[month]}
                </div>
                <div style={{color:'rgba(255,255,255,.7)',fontSize:'0.7rem',marginTop:2}}>
                  Edita comida y cena de este día
                </div>
              </div>
              <button onClick={()=>setSelDay(null)}
                style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.25)',color:'#fff',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>
                ✕
              </button>
            </div>

            <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:16}}>

              {/* Current meals preview */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[['lunch','🍽️','Comida','#fef3c7','#d97706','#fffbeb'],['dinner','🌙','Cena','#dcfce7','#16a34a','#f0fdf4']].map(([k,icon,lbl,borderC,textC,bgC])=>{
                  const dish=dishMap[dayMeal[k]];
                  return (
                    <div key={k} style={{borderRadius:14,padding:'10px 12px',border:`1.5px solid ${borderC}`,background:bgC}}>
                      <div style={{fontSize:'0.65rem',fontWeight:700,color:textC,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{icon} {lbl}</div>
                      <div style={{fontSize:'0.78rem',fontWeight:600,color:dish?textC:'#cbd5e1',minHeight:32,display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
                        <span>{dish?dish.name:'Sin asignar'}</span>
                        {isUltra && dish && (
                          <button
                            onClick={()=>{
                              const recipeMatch=RECIPE_DB.find(r=>r.name.toLowerCase()===dish.name.toLowerCase());
                              const ingNames=recipeMatch?recipeMatch.ings:dish.ingredients||[];
                              setRecipeModal({name:dish.name,ings:ingNames});
                            }}
                            style={{flexShrink:0,width:28,height:28,borderRadius:8,background:'#f0fdf4',border:'1px solid #bbf7d0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem'}}
                            title="Ver preparación">📖</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Warnings */}
              {!sameDayDup && repeatWarning && (
                <div style={{borderRadius:12,padding:'10px 14px',background:'#fffbeb',border:'1px solid #fde68a',display:'flex',alignItems:'flex-start',gap:8}}>
                  <span style={{fontSize:'1rem',flexShrink:0}}>⚠️</span>
                  <div>
                    <div style={{fontSize:'0.75rem',color:'#d97706',fontWeight:700,marginBottom:2}}>
                      {repeatWarning.names.join(', ')} ya {repeatWarning.names.length===1?'aparece':'aparecen'} este mes
                    </div>
                    {repeatWarning.fewDishes && (
                      <div style={{fontSize:'0.7rem',color:'#92400e'}}>
                        Tienes pocos platos disponibles. Compra más ingredientes para tener más variedad 🛒
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selects + macros */}
              {[['lunch','🍽️ Comida'],['dinner','🌙 Cena']].map(([k,label])=>{
                const macros=(isPro||isUltra)?getMacros100(dayMeal[k]):null;
                return (
                  <div key={k}>
                    <label style={{display:'block',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'#94a3b8',marginBottom:6}}>{label}</label>
                    <select value={dayMeal[k]||''} onChange={e=>setDayMeal(m=>({...m,[k]:e.target.value}))}
                      style={{width:'100%',borderRadius:14,padding:'12px 14px',fontSize:'0.85rem',border:'1.5px solid #e2e8f0',background:'#f8fafc',outline:'none',appearance:'auto'}}>
                      <option value="">— Sin asignar —</option>
                      {dishes
                        .filter(d=> k==='lunch' ? d.id!==dayMeal.dinner : d.id!==dayMeal.lunch)
                        .map(d=>{
                          const isRepeat = usedInMonth[d.id]>0;
                          return <option key={d.id} value={d.id}>{isRepeat?'⚠️ ':''}{d.name}</option>;
                        })
                      }
                    </select>
                    {macros && (
                      <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                        {[['🔥',macros.kcal,'kcal'],['💪',macros.prot,'g prot'],['🍞',macros.carbs,'g carbs'],['🧈',macros.fat,'g grasa']].map(([ic,val,unit])=>(
                          <span key={unit} style={{fontSize:'0.64rem',fontWeight:700,padding:'2px 9px',borderRadius:10,background:'#f1f5f9',color:'#475569',border:'1px solid #e2e8f0'}}>
                            {ic} {val}{unit}
                          </span>
                        ))}
                        <span style={{fontSize:'0.6rem',color:'#cbd5e1',alignSelf:'center'}}>por 100g</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {dishes.length < 2 && (
                <p style={{fontSize:'0.72rem',color:'#94a3b8',textAlign:'center',marginTop:2}}>
                  💡 Añade al menos dos platos diferentes para poder asignar comida y cena.
                </p>
              )}

              {/* Action buttons */}
              <div style={{display:'flex',gap:10,paddingTop:4}}>
                <button onClick={saveDay} disabled={sameDayDup}
                  style={{flex:1,borderRadius:14,padding:'14px',fontSize:'0.9rem',fontWeight:800,color:'#fff',background:sameDayDup?'#d1d5db':'#16a34a',boxShadow:sameDayDup?'none':'0 4px 14px rgba(22,163,74,.35)',border:'none',cursor:sameDayDup?'not-allowed':'pointer',transition:'all .15s'}}>
                  💾 Guardar
                </button>
                <button onClick={()=>{clearDay(selDay);setSelDay(null);}}
                  style={{padding:'14px 18px',borderRadius:14,fontSize:'0.85rem',fontWeight:700,color:'#ef4444',background:'#fef2f2',border:'1.5px solid #fecaca',cursor:'pointer'}}>
                  🗑️ Limpiar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

