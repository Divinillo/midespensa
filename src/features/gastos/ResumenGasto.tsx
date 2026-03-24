// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { fmt2 } from '../../utils/helpers';
import { CAT_EMOJI, CAT_BG, CAT_TEXT, MONTH_NAMES, STORE_EMOJI } from '../../data/categories';
import { Modal } from '../../components/ui/Modal';
import { generateNutriPDF } from '../../utils/pdfReport';
import type { Ingredient, Ticket, PriceHistory } from '../../data/types';

// CDN globals
declare const window: any;

export function ResumenGasto({tickets,ingredients,priceHistory,isPro,onUpgrade}) {
  const [tab,setTab]=useState('mes');
  const now=new Date();
  const ingMap=useMemo(()=>Object.fromEntries(ingredients.map(i=>[i.id,i])),[ingredients]);
  const monthKey=`${now.getFullYear()}-${fmt2(now.getMonth()+1)}`;
  const monthTickets=tickets.filter(t=>t.date?.startsWith(monthKey));
  const monthTotal=monthTickets.reduce((s,t)=>s+(t.total||0),0);
  const allTotal=tickets.reduce((s,t)=>s+(t.total||0),0);
  const ingStats=useMemo(()=>Object.entries(priceHistory).map(([id,recs])=>{
    const ing=ingMap[id];if(!ing)return null;
    const total=recs.reduce((s,r)=>s+r.price,0);
    return {ing,total,avg:total/recs.length,count:recs.length,recs};
  }).filter(Boolean).sort((a,b)=>b.total-a.total),[priceHistory,ingMap]);
  const catStats=useMemo(()=>{const s={};ingStats.forEach(({ing,total})=>{if(!s[ing.category])s[ing.category]=0;s[ing.category]+=total;});return Object.entries(s).sort((a,b)=>b[1]-a[1]);},[ingStats]);
  const catTotal=useMemo(()=>catStats.reduce((s,[,v])=>s+v,0),[catStats]);
  // Por supermercado
  const storeStats=useMemo(()=>{
    const s={};
    tickets.forEach(t=>{
      const store=t.store||(t.filename?.toLowerCase().includes('mercadona')?'Mercadona':t.filename?.toLowerCase().includes('consum')?'Consum':'Otro');
      if(!s[store])s[store]={total:0,count:0,monthTotal:0};
      s[store].total+=(t.total||0);
      s[store].count++;
      if(t.date?.startsWith(monthKey))s[store].monthTotal+=(t.total||0);
    });
    return Object.entries(s).sort((a,b)=>b[1].total-a[1].total);
  },[tickets,monthKey]);
  const storeTotal=useMemo(()=>storeStats.reduce((s,[,v])=>s+v.total,0),[storeStats]);
  const STORE_EMOJI={'Mercadona':'🟢','Consum':'🔵','Carrefour':'🔴','Lidl':'🟡','Aldi':'🟠','Otro':'🏪'};

  const printReport = () => { window.print(); };

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 leading-none" style={{letterSpacing:'-0.02em'}}>
          Gastos 💰
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          <span className="font-bold text-green-600">{monthTotal.toFixed(2)}€</span> este mes · {tickets.length} tickets en total
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-4 text-white" style={{background:'linear-gradient(135deg,#15803d,#16a34a)',boxShadow:'0 2px 12px rgba(22,163,74,.3)'}}>
          <div className="text-xs font-semibold mb-1" style={{opacity:.75}}>{MONTH_NAMES[now.getMonth()]}</div>
          <div className="text-2xl font-black leading-none">{monthTotal.toFixed(2)}€</div>
          <div className="text-xs mt-1" style={{opacity:.7}}>{monthTickets.length} tickets</div>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{background:'linear-gradient(135deg,#6d28d9,#7c3aed)',boxShadow:'0 2px 12px rgba(109,40,217,.25)'}}>
          <div className="text-xs font-semibold mb-1" style={{opacity:.75}}>Total histórico</div>
          <div className="text-2xl font-black leading-none">{allTotal.toFixed(2)}€</div>
          <div className="text-xs mt-1" style={{opacity:.7}}>{tickets.length} tickets</div>
        </div>
      </div>

      {/* ── PDF banner ── */}
      <div className="rounded-2xl p-4 mb-4 flex items-center justify-between"
        style={{background: isPro?'#f5f3ff':'#f8fafc', border:`1px solid ${isPro?'#ddd6fe':'#e2e8f0'}`}}>
        <div>
          <p className="text-sm font-bold text-gray-700">📊 Informe PDF</p>
          <p className="text-xs text-gray-400 mt-0.5">{isPro?'Imprime o guarda el resumen':'Solo en versión Pro'}</p>
        </div>
        {isPro
          ?<button onClick={printReport} className="px-4 py-2 rounded-full text-xs font-bold text-white no-print" style={{background:'#7c3aed'}}>Generar PDF</button>
          :<button onClick={()=>onUpgrade('reports')} className="px-4 py-2 rounded-full text-xs font-bold text-white" style={{background:'#16a34a'}}>🔒 Desbloquear</button>
        }
      </div>

      {/* ── Aviso mes ── */}
      {tickets.length>0&&monthTickets.length===0&&(
        <div className="rounded-2xl px-4 py-3 mb-4 flex gap-3 items-start"
          style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
          <span className="text-base leading-none mt-0.5">💡</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            Los tickets no corresponden a <strong>{MONTH_NAMES[now.getMonth()]}</strong>. El importe del mes se muestra en 0 € — puedes verlos en <strong>Tickets</strong>.
          </p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{background:'#f1f5f9'}}>
        {[['mes','Tickets'],['super','Súper'],['cat','Categoría'],['ing','Ingrediente']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${tab===k?'bg-white text-gray-800 shadow-sm':'text-gray-400'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Tab: Tickets ── */}
      {tab==='mes'&&(
        <div className="space-y-2">
          {!tickets.length&&<div className="text-center text-gray-300 py-10 text-sm">Sin tickets</div>}
          {[...tickets].reverse().map(t=>{
            const store=t.store||(t.filename?.toLowerCase().includes('mercadona')?'Mercadona':t.filename?.toLowerCase().includes('consum')?'Consum':'Otro');
            return (
              <div key={t.id} className="bg-white rounded-2xl p-4 flex justify-between items-center"
                style={{border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">🧾 {t.filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.date} · {STORE_EMOJI[store]||'🏪'} {store} · {(t.matched||[]).length} ing.</p>
                </div>
                <div className="text-base font-black text-green-600 shrink-0 ml-3">{t.total?.toFixed(2)}€</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Súper ── */}
      {tab==='super'&&(
        <div className="space-y-2">
          {!storeStats.length&&<div className="text-center text-gray-300 py-10 text-sm">Sin tickets</div>}
          {storeStats.map(([store,{total,count,monthTotal}])=>(
            <div key={store} className="bg-white rounded-2xl p-4"
              style={{border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{STORE_EMOJI[store]||'🏪'}</span>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{store}</div>
                    <div className="text-xs text-gray-400">{count} ticket{count!==1?'s':''}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-gray-900">{total.toFixed(2)}€</div>
                  {monthTotal>0&&<div className="text-xs text-gray-400">Este mes: {monthTotal.toFixed(2)}€</div>}
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{background:'#f1f5f9'}}>
                <div className="h-full bg-green-400 rounded-full transition-all"
                  style={{width:storeTotal>0?`${Math.min(100,(total/storeTotal)*100)}%`:'0%'}}/>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{storeTotal>0?Math.round((total/storeTotal)*100):0}% del gasto total</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Categoría ── */}
      {tab==='cat'&&(
        <div className="space-y-2">
          {!catStats.length&&<div className="text-center text-gray-300 py-10 text-sm">Sin datos</div>}
          {catStats.map(([cat,total])=>(
            <div key={cat} className="bg-white rounded-2xl p-4"
              style={{border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-sm font-semibold text-gray-700">{CAT_EMOJI[cat]} {cat}</span>
                <span className="text-sm font-black text-gray-900">{total.toFixed(2)}€</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{background:'#f1f5f9'}}>
                <div className="h-full rounded-full transition-all" style={{width:catTotal>0?`${Math.min(100,(total/catTotal)*100)}%`:'0%',background:'linear-gradient(90deg,#16a34a,#7c3aed)'}}/>
              </div>
              <div className="text-xs text-gray-400 mt-1">{catTotal>0?Math.round((total/catTotal)*100):0}% del total</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Ingrediente ── */}
      {tab==='ing'&&(
        <div className="space-y-2">
          {!ingStats.length&&<div className="text-center text-gray-300 py-10 text-sm">Sin historial</div>}
          {ingStats.map(({ing,total,avg,count,recs})=>(
            <div key={ing.id} className="bg-white rounded-2xl p-4"
              style={{border:'1px solid #f1f5f9',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-sm font-bold text-gray-900">{ing.name}</span>
                  <div className="mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${CAT_BG[ing.category]} ${CAT_TEXT[ing.category]}`}>{ing.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-gray-900">{total.toFixed(2)}€</div>
                  <div className="text-xs text-gray-400">~{avg.toFixed(2)}€/ud · {count}x</div>
                </div>
              </div>
              <div className="space-y-0.5">
                {recs.slice(-3).map((r,i)=>(
                  <div key={i} className="flex justify-between text-xs text-gray-400">
                    <span>{r.date} · <span className="italic text-gray-300">{r.rawName}</span></span>
                    <span className="font-semibold">{r.price.toFixed(2)}€</span>
                  </div>
                ))}
                {recs.length>3&&<p className="text-xs text-gray-300">+ {recs.length-3} compras más</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   ONBOARDING — PRIMEROS PASOS
═══════════════════════════════════════ */

