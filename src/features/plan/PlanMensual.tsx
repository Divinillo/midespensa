// @ts-nocheck
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Confirm } from '../../components/ui/Confirm';
import { uid, getDays, getFirstWD, dateKey, fmt2 } from '../../utils/helpers';
import { generateNutriPDF } from '../../utils/pdfReport';
import type { Ingredient, Dish, Plan, Ticket } from '../../data/types';
import { FREE_DISH_LIMIT, MONTH_NAMES, WEEK_DAYS, CAT_EMOJI } from '../../data/categories';

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
      return rec?rec.kcal:300; // 300 por defecto
    };

    // Puntuar platos: 1=todos disponibles, 0=ninguno
    let scored=dishes.map(dish=>{
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
    // Ordenar por kcal desc para comidas, asc para cenas, manteniendo prioridad de score
    const lunchPool=[...shuffled].sort((a,b)=>b.score-a.score||(b.kcal-a.kcal));
    const dinnerPool=[...shuffled].sort((a,b)=>b.score-a.score||(a.kcal-b.kcal));

    const nl=lunchPool.length, nd=dinnerPool.length;
    const daysArr=getDaysArr();
    const newPlan={...plan};
    const missingMap={};
    let lIdx=0, dIdx=0, filled=0;

    for(const day of daysArr){
      const k=dateKey(year,month,day);
      const ex=plan[k]||{};
      if(overwrite||!ex.lunch){
        const s=lunchPool[lIdx%nl]; lIdx++;
        newPlan[k]={...(newPlan[k]||{}),lunch:s.dish.id};
        s.missing.forEach(id=>{
          if(!missingMap[id])missingMap[id]={ing:ingMap[id],dishNames:[]};
          if(!missingMap[id].dishNames.includes(s.dish.name))missingMap[id].dishNames.push(s.dish.name);
        });
        filled++;
      }
      if(overwrite||!ex.dinner){
        const s=dinnerPool[dIdx%nd]; dIdx++;
        newPlan[k]={...(newPlan[k]||{}),dinner:s.dish.id};
        s.missing.forEach(id=>{
          if(!missingMap[id])missingMap[id]={ing:ingMap[id],dishNames:[]};
          if(!missingMap[id].dishNames.includes(s.dish.name))missingMap[id].dishNames.push(s.dish.name);
        });
        filled++;
      }
    }

    setPlan(newPlan);
    setResult({filled,daysCount:daysArr.length,missing:Object.values(missingMap)});
  }

  const handleClose=()=>{setResult(null);onClose();};
  const canGenerate=dishes.length>0&&(range!=='custom'||customDays.length>0);

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

          <button onClick={generate} disabled={!canGenerate}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all
              ${!canGenerate?'cursor-not-allowed':'active:scale-95'}`}
            style={{
              background: !canGenerate ? '#e5e7eb' : '#16a34a',
              color: !canGenerate ? '#6b7280' : '#fff',
              boxShadow: !canGenerate ? 'none' : '0 4px 14px rgba(22,163,74,.35)',
              border: !canGenerate ? '1px solid #d1d5db' : 'none',
            }}>
            {range==='custom'&&customDays.length===0?'Selecciona días en el calendario':'🚀 Generar menú'}
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
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>setSelected(daysWithFood)} className="text-xs px-3 py-1.5 rounded-xl bg-green-50 text-green-700 font-semibold border border-green-200">🍽️ Con comida ({daysWithFood.length})</button>
            <button onClick={()=>setSelected(Array.from({length:days},(_,i)=>i+1))} className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 font-semibold border border-gray-200">Todos</button>
            <button onClick={()=>setSelected([])} className="text-xs px-3 py-1.5 rounded-xl bg-gray-50 text-gray-400 font-semibold border border-gray-200">Limpiar</button>
          </div>
          <p className="text-xs text-gray-400">Toca o arrastra para seleccionar días · <span className="font-semibold text-purple-600">{selected.length} días</span></p>
          <DayPicker year={year} month={month} plan={plan} selected={selected} setSelected={setSelected}/>
          <button onClick={()=>setShowReport(true)} disabled={selected.length===0}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all
              ${selected.length===0?'bg-gray-200 text-gray-400 cursor-not-allowed':'bg-purple-600 text-white hover:bg-purple-700 active:scale-95 shadow-sm'}`}>
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
          <div className="flex gap-2">
            <button onClick={()=>handleDownloadPDF(report)} disabled={pdfLoading}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-95
                ${pdfLoading?'bg-purple-200 text-purple-400 cursor-not-allowed':'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'}`}
              style={pdfLoading?{}:{boxShadow:'0 2px 12px rgba(109,40,217,0.35)'}}>
              {pdfLoading
                ? <><span className="animate-spin inline-block">⏳</span> Generando…</>
                : <><span>📄</span> Descargar PDF</>}
            </button>
            <button onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-200 transition-all">
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
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm text-white"
            style={{background:'#7c3aed',boxShadow:'0 2px 8px rgba(124,58,237,.25)'}}>
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
                      <div style={{fontSize:'0.78rem',fontWeight:600,color:dish?textC:'#cbd5e1',minHeight:32,display:'flex',alignItems:'center'}}>
                        {dish?dish.name:'Sin asignar'}
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

/* ═══════════════════════════════════════
   BASE DE DATOS DE RECETAS (interna)
═══════════════════════════════════════ */
// kcal/prot(g)/carbs(g)/fat(g) por ración · dietas: omnivora|saludable|vegetariano|vegano|paleolitica|foodie
const RECIPE_DB=[
  // — CARNES —  (valores por ración, fuentes: FatSecret ES, Yazio, Dietas.net, BEDCA)
  {id:'rec01',name:'Pollo al ajillo',          cat:'carnes',   kcal:300,prot:38,carbs:2, fat:15,sugar:0, diets:['omnivora','saludable','paleolitica'],         ings:['pechuga de pollo','ajo','aceite de oliva','vino blanco','pimienta','sal']},
  {id:'rec02',name:'Arroz con pollo',           cat:'carnes',   kcal:500,prot:28,carbs:45,fat:20,sugar:3, diets:['omnivora'],                                   ings:['arroz','pechuga de pollo','cebolla','tomate','ajo','pimiento','aceite de oliva']},
  {id:'rec03',name:'Pasta a la boloñesa',       cat:'pasta',    kcal:550,prot:35,carbs:55,fat:18,sugar:4, diets:['omnivora'],                                   ings:['espaguetis','carne picada','tomate triturado','cebolla','ajo','aceite de oliva']},
  {id:'rec04',name:'Albóndigas en salsa',       cat:'carnes',   kcal:310,prot:30,carbs:10,fat:16,sugar:2, diets:['omnivora','foodie'],                          ings:['carne picada','huevos','ajo','cebolla','tomate triturado','aceite de oliva','harina']},
  {id:'rec05',name:'Pollo asado al horno',      cat:'carnes',   kcal:380,prot:32,carbs:22,fat:18,sugar:1, diets:['omnivora','saludable','paleolitica','foodie'], ings:['pollo entero','ajo','limón','aceite de oliva','pimienta','sal','patata']},
  {id:'rec06',name:'Costillas a la barbacoa',   cat:'carnes',   kcal:580,prot:48,carbs:18,fat:30,sugar:8, diets:['omnivora','paleolitica'],                     ings:['costillas de cerdo','ajo','aceite de oliva','pimienta','sal']},
  {id:'rec07',name:'Lomo de cerdo al horno',    cat:'carnes',   kcal:350,prot:40,carbs:5, fat:18,sugar:1, diets:['omnivora','saludable','paleolitica'],          ings:['lomo de cerdo','ajo','aceite de oliva','pimienta','sal','limón']},
  {id:'rec08',name:'Solomillo al whisky',       cat:'carnes',   kcal:420,prot:45,carbs:8, fat:20,sugar:2, diets:['omnivora','paleolitica','foodie'],             ings:['solomillo','ajo','aceite de oliva','pimienta','sal']},
  {id:'rec09',name:'Hamburguesa casera',        cat:'carnes',   kcal:430,prot:32,carbs:28,fat:23,sugar:3, diets:['omnivora'],                                   ings:['hamburguesa de ternera','cebolla','ajo','aceite de oliva','pan de molde']},
  {id:'rec10',name:'Muslos de pollo al horno',  cat:'carnes',   kcal:380,prot:28,carbs:12,fat:25,sugar:1, diets:['omnivora','saludable'],                       ings:['muslos de pollo','ajo','limón','aceite de oliva','pimienta','sal','patata']},
  {id:'rec11',name:'Carne picada con tomate',   cat:'carnes',   kcal:280,prot:24,carbs:15,fat:14,sugar:8, diets:['omnivora'],                                   ings:['carne picada','tomate triturado','cebolla','ajo','aceite de oliva','pimiento']},
  {id:'rec12',name:'Pollo con champiñones',     cat:'carnes',   kcal:520,prot:48,carbs:8, fat:30,sugar:2, diets:['omnivora','saludable','foodie'],               ings:['pechuga de pollo','cebolla','ajo','aceite de oliva','nata']},
  {id:'rec13',name:'Pavo al horno',             cat:'carnes',   kcal:320,prot:40,carbs:5, fat:16,sugar:1, diets:['omnivora','saludable','paleolitica'],          ings:['pavo','ajo','aceite de oliva','pimienta','sal','limón','mantequilla']},
  {id:'rec14',name:'Chorizo con patatas',       cat:'carnes',   kcal:490,prot:18,carbs:30,fat:32,sugar:2, diets:['omnivora'],                                   ings:['chorizo','patata','cebolla','aceite de oliva','sal']},
  // — PESCADO —
  {id:'rec15',name:'Salmón a la plancha',       cat:'pescado',  kcal:380,prot:38,carbs:2, fat:22,sugar:0, diets:['omnivora','saludable','paleolitica','foodie'], ings:['salmón','limón','aceite de oliva','sal']},
  {id:'rec16',name:'Merluza al vapor',          cat:'pescado',  kcal:180,prot:28,carbs:6, fat:5, sugar:1, diets:['omnivora','saludable','paleolitica'],          ings:['merluza','limón','aceite de oliva','ajo','sal']},
  {id:'rec17',name:'Bacalao al pil-pil',        cat:'pescado',  kcal:620,prot:60,carbs:3, fat:38,sugar:0, diets:['omnivora','saludable','paleolitica','foodie'], ings:['bacalao','ajo','aceite de oliva','sal']},
  {id:'rec18',name:'Gambas al ajillo',          cat:'pescado',  kcal:240,prot:20,carbs:4, fat:16,sugar:0, diets:['omnivora','saludable','paleolitica','foodie'], ings:['gambas','ajo','aceite de oliva','pimienta','sal']},
  {id:'rec19',name:'Atún con tomate',           cat:'pescado',  kcal:310,prot:35,carbs:18,fat:12,sugar:8, diets:['omnivora','saludable'],                       ings:['atún en lata','tomate triturado','cebolla','aceite de oliva','sal']},
  {id:'rec20',name:'Salmón al horno con limón', cat:'pescado',  kcal:380,prot:40,carbs:4, fat:21,sugar:1, diets:['omnivora','saludable','paleolitica'],          ings:['salmón','limón','ajo','aceite de oliva','sal']},
  {id:'rec21',name:'Merluza en salsa verde',    cat:'pescado',  kcal:280,prot:28,carbs:5, fat:15,sugar:1, diets:['omnivora','saludable','foodie'],               ings:['merluza','ajo','aceite de oliva','harina','sal']},
  {id:'rec22',name:'Calamares a la romana',     cat:'pescado',  kcal:340,prot:20,carbs:18,fat:20,sugar:1, diets:['omnivora','foodie'],                          ings:['calamares','harina','huevos','aceite de oliva','sal','limón']},
  {id:'rec23',name:'Mejillones al vapor',       cat:'pescado',  kcal:180,prot:28,carbs:8, fat:4, sugar:1, diets:['omnivora','saludable','paleolitica'],          ings:['mejillones','limón','sal']},
  // — VEGETARIANO / VERDURAS —
  {id:'rec24',name:'Tortilla de patatas',       cat:'huevos',   kcal:250,prot:10,carbs:18,fat:14,sugar:1, diets:['vegetariano','omnivora'],                     ings:['huevos','patata','cebolla','aceite de oliva','sal']},
  {id:'rec25',name:'Revuelto de espinacas',     cat:'huevos',   kcal:280,prot:18,carbs:6, fat:20,sugar:1, diets:['vegetariano','saludable','omnivora'],          ings:['huevos','espinacas','ajo','aceite de oliva','sal']},
  {id:'rec26',name:'Pisto manchego',            cat:'verduras', kcal:160,prot:6, carbs:18,fat:8, sugar:8, diets:['vegano','vegetariano','saludable','omnivora'], ings:['tomate','pimiento','calabacín','cebolla','ajo','aceite de oliva','sal']},
  {id:'rec27',name:'Crema de calabacín',        cat:'verduras', kcal:180,prot:8, carbs:12,fat:11,sugar:6, diets:['vegetariano','saludable'],                    ings:['calabacín','cebolla','ajo','aceite de oliva','nata','sal']},
  {id:'rec28',name:'Ensalada caprese',          cat:'verduras', kcal:200,prot:12,carbs:8, fat:14,sugar:4, diets:['vegetariano','saludable','foodie'],            ings:['tomate','queso','aceite de oliva','sal']},
  {id:'rec29',name:'Gazpacho andaluz',          cat:'verduras', kcal:180,prot:3, carbs:12,fat:13,sugar:7, diets:['vegano','vegetariano','saludable','paleolitica'],ings:['tomate','pimiento','pepino','ajo','aceite de oliva','vinagre','sal']},
  {id:'rec30',name:'Patatas bravas',            cat:'verduras', kcal:270,prot:4, carbs:25,fat:17,sugar:2, diets:['vegano','vegetariano','omnivora'],             ings:['patata','aceite de oliva','sal','pimentón']},
  {id:'rec31',name:'Espinacas con garbanzos',   cat:'legumbres',kcal:207,prot:8, carbs:19,fat:10,sugar:2, diets:['vegano','vegetariano','saludable'],            ings:['espinacas','garbanzos','ajo','aceite de oliva','tomate triturado','pimentón']},
  {id:'rec32',name:'Berenjena al horno',        cat:'verduras', kcal:175,prot:3, carbs:14,fat:10,sugar:6, diets:['vegano','vegetariano','saludable'],            ings:['berenjena','ajo','aceite de oliva','sal','tomate']},
  {id:'rec33',name:'Ensalada de lechuga',       cat:'verduras', kcal:120,prot:2, carbs:8, fat:8, sugar:3, diets:['vegano','vegetariano','saludable','paleolitica'],ings:['lechuga','tomate','aceite de oliva','vinagre','sal']},
  {id:'rec34',name:'Sofrito de verduras',       cat:'verduras', kcal:160,prot:3, carbs:16,fat:9, sugar:8, diets:['vegano','vegetariano'],                       ings:['cebolla','ajo','tomate','pimiento','aceite de oliva','sal']},
  {id:'rec35',name:'Brócoli al vapor',          cat:'verduras', kcal:130,prot:5, carbs:8, fat:9, sugar:2, diets:['vegano','vegetariano','saludable','paleolitica'],ings:['brócoli','ajo','aceite de oliva','sal','limón']},
  // — LEGUMBRES —
  {id:'rec36',name:'Lentejas estofadas',        cat:'legumbres',kcal:252,prot:12,carbs:29,fat:8, sugar:1, diets:['vegano','vegetariano','saludable'],            ings:['lentejas','zanahoria','cebolla','ajo','tomate triturado','patata','aceite de oliva']},
  {id:'rec37',name:'Potaje de garbanzos',       cat:'legumbres',kcal:452,prot:18,carbs:68,fat:15,sugar:4, diets:['vegano','vegetariano','saludable'],            ings:['garbanzos','espinacas','tomate triturado','cebolla','ajo','aceite de oliva']},
  {id:'rec38',name:'Alubias con chorizo',       cat:'legumbres',kcal:310,prot:16,carbs:21,fat:18,sugar:1, diets:['omnivora'],                                   ings:['alubias','chorizo','cebolla','ajo','aceite de oliva','sal']},
  {id:'rec39',name:'Judías verdes rehogadas',   cat:'legumbres',kcal:140,prot:4, carbs:10,fat:9, sugar:3, diets:['vegano','vegetariano','saludable','paleolitica'],ings:['judías','ajo','aceite de oliva','sal']},
  {id:'rec40',name:'Hummus casero',             cat:'legumbres',kcal:229,prot:7, carbs:14,fat:16,sugar:2, diets:['vegano','vegetariano','saludable'],            ings:['garbanzos','ajo','aceite de oliva','limón','sal']},
  // — ARROZ / PASTA —
  {id:'rec41',name:'Arroz a la cubana',         cat:'arroz',    kcal:645,prot:15,carbs:70,fat:30,sugar:4, diets:['vegetariano','omnivora'],                     ings:['arroz','huevos','tomate triturado','aceite de oliva','sal']},
  {id:'rec42',name:'Macarrones con queso',      cat:'pasta',    kcal:377,prot:15,carbs:53,fat:12,sugar:1, diets:['vegetariano'],                                ings:['macarrones','queso','mantequilla','sal']},
  {id:'rec43',name:'Espaguetis aglio e olio',   cat:'pasta',    kcal:480,prot:14,carbs:70,fat:16,sugar:2, diets:['vegano','vegetariano'],                       ings:['espaguetis','ajo','aceite de oliva','sal']},
  {id:'rec44',name:'Arroz tres delicias',       cat:'arroz',    kcal:380,prot:12,carbs:50,fat:14,sugar:2, diets:['omnivora'],                                   ings:['arroz','huevos','zanahoria','aceite de oliva','sal']},
  {id:'rec45',name:'Pasta con atún',            cat:'pasta',    kcal:411,prot:24,carbs:59,fat:9, sugar:1, diets:['omnivora','saludable'],                       ings:['pasta','atún en lata','tomate triturado','ajo','aceite de oliva']},
  {id:'rec46',name:'Fideos a la cazuela',       cat:'pasta',    kcal:380,prot:12,carbs:52,fat:12,sugar:2, diets:['vegano','vegetariano'],                       ings:['fideos','tomate triturado','cebolla','ajo','aceite de oliva','sal']},
  {id:'rec47',name:'Arroz con leche',           cat:'postres',  kcal:369,prot:8, carbs:63,fat:9, sugar:28,diets:['vegetariano'],                                ings:['arroz','leche','azúcar','canela','sal']},
  // — HUEVOS —
  {id:'rec48',name:'Huevos fritos con patatas', cat:'huevos',   kcal:515,prot:18,carbs:40,fat:28,sugar:1, diets:['vegetariano','omnivora'],                     ings:['huevos','patata','aceite de oliva','sal']},
  {id:'rec49',name:'Tortilla de espinacas',     cat:'huevos',   kcal:223,prot:16,carbs:7, fat:15,sugar:1, diets:['vegetariano','saludable'],                    ings:['huevos','espinacas','ajo','aceite de oliva','sal']},
  {id:'rec50',name:'Revuelto con bacon',        cat:'huevos',   kcal:241,prot:17,carbs:1, fat:19,sugar:0, diets:['omnivora'],                                   ings:['huevos','bacon','aceite de oliva','sal']},
  {id:'rec51',name:'Quiche de verduras',        cat:'huevos',   kcal:360,prot:12,carbs:24,fat:24,sugar:2, diets:['vegetariano','foodie'],                       ings:['huevos','nata','queso','cebolla','pimiento','aceite de oliva']},
  {id:'rec52',name:'Frittata de patata',        cat:'huevos',   kcal:300,prot:14,carbs:22,fat:18,sugar:1, diets:['vegetariano'],                                ings:['huevos','patata','cebolla','aceite de oliva','sal']},
  // — SOPAS —
  {id:'rec53',name:'Sopa de ajo',               cat:'sopas',    kcal:260,prot:9, carbs:10,fat:21,sugar:1, diets:['vegetariano','omnivora'],                     ings:['ajo','pan','huevos','aceite de oliva','pimentón','sal']},
  {id:'rec54',name:'Crema de tomate',           cat:'sopas',    kcal:190,prot:4, carbs:18,fat:12,sugar:6, diets:['vegetariano','saludable'],                    ings:['tomate','cebolla','ajo','aceite de oliva','nata','sal']},
  {id:'rec55',name:'Sopa de fideos',            cat:'sopas',    kcal:261,prot:10,carbs:42,fat:6, sugar:1, diets:['vegano','vegetariano'],                       ings:['fideos','zanahoria','cebolla','aceite de oliva','sal']},
  {id:'rec56',name:'Caldo de verduras',         cat:'sopas',    kcal:90, prot:2, carbs:12,fat:4, sugar:4, diets:['vegano','vegetariano','saludable','paleolitica'],ings:['zanahoria','cebolla','ajo','patata','aceite de oliva','sal']},
  {id:'rec57',name:'Puré de patata',            cat:'sopas',    kcal:215,prot:4, carbs:35,fat:7, sugar:1, diets:['vegetariano'],                                ings:['patata','mantequilla','leche','sal']},
  // — ESPECIALES —
  {id:'rec58',name:'Pizza casera',              cat:'especial', kcal:500,prot:18,carbs:60,fat:20,sugar:2, diets:['vegetariano','foodie'],                       ings:['harina','tomate triturado','queso','aceite de oliva','sal']},
  {id:'rec59',name:'Croquetas de jamón',        cat:'especial', kcal:420,prot:14,carbs:34,fat:24,sugar:1, diets:['omnivora','foodie'],                          ings:['jamón york','leche','harina','mantequilla','huevos','aceite de oliva']},
  {id:'rec60',name:'Empanada de atún',          cat:'especial', kcal:350,prot:14,carbs:38,fat:16,sugar:2, diets:['omnivora','foodie'],                          ings:['harina','atún en lata','tomate triturado','cebolla','aceite de oliva','huevos']},

  // ══ VEGANO — nuevas recetas para completar el set ══
  // Sin carne, pescado, lácteos ni huevos · fuentes: FatSecret ES, Yazio, Dietas.net, Vitonica
  {id:'rec61',name:'Dal de lentejas rojas',        cat:'legumbres',kcal:280,prot:14,carbs:38,fat:7, sugar:4, diets:['vegano','vegetariano','saludable'],            ings:['lentejas rojas','leche de coco','tomate triturado','cebolla','ajo','curry','aceite de oliva']},
  {id:'rec62',name:'Curry de garbanzos y espinacas',cat:'legumbres',kcal:320,prot:14,carbs:42,fat:12,sugar:5, diets:['vegano','vegetariano','saludable'],          ings:['garbanzos','espinacas','leche de coco','tomate triturado','cebolla','ajo','curry']},
  {id:'rec63',name:'Falafel casero',               cat:'especial', kcal:340,prot:12,carbs:36,fat:16,sugar:2, diets:['vegano','vegetariano','foodie'],               ings:['garbanzos','cebolla','ajo','perejil','comino','harina de garbanzo','aceite de oliva']},
  {id:'rec64',name:'Tabulé de bulgur',             cat:'verduras', kcal:180,prot:5, carbs:28,fat:7, sugar:2, diets:['vegano','vegetariano','saludable'],            ings:['bulgur','tomate','pepino','perejil','menta','limón','aceite de oliva']},
  {id:'rec65',name:'Paella de verduras',           cat:'arroz',    kcal:380,prot:9, carbs:68,fat:8, sugar:4, diets:['vegano','vegetariano'],                       ings:['arroz','pimiento','tomate','judías verdes','cebolla','ajo','aceite de oliva','pimentón']},
  {id:'rec66',name:'Sopa minestrone vegana',       cat:'sopas',    kcal:160,prot:7, carbs:22,fat:5, sugar:4, diets:['vegano','vegetariano','saludable'],            ings:['tomate triturado','zanahoria','calabacín','apio','pasta','cebolla','aceite de oliva']},
  {id:'rec67',name:'Tofu salteado con verduras',   cat:'verduras', kcal:230,prot:16,carbs:14,fat:12,sugar:4, diets:['vegano','vegetariano','saludable'],            ings:['tofu','pimiento','zanahoria','cebolla','ajo','salsa soja','aceite de sésamo']},
  {id:'rec68',name:'Pasta al pesto vegano',        cat:'pasta',    kcal:460,prot:14,carbs:62,fat:18,sugar:2, diets:['vegano','vegetariano'],                       ings:['pasta','albahaca','ajo','piñones','aceite de oliva','levadura nutricional','sal']},
  {id:'rec69',name:'Bowl de quinoa con aguacate',  cat:'verduras', kcal:380,prot:14,carbs:42,fat:16,sugar:2, diets:['vegano','vegetariano','saludable'],            ings:['quinoa','aguacate','tomate cherry','cebolla roja','limón','aceite de oliva','germinados']},
  {id:'rec70',name:'Crema de zanahoria y jengibre',cat:'sopas',    kcal:150,prot:3, carbs:20,fat:7, sugar:8, diets:['vegano','vegetariano','saludable'],            ings:['zanahoria','jengibre','cebolla','ajo','aceite de oliva','caldo vegetal','sal']},

  // ══ PALEOLÍTICA — nuevas recetas para completar el set ══
  // Sin cereales, legumbres ni lácteos · fuentes: FatSecret ES, Vitonica, Dietas.net
  {id:'rec71',name:'Dorada al horno a la sal',     cat:'pescado',  kcal:275,prot:38,carbs:0, fat:14,sugar:0, diets:['omnivora','saludable','paleolitica','foodie'], ings:['dorada','sal gruesa','aceite de oliva','limón','tomillo','ajo']},
  {id:'rec72',name:'Lubina al horno con limón',    cat:'pescado',  kcal:220,prot:32,carbs:2, fat:10,sugar:0, diets:['omnivora','saludable','paleolitica','foodie'], ings:['lubina','limón','aceite de oliva','ajo','romero','sal','pimienta']},
  {id:'rec73',name:'Ensalada de pollo y aguacate', cat:'verduras', kcal:380,prot:30,carbs:8, fat:24,sugar:2, diets:['omnivora','saludable','paleolitica'],          ings:['pechuga de pollo','aguacate','tomate cherry','lechuga','limón','aceite de oliva','sal']},
  {id:'rec74',name:'Sepia a la plancha',           cat:'pescado',  kcal:160,prot:26,carbs:2, fat:5, sugar:0, diets:['omnivora','saludable','paleolitica'],          ings:['sepia','ajo','perejil','aceite de oliva','limón','sal','pimienta']},
  {id:'rec75',name:'Huevos revueltos con setas',   cat:'huevos',   kcal:280,prot:18,carbs:4, fat:21,sugar:2, diets:['vegetariano','saludable','paleolitica'],       ings:['huevos','setas','ajo','aceite de oliva','sal','pimienta','perejil']},
  {id:'rec76',name:'Codornices asadas',            cat:'carnes',   kcal:280,prot:34,carbs:0, fat:16,sugar:0, diets:['omnivora','paleolitica','foodie'],             ings:['codornices','ajo','aceite de oliva','romero','tomillo','sal','pimienta']},
  {id:'rec77',name:'Crema de brócoli sin lácteos', cat:'sopas',    kcal:120,prot:5, carbs:10,fat:7, sugar:3, diets:['vegano','vegetariano','saludable','paleolitica'],ings:['brócoli','cebolla','ajo','aceite de oliva','caldo vegetal','sal','pimienta']},
  {id:'rec78',name:'Brochetas de pollo y pimiento',cat:'carnes',   kcal:300,prot:34,carbs:6, fat:14,sugar:4, diets:['omnivora','saludable','paleolitica'],          ings:['pechuga de pollo','pimiento rojo','pimiento verde','cebolla','aceite de oliva','limón','ajo']},

  // ══ FOODIE — nuevas recetas elaboradas y de restaurante ══
  // Fuentes: Directo al Paladar, FatSecret ES, Consumer.es, Myfitnesspal ES
  {id:'rec79',name:'Risotto de setas y parmesano', cat:'arroz',    kcal:393,prot:14,carbs:43,fat:16,sugar:1, diets:['vegetariano','foodie'],                        ings:['arroz arborio','setas','queso parmesano','mantequilla','cebolla','vino blanco','caldo vegetal']},
  {id:'rec80',name:'Carrilleras al vino tinto',    cat:'carnes',   kcal:385,prot:38,carbs:8, fat:22,sugar:2, diets:['omnivora','foodie'],                          ings:['carrilleras de cerdo','vino tinto','cebolla','zanahoria','ajo','tomillo','caldo carne']},
  {id:'rec81',name:'Pulpo a la gallega',           cat:'pescado',  kcal:164,prot:18,carbs:8, fat:9, sugar:0, diets:['omnivora','saludable','foodie'],              ings:['pulpo','aceite de oliva','pimentón','sal gruesa','patata','cebolla','ajo']},
  {id:'rec82',name:'Vieiras gratinadas',           cat:'pescado',  kcal:234,prot:9, carbs:15,fat:15,sugar:1, diets:['omnivora','foodie'],                          ings:['vieiras','pan rallado','ajo','perejil','aceite de oliva','mantequilla','limón']},
  {id:'rec83',name:'Magret de pato con naranja',   cat:'carnes',   kcal:420,prot:35,carbs:12,fat:28,sugar:8, diets:['omnivora','foodie'],                          ings:['magret de pato','naranja','vino blanco','mantequilla','sal','pimienta','miel']},
  {id:'rec84',name:'Tártaro de atún fresco',       cat:'pescado',  kcal:253,prot:25,carbs:7, fat:14,sugar:1, diets:['omnivora','saludable','paleolitica','foodie'],ings:['atún rojo fresco','aguacate','cebolleta','alcaparras','aceite de oliva','limón','sal']},
  {id:'rec85',name:'Rape al horno con hierbas',    cat:'pescado',  kcal:180,prot:28,carbs:2, fat:6, sugar:0, diets:['omnivora','saludable','paleolitica','foodie'],ings:['rape','limón','aceite de oliva','romero','tomillo','ajo','sal']},
  {id:'rec86',name:'Langostinos a la plancha',     cat:'pescado',  kcal:155,prot:28,carbs:1, fat:5, sugar:0, diets:['omnivora','saludable','paleolitica','foodie'],ings:['langostinos','aceite de oliva','limón','sal','pimienta','ajo','perejil']},
  {id:'rec87',name:'Tataki de salmón',             cat:'pescado',  kcal:290,prot:32,carbs:2, fat:16,sugar:1, diets:['omnivora','saludable','foodie'],              ings:['salmón fresco','salsa soja','sésamo','jengibre','aceite de sésamo','limón','cebolleta']},
  {id:'rec88',name:'Steak tartare de ternera',     cat:'carnes',   kcal:210,prot:18,carbs:1, fat:15,sugar:0, diets:['omnivora','paleolitica','foodie'],            ings:['ternera molida fresca','yema de huevo','alcaparras','mostaza','cebolla','aceite de oliva','sal']},
  {id:'rec89',name:'Ravioli de ricotta y espinaca',cat:'pasta',    kcal:300,prot:12,carbs:38,fat:10,sugar:1, diets:['vegetariano','foodie'],                       ings:['pasta fresca','ricotta','espinaca','queso parmesano','nuez moscada','mantequilla','sal']},
  {id:'rec90',name:'Ensalada niçoise',             cat:'verduras', kcal:382,prot:24,carbs:16,fat:26,sugar:2, diets:['omnivora','saludable','foodie'],              ings:['atún fresco','judía verde','huevo cocido','tomate','patata','aceituna negra','anchoas']},
  {id:'rec91',name:'Poke bowl de salmón',          cat:'pescado',  kcal:511,prot:28,carbs:52,fat:19,sugar:3, diets:['omnivora','saludable'],                       ings:['salmón fresco','arroz sushi','aguacate','pepino','alga wakame','sésamo','salsa soja']},
  {id:'rec92',name:'Estofado de ternera',          cat:'carnes',   kcal:387,prot:21,carbs:22,fat:24,sugar:1, diets:['omnivora','foodie'],                          ings:['ternera para guisar','patata','zanahoria','cebolla','vino tinto','caldo carne','tomillo']},

  {id:'rec93', name:'Crema de calabacín',           cat:'verduras', kcal:82, prot:3, carbs:8,  fat:4, sugar:4, diets:['vegetariano','vegano','saludable'],             ings:['calabacín','cebolla','caldo verduras','nata','aceite de oliva','sal','pimienta']},
  {id:'rec94', name:'Pollo al ajillo',               cat:'carnes',   kcal:290,prot:28,carbs:3,  fat:18,sugar:0, diets:['omnivora','saludable'],                         ings:['pollo troceado','ajo','vino blanco','aceite de oliva','perejil','sal','pimienta']},
  {id:'rec95', name:'Tortilla de patatas',           cat:'huevos',   kcal:248,prot:11,carbs:22, fat:13,sugar:1, diets:['vegetariano'],                                  ings:['patata','huevo','cebolla','aceite de oliva','sal']},
  {id:'rec96', name:'Fideuà',                        cat:'pasta',    kcal:365,prot:18,carbs:40, fat:14,sugar:2, diets:['omnivora','saludable'],                         ings:['fideos finos','gambas','mejillones','tomate','pimiento','ajo','azafrán','aceite de oliva']},
  {id:'rec97', name:'Caldo de pollo casero',         cat:'sopas',    kcal:65, prot:7, carbs:3,  fat:2, sugar:1, diets:['omnivora','saludable'],                         ings:['carcasa pollo','zanahoria','puerro','apio','cebolla','sal','pimienta en grano']},
  {id:'rec98', name:'Brócoli salteado con ajo',      cat:'verduras', kcal:95, prot:5, carbs:8,  fat:5, sugar:2, diets:['vegetariano','vegano','saludable'],             ings:['brócoli','ajo','aceite de oliva','sal','guindilla']},
  {id:'rec99', name:'Merluza al horno con limón',    cat:'pescado',  kcal:185,prot:25,carbs:2,  fat:8, sugar:0, diets:['omnivora','saludable'],                         ings:['merluza','limón','ajo','perejil','aceite de oliva','sal','pimienta']},
  {id:'rec100',name:'Garbanzos con espinacas',       cat:'legumbres',kcal:212,prot:11,carbs:28, fat:6, sugar:2, diets:['vegetariano','vegano','saludable'],             ings:['garbanzo cocido','espinaca','tomate triturado','ajo','comino','pimentón','aceite de oliva']},
  {id:'rec101',name:'Croquetas de jamón',            cat:'carnes',   kcal:285,prot:10,carbs:28, fat:15,sugar:2, diets:['omnivora'],                                     ings:['jamón serrano','leche','harina','mantequilla','huevo','pan rallado','nuez moscada']},
  {id:'rec102',name:'Arroz con leche',               cat:'postres',  kcal:195,prot:5, carbs:33, fat:5, sugar:18,diets:['vegetariano'],                                  ings:['arroz','leche','azúcar','canela','limón','sal']},
  {id:'rec103',name:'Patatas bravas',                cat:'verduras', kcal:220,prot:4, carbs:30, fat:10,sugar:2, diets:['vegetariano','vegano'],                         ings:['patata','tomate triturado','pimentón picante','aceite de oliva','ajo','sal']},
  {id:'rec104',name:'Tortilla de champiñones',       cat:'huevos',   kcal:168,prot:12,carbs:4,  fat:11,sugar:1, diets:['vegetariano'],                                  ings:['huevo','champiñón','cebolla','aceite de oliva','sal','pimienta']},
  {id:'rec105',name:'Lubina a la sal',               cat:'pescado',  kcal:168,prot:27,carbs:0,  fat:6, sugar:0, diets:['omnivora','saludable','paleolitica'],           ings:['lubina','sal gruesa','limón','aceite de oliva','perejil']},
  {id:'rec106',name:'Lentejas estofadas',            cat:'legumbres',kcal:245,prot:13,carbs:36, fat:5, sugar:3, diets:['vegetariano','vegano','saludable'],             ings:['lenteja','zanahoria','patata','cebolla','tomate','pimiento verde','ajo','pimentón','aceite de oliva']},
  {id:'rec107',name:'Pollo a la naranja',            cat:'carnes',   kcal:263,prot:25,carbs:12, fat:12,sugar:8, diets:['omnivora','saludable'],                         ings:['pollo','naranja','miel','salsa soja','ajo','jengibre','aceite de oliva']},
  {id:'rec108',name:'Espaguetis aglio e olio',       cat:'pasta',    kcal:380,prot:11,carbs:58, fat:13,sugar:2, diets:['vegetariano','vegano'],                         ings:['espaguetis','ajo','aceite de oliva','guindilla','perejil','sal']},
  {id:'rec109',name:'Fritura de calamares',          cat:'pescado',  kcal:295,prot:18,carbs:22, fat:15,sugar:0, diets:['omnivora'],                                     ings:['calamar','harina','aceite de oliva','limón','sal','pimienta']},
  {id:'rec110',name:'Crema de puerros',              cat:'sopas',    kcal:118,prot:3, carbs:14, fat:6, sugar:4, diets:['vegetariano','vegano'],                         ings:['puerro','patata','caldo verduras','aceite de oliva','sal','pimienta']},
  {id:'rec111',name:'Ternera con champiñones',       cat:'carnes',   kcal:340,prot:28,carbs:6,  fat:22,sugar:2, diets:['omnivora'],                                     ings:['ternera','champiñón','cebolla','vino blanco','nata','ajo','aceite de oliva']},
  {id:'rec112',name:'Tarta de queso al horno',       cat:'postres',  kcal:310,prot:7, carbs:27, fat:20,sugar:20,diets:['vegetariano'],                                  ings:['queso crema','huevo','azúcar','nata','galleta','mantequilla','vainilla']},
  {id:'rec113',name:'Wok de tofu y verduras',        cat:'verduras', kcal:185,prot:12,carbs:14, fat:9, sugar:5, diets:['vegetariano','vegano','saludable'],             ings:['tofu firme','pimiento','cebolla','zanahoria','salsa soja','aceite de sésamo','jengibre']},
  {id:'rec114',name:'Bacalao a la vizcaína',         cat:'pescado',  kcal:230,prot:26,carbs:10, fat:10,sugar:5, diets:['omnivora','saludable'],                         ings:['bacalao desalado','pimiento choricero','cebolla','tomate','ajo','aceite de oliva','perejil']},
  {id:'rec115',name:'Judías verdes con jamón',       cat:'verduras', kcal:140,prot:9, carbs:8,  fat:8, sugar:3, diets:['omnivora','saludable'],                         ings:['judía verde','jamón serrano','ajo','aceite de oliva','sal']},
  {id:'rec116',name:'Pizza de masa integral',        cat:'pasta',    kcal:295,prot:13,carbs:42, fat:9, sugar:4, diets:['vegetariano'],                                  ings:['harina integral','levadura','tomate triturado','mozzarella','orégano','aceite de oliva','sal']},
  {id:'rec117',name:'Pisto manchego',                cat:'verduras', kcal:125,prot:3, carbs:12, fat:7, sugar:8, diets:['vegetariano','vegano','saludable'],             ings:['calabacín','pimiento','tomate','cebolla','berenjena','aceite de oliva','sal']},
  {id:'rec118',name:'Dorada al papillote',           cat:'pescado',  kcal:190,prot:28,carbs:2,  fat:8, sugar:1, diets:['omnivora','saludable','paleolitica'],           ings:['dorada','limón','tomate','cebolla','aceite de oliva','tomillo','sal']},
  {id:'rec119',name:'Mousse de chocolate',           cat:'postres',  kcal:340,prot:6, carbs:25, fat:24,sugar:22,diets:['vegetariano'],                                  ings:['chocolate negro','huevo','nata','azúcar','mantequilla']},
  {id:'rec120',name:'Pollo en pepitoria',            cat:'carnes',   kcal:375,prot:32,carbs:8,  fat:23,sugar:2, diets:['omnivora','foodie'],                            ings:['pollo troceado','almendra','yema de huevo','azafrán','vino blanco','caldo pollo','cebolla','ajo']},];

// Coincidencia flexible: busca si el ingrediente de la receta está en el catálogo

