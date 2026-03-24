// @ts-nocheck
import React, { useState, useMemo } from 'react';
import type { Ingredient, Dish, Plan, PriceHistory } from '../../data/types';
import { CAT_BG, CAT_TEXT, CAT_EMOJI, MONTH_NAMES, CATEGORIES } from '../../data/categories';

export function ListaCompra({plan,dishes,ingredients,priceHistory}) {
  const now=new Date();
  const [selYear,setSelYear]=useState(now.getFullYear());
  const [selMonth,setSelMonth]=useState(now.getMonth());
  const [list,setList]=useState(null);
  const [checked,setChecked]=useState({});

  const generate=()=>{
    const needed=new Set();
    Object.entries(plan).forEach(([k,dp])=>{
      const [y,m]=k.split('-').map(Number);
      if(y===selYear&&m-1===selMonth){
        const add=id=>{const d=dishes.find(x=>x.id===id);d?.ingredients.forEach(ii=>needed.add(ii));};
        if(dp.lunch)add(dp.lunch);
        if(dp.dinner)add(dp.dinner);
      }
    });
    const planMissing=new Set(ingredients.filter(i=>needed.has(i.id)&&!i.available).map(i=>i.id));
    const explicitNeeded=ingredients.filter(i=>i.needed&&!i.available);
    explicitNeeded.forEach(i=>planMissing.add(i.id));
    const missing=ingredients.filter(i=>planMissing.has(i.id));
    const items=missing.map(ing=>{
      const hist=priceHistory[ing.id]||[];
      const avg=hist.length>0?hist.reduce((s,h)=>s+h.price,0)/hist.length:null;
      return {...ing,avgPrice:avg,histCount:hist.length};
    });
    const grouped={};
    items.forEach(i=>{if(!grouped[i.category])grouped[i.category]=[];grouped[i.category].push(i);});
    setList({grouped,items,estTotal:items.reduce((s,i)=>s+(i.avgPrice||0),0)});
    setChecked({});
  };

  const doneCount=Object.values(checked).filter(Boolean).length;

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 leading-none" style={{letterSpacing:'-0.02em'}}>
          Lista de compra 🛒
        </h1>
        <p className="text-sm text-gray-400 mt-1">Genera lo que te falta según tu plan</p>
      </div>

      {/* ── Generador ── */}
      <div className="bg-white rounded-2xl p-5 mb-5" style={{border:'1px solid #f1f5f9',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Generar lista para</p>
        <div className="flex gap-2 mb-4">
          <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}
            className="flex-1 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            style={{border:'1px solid #e2e8f0',background:'#f8fafc'}}>
            {MONTH_NAMES.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <input type="number" value={selYear} onChange={e=>setSelYear(Number(e.target.value))}
            className="w-24 rounded-2xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-200"
            style={{border:'1px solid #e2e8f0',background:'#f8fafc'}}/>
        </div>
        <button onClick={generate}
          className="w-full text-white rounded-2xl py-3.5 font-bold text-sm"
          style={{background:'#16a34a',boxShadow:'0 2px 10px rgba(22,163,74,.35)'}}>
          🛒 Generar lista de la compra
        </button>
      </div>

      {/* ── Resultado ── */}
      {list&&(list.items.length===0
        ?(
          <div className="text-center py-12 bg-white rounded-2xl" style={{border:'1px solid #f1f5f9'}}>
            <div className="text-5xl mb-3">🎉</div>
            <p className="font-bold text-gray-800">¡Todo listo para el mes!</p>
            <p className="text-sm text-gray-400 mt-1">Tienes todos los ingredientes necesarios</p>
          </div>
        ):(
          <>
            {/* Summary */}
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-2xl font-black text-gray-900 leading-none">{list.items.length}</div>
                <div className="text-xs text-gray-400 font-medium mt-0.5">ingredientes · <span className="text-green-600 font-semibold">{doneCount} en el carrito</span></div>
              </div>
              {list.estTotal>0&&(
                <div className="text-right">
                  <div className="text-xs text-gray-400">Estimado</div>
                  <div className="text-lg font-black text-green-600">{list.estTotal.toFixed(2)}€</div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {doneCount>0&&(
              <div className="mb-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all"
                  style={{width:`${Math.round(doneCount/list.items.length*100)}%`}}/>
              </div>
            )}

            {/* Items by category */}
            {CATEGORIES.filter(c=>list.grouped[c]).map(cat=>(
              <div key={cat} className="mb-4">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${CAT_BG[cat]} ${CAT_TEXT[cat]}`}>
                  {CAT_EMOJI[cat]} {cat}
                </div>
                <div className="space-y-1.5">
                  {list.grouped[cat].map(item=>(
                    <div key={item.id}
                      onClick={()=>setChecked(c=>({...c,[item.id]:!c[item.id]}))}
                      className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 cursor-pointer transition-all"
                      style={{
                        border: checked[item.id] ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                        background: checked[item.id] ? '#f0fdf4' : '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                      }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all
                          ${checked[item.id]?'bg-green-500 border-green-500 text-white':'border-gray-200'}`}>
                          {checked[item.id]&&'✓'}
                        </div>
                        <span className={`text-sm font-medium ${checked[item.id]?'line-through text-gray-300':'text-gray-700'}`}>
                          {item.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {item.avgPrice
                          ?<><div className="text-sm font-bold text-green-600">~{item.avgPrice.toFixed(2)}€</div><div className="text-[10px] text-gray-300">{item.histCount}x</div></>
                          :<span className="text-xs text-gray-300">sin datos</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )
      )}
    </div>
  );
}
