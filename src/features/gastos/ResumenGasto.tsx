// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { fmt2 } from '../../utils/helpers';
import { CAT_EMOJI, CAT_BG, CAT_TEXT, MONTH_NAMES, STORE_EMOJI } from '../../data/categories';
import { CurrencyEur, CurrencyDollar, ChartBar, X, FilePdf } from '@phosphor-icons/react';
import { generateGastoPDF } from '../../utils/pdfReport';
import type { Ingredient, Ticket, PriceHistory } from '../../data/types';
import { useMarket } from '../../i18n/useMarket';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';

declare const window: any;

const PALETTE = ['#0d9488','#d97706','#f59e0b','#ef4444','#3b82f6','#10b981','#f97316','#fbbf24','#ec4899','#06b6d4','#84cc16','#14b8a6'];
const STORE_COLOR: Record<string,string> = {Mercadona:'#0d9488',Consum:'#3b82f6',Carrefour:'#ef4444',Lidl:'#f59e0b',Aldi:'#f97316',Otro:'#6b7280'};
const CAT_COLOR: Record<string,string> = {
  'carnes':                '#ef4444',
  'pescado':               '#0ea5e9',
  'verduras':              '#10b981',
  'legumbres':             '#f59e0b',
  'lácteos':               '#eab308',
  'pasta y harinas':       '#f97316',
  'conservas':             '#64748b',
  'fruta':                 '#fb923c',
  'bebidas':               '#78716c',
  'congelados':            '#06b6d4',
  'bollería y dulces':     '#ec4899',
  'snacks y aperitivos':   '#84cc16',
  'especias y condimentos':'#14b8a6',
};

function SectionTitle({children}:{children:React.ReactNode}) {
  return <p style={{fontSize:'0.7rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.07em',color:'#94a3b8',marginBottom:10}}>{children}</p>;
}

const customTooltip=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:10,padding:'8px 12px',boxShadow:'0 4px 12px rgba(0,0,0,.08)'}}>
      {label&&<p style={{fontSize:'0.75rem',fontWeight:700,color:'#374151',marginBottom:4}}>{label}</p>}
      {payload.map((p,i)=>(
        <p key={i} style={{fontSize:'0.75rem',color:p.color||'#374151'}}>{p.name}: <strong>{typeof p.value==='number'?fp(p.value):p.value}</strong></p>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MODAL: Informe completo (Pro/Ultra)
───────────────────────────────────────────────────────────────── */
function InformeCompletoModal({open, onClose, tickets, ingredients, priceHistory}) {
  const [tab,setTab]=useState('resumen');
  const [pdfLoading,setPdfLoading]=useState(false);
  const { formatPrice: fp, currency, isUS, monthNames } = useMarket();
  const ingMap=useMemo(()=>Object.fromEntries(ingredients.map(i=>[i.id,i])),[ingredients]);

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try { await generateGastoPDF(tickets, priceHistory, ingredients); }
    catch(e) { alert('Error al generar el PDF. Comprueba tu conexion.'); }
    finally { setPdfLoading(false); }
  }

  const monthlyData = useMemo(()=>{
    const map:{[k:string]:number}={};
    tickets.forEach(t=>{ const k=t.date?.slice(0,7); if(k) map[k]=(map[k]||0)+(t.total||0); });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
      .map(([k,v])=>{ const [y,m]=k.split('-'); return {mes:MONTH_NAMES[parseInt(m)-1].slice(0,3), total:parseFloat(v.toFixed(2))}; });
  },[tickets]);

  const catData = useMemo(()=>{
    const s:{[k:string]:number}={};
    Object.entries(priceHistory).forEach(([id,recs])=>{ const ing=ingMap[id]; if(!ing) return; recs.forEach((r:any)=>{ s[ing.category]=(s[ing.category]||0)+r.price; }); });
    return Object.entries(s).sort((a,b)=>b[1]-a[1]).map(([cat,v],i)=>({cat, name:`${CAT_EMOJI[cat]||''} ${cat}`, value:parseFloat(v.toFixed(2)), fill:CAT_COLOR[cat]||PALETTE[i%PALETTE.length]}));
  },[priceHistory,ingMap]);
  const catTotal=catData.reduce((s,c)=>s+c.value,0);

  const storeData = useMemo(()=>{
    const s:{[k:string]:{total:number,count:number}}={};
    tickets.forEach(t=>{
      const store=t.store||(t.filename?.toLowerCase().includes('mercadona')?'Mercadona':t.filename?.toLowerCase().includes('consum')?'Consum':t.filename?.toLowerCase().includes('carrefour')?'Carrefour':t.filename?.toLowerCase().includes('lidl')?'Lidl':t.filename?.toLowerCase().includes('aldi')?'Aldi':'Sin nombre');
      if(!s[store]) s[store]={total:0,count:0};
      s[store].total+=(t.total||0);
      s[store].count+=1;
    });
    return Object.entries(s).sort((a,b)=>b[1].total-a[1].total).map(([store,d])=>({
      store,
      value:parseFloat(d.total.toFixed(2)),
      count:d.count,
      fill:STORE_COLOR[store]||'#6b7280'
    }));
  },[tickets]);
  const storeTotal=storeData.reduce((s,d)=>s+d.value,0);

  const topIngs = useMemo(()=>
    Object.entries(priceHistory).map(([id,recs])=>{ const ing=ingMap[id];if(!ing)return null; const total=(recs as any[]).reduce((s,r)=>s+r.price,0); return {name:ing.name,total:parseFloat(total.toFixed(2))}; })
    .filter(Boolean).sort((a,b)=>b.total-a.total).slice(0,10)
  ,[priceHistory,ingMap]);

  const allTotal=tickets.reduce((s,t)=>s+(t.total||0),0);
  const avgMonthly=monthlyData.length>0?(monthlyData.reduce((s,m)=>s+m.total,0)/monthlyData.length):0;

  const TABS=[['resumen','Resumen'],['meses','Meses'],['categoria','Categorías'],['super','Súpers'],['ings','Ingredientes']];

  if(!open) return null;

  return (
    <div style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'flex-end',justifyContent:'center',background:'rgba(0,0,0,.5)'}}>
      {/* Desktop: centered modal | Mobile: bottom sheet */}
      <div style={{
        width:'100%', maxWidth:680,
        maxHeight:'92vh', overflowY:'auto',
        background:'#f8fafc',
        borderRadius:'24px 24px 0 0',
        padding:'24px 20px 36px',
      }}
        className="sm:rounded-3xl sm:mb-6 sm:mx-4 sm:max-h-[88vh]"
      >
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <h2 style={{fontSize:'1.2rem',fontWeight:900,color:'#111827',margin:0,display:'flex',alignItems:'center',gap:6}}><ChartBar size={20} weight="fill" color="#0f766e"/> Informe completo</h2>
            <p style={{fontSize:'0.75rem',color:'#9ca3af',margin:'2px 0 0'}}>{tickets.length} tickets · {fp(allTotal)} total</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'7px 13px',borderRadius:12,border:'none',cursor:pdfLoading?'not-allowed':'pointer',
                background:pdfLoading?'#e2e8f0':'#0d9488',color:pdfLoading?'#94a3b8':'#fff',
                fontWeight:700,fontSize:'0.75rem',
              }}>
              <FilePdf size={15}/>{pdfLoading?'Generando...':'Descargar PDF'}
            </button>
            <button onClick={onClose} style={{background:'#f1f5f9',border:'none',borderRadius:'50%',width:36,height:36,fontSize:18,cursor:'pointer',color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={18}/></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:16,padding:4,borderRadius:16,background:'#e2e8f0',overflowX:'auto'}}>
          {TABS.map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{flex:'1 0 auto',padding:'7px 10px',borderRadius:12,fontSize:'0.7rem',fontWeight:700,border:'none',cursor:'pointer',whiteSpace:'nowrap',
                background:tab===k?'#fff':'transparent',color:tab===k?'#111827':'#94a3b8',
                boxShadow:tab===k?'0 1px 4px rgba(0,0,0,.08)':'none',transition:'all .15s'}}>
              {l}
            </button>
          ))}
        </div>

        {/* ══ RESUMEN ══ */}
        {tab==='resumen'&&(
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {monthlyData.length>0&&(
              <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                <SectionTitle>Evolución mensual</SectionTitle>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={monthlyData} margin={{top:0,right:4,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <Tooltip content={customTooltip}/>
                    <Bar dataKey="total" name="Gasto" fill="#0d9488" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {catData.length>0&&(
              <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                <SectionTitle>Categorías</SectionTitle>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                        {catData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                      </Pie>
                      <Tooltip content={customTooltip}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
                    {catData.slice(0,5).map(c=>(
                      <div key={c.cat} style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:c.fill,flexShrink:0}}/>
                        <span style={{fontSize:'0.7rem',color:'#374151',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
                        <span style={{fontSize:'0.7rem',fontWeight:700,color:'#111827',flexShrink:0}}>{catTotal>0?Math.round(c.value/catTotal*100):0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {storeData.length>0&&(
              <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                <SectionTitle>Supermercados</SectionTitle>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={storeData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                        {storeData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                      </Pie>
                      <Tooltip content={customTooltip}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
                    {storeData.map(s=>(
                      <div key={s.store} style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:s.fill,flexShrink:0}}/>
                        <span style={{fontSize:'0.7rem',color:'#374151',flex:1}}>{s.store}</span>
                        <span style={{fontSize:'0.7rem',fontWeight:700,color:'#111827',flexShrink:0}}>{fp(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MESES ══ */}
        {tab==='meses'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {monthlyData.length===0&&<p style={{textAlign:'center',color:'#d1d5db',padding:'40px 0',fontSize:'0.875rem'}}>Sin datos mensuales</p>}
            {monthlyData.length>0&&(
              <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                <SectionTitle>{isUS ? `Monthly Spending (${currency})` : `Gasto mensual (${currency})`}</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{top:0,right:4,left:-16,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="mes" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <Tooltip content={customTooltip}/>
                    <Bar dataKey="total" name="Gasto" fill="#0d9488" radius={[7,7,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                {monthlyData.length>=2&&(()=>{
                  const first=monthlyData[0].total, last=monthlyData[monthlyData.length-1].total;
                  const diff=last-first, pct=first>0?Math.round(diff/first*100):0;
                  return (
                    <div style={{marginTop:12,padding:'8px 12px',borderRadius:12,background:diff<=0?'#f0fdf4':'#fef2f2',display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:'1.2rem'}}>{diff<=0?'📉':'📈'}</span>
                      <p style={{fontSize:'0.75rem',color:diff<=0?'#0f766e':'#dc2626',fontWeight:600,margin:0}}>
                        {isUS?(diff<=0?'Down':'Up'):(diff<=0?'Bajada':'Subida')} {fp(Math.abs(diff))} ({Math.abs(pct)}%) {isUS?'vs first month':'vs primer mes'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
            {monthlyData.length>=2&&(
              <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                <SectionTitle>Tendencia de gasto</SectionTitle>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={monthlyData} margin={{top:0,right:4,left:-16,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <Tooltip content={customTooltip}/>
                    <Line type="monotone" dataKey="total" name="Gasto" stroke="#d97706" strokeWidth={2.5} dot={{r:4,fill:'#d97706'}} activeDot={{r:6}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ══ CATEGORÍAS ══ */}
        {tab==='categoria'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {catData.length===0&&<p style={{textAlign:'center',color:'#d1d5db',padding:'40px 0',fontSize:'0.875rem'}}>Sin datos</p>}
            {catData.length>0&&(
              <>
                <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                  <SectionTitle>Distribución por categoría</SectionTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {catData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                      </Pie>
                      <Tooltip content={customTooltip}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                  <SectionTitle>Ranking de gasto</SectionTitle>
                  <ResponsiveContainer width="100%" height={catData.length*40+20}>
                    <BarChart data={catData} layout="vertical" margin={{top:0,right:40,left:4,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#374151'}} width={100} axisLine={false} tickLine={false}/>
                      <Tooltip content={customTooltip}/>
                      <Bar dataKey="value" name="Gasto" radius={[0,6,6,0]}>{catData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ SÚPERS ══ */}
        {tab==='super'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {storeData.length===0&&(
              <div style={{textAlign:'center',color:'#d1d5db',padding:'48px 0',fontSize:'0.875rem'}}>
                <div style={{fontSize:'2.5rem',marginBottom:8}}>🏪</div>
                <p>Sin datos de supermercados</p>
                <p style={{fontSize:'0.75rem',marginTop:4}}>Añade un alias a tus tickets para verlos aquí</p>
              </div>
            )}
            {storeData.length>0&&(
              <>
                {/* Gráfico de barras horizontales */}
                <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                  <SectionTitle>Gasto por supermercado</SectionTitle>
                  <ResponsiveContainer width="100%" height={storeData.length*52+20}>
                    <BarChart data={storeData} layout="vertical" margin={{top:4,right:56,left:4,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>fp(v)}/>
                      <YAxis type="category" dataKey="store" tick={{fontSize:11,fill:'#374151',fontWeight:600}} width={82} axisLine={false} tickLine={false}
                        tickFormatter={store=>`${STORE_EMOJI?.[store]||'🏪'} ${store}`}/>
                      <Tooltip content={customTooltip}/>
                      <Bar dataKey="value" name="Gasto total" radius={[0,8,8,0]} label={{position:'right',fontSize:11,fontWeight:700,fill:'#374151',formatter:(v:number)=>fp(v)}}>
                        {storeData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tarjetas por súper */}
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {storeData.map((s,i)=>{
                    const pct=storeTotal>0?Math.round(s.value/storeTotal*100):0;
                    return (
                      <div key={s.store} style={{background:'#fff',borderRadius:16,padding:'14px 16px',border:'1px solid #f1f5f9',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:10,height:10,borderRadius:'50%',background:s.fill,flexShrink:0}}/>
                            <span style={{fontSize:'0.85rem',fontWeight:700,color:'#1e293b'}}>{STORE_EMOJI?.[s.store]||'🏪'} {s.store}</span>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:'0.9rem',fontWeight:800,color:'#111827'}}>{fp(s.value)}</div>
                            <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>{s.count} ticket{s.count!==1?'s':''} · {pct}%</div>
                          </div>
                        </div>
                        <div style={{height:6,borderRadius:6,background:'#f1f5f9',overflow:'hidden'}}>
                          <div style={{height:'100%',borderRadius:6,background:s.fill,width:`${pct}%`,transition:'width .5s'}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ INGREDIENTES ══ */}
        {tab==='ings'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {topIngs.length===0&&<p style={{textAlign:'center',color:'#d1d5db',padding:'40px 0',fontSize:'0.875rem'}}>Sin historial</p>}
            {topIngs.length>0&&(
              <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
                <SectionTitle>Top 10 ingredientes por gasto</SectionTitle>
                <ResponsiveContainer width="100%" height={topIngs.length*36+20}>
                  <BarChart data={topIngs} layout="vertical" margin={{top:0,right:44,left:4,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#374151'}} width={90} axisLine={false} tickLine={false}/>
                    <Tooltip content={customTooltip}/>
                    <Bar dataKey="total" name="Gasto total" fill="#d97706" radius={[0,6,6,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)'}}>
              <SectionTitle>Detalle por ingrediente</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {Object.entries(priceHistory)
                  .map(([id,recs])=>{ const ing=ingMap[id];if(!ing)return null; const total=(recs as any[]).reduce((s,r)=>s+r.price,0); const avg=total/(recs as any[]).length; return {ing,total,avg,count:(recs as any[]).length,recs:recs as any[]}; })
                  .filter(Boolean).sort((a,b)=>b.total-a.total)
                  .map(({ing,total,avg,count,recs})=>(
                    <div key={ing.id} style={{padding:'10px 12px',borderRadius:12,border:'1px solid #f1f5f9',background:'#fafafa'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                        <div>
                          <span style={{fontSize:'0.82rem',fontWeight:700,color:'#111827'}}>{ing.name}</span>
                          <span style={{marginLeft:6,fontSize:'0.65rem',fontWeight:700,padding:'2px 7px',borderRadius:20,background:'#f1f5f9',color:'#6b7280'}}>{ing.category}</span>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'0.9rem',fontWeight:900,color:'#d97706'}}>{fp(total)}</div>
                          <div style={{fontSize:'0.65rem',color:'#9ca3af'}}>~{fp(avg)}/{isUS?'unit':'ud'} · {count}x</div>
                        </div>
                      </div>
                      {recs.slice(-3).map((r,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'0.68rem',color:'#9ca3af'}}>
                          <span>{r.date} · <em>{r.rawName}</em></span>
                          <span style={{fontWeight:700}}>{fp(r.price)}</span>
                        </div>
                      ))}
                      {recs.length>3&&<p style={{fontSize:'0.65rem',color:'#d1d5db',margin:'4px 0 0'}}>+ {recs.length-3} compras más</p>}
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VISTA PRINCIPAL — básica para todos los usuarios
───────────────────────────────────────────────────────────────── */
export function ResumenGasto({tickets,ingredients,priceHistory,isPro,onUpgrade}) {
  const [showFull, setShowFull]=useState(false);
  const { formatPrice: fp, currency, isUS, monthNames } = useMarket();
  const canSeeReport=isPro;
  const now=new Date();
  const ingMap=useMemo(()=>Object.fromEntries(ingredients.map(i=>[i.id,i])),[ingredients]);

  const monthKey=`${now.getFullYear()}-${fmt2(now.getMonth()+1)}`;
  const monthTickets=tickets.filter(t=>t.date?.startsWith(monthKey));
  const monthTotal=monthTickets.reduce((s,t)=>s+(t.total||0),0);
  const allTotal=tickets.reduce((s,t)=>s+(t.total||0),0);

  const monthlyData = useMemo(()=>{
    const map:{[k:string]:number}={};
    tickets.forEach(t=>{ const k=t.date?.slice(0,7); if(k) map[k]=(map[k]||0)+(t.total||0); });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
      .map(([k,v])=>{ const [y,m]=k.split('-'); return {mes:MONTH_NAMES[parseInt(m)-1].slice(0,3), total:parseFloat(v.toFixed(2))}; });
  },[tickets]);

  const catData = useMemo(()=>{
    const s:{[k:string]:number}={};
    Object.entries(priceHistory).forEach(([id,recs])=>{ const ing=ingMap[id]; if(!ing) return; recs.forEach((r:any)=>{ s[ing.category]=(s[ing.category]||0)+r.price; }); });
    return Object.entries(s).sort((a,b)=>b[1]-a[1]).map(([cat,v],i)=>({cat, name:`${CAT_EMOJI[cat]||''} ${cat}`, value:parseFloat(v.toFixed(2)), fill:CAT_COLOR[cat]||PALETTE[i%PALETTE.length]}));
  },[priceHistory,ingMap]);
  const catTotal=catData.reduce((s,c)=>s+c.value,0);

  const avgMonthly=monthlyData.length>0?(monthlyData.reduce((s,m)=>s+m.total,0)/monthlyData.length):0;
  const lastMonthKey=new Date(now.getFullYear(),now.getMonth()-1,1);
  const prevKey=`${lastMonthKey.getFullYear()}-${fmt2(lastMonthKey.getMonth()+1)}`;
  const prevTotal=tickets.filter(t=>t.date?.startsWith(prevKey)).reduce((s,t)=>s+(t.total||0),0);
  const monthDiff=monthTotal-prevTotal;

  return (
    <div className="fade-in" style={{paddingBottom:32}}>
      {/* Header */}
      <div className="mb-5">
        <h1 style={{fontSize:'1.5rem',fontWeight:900,color:'#111827',letterSpacing:'-0.02em',lineHeight:1,display:'flex',alignItems:'center',gap:8}}>
          {isUS ? <CurrencyDollar size={22} weight="fill" color="#0f766e"/> : <CurrencyEur size={22} weight="fill" color="#0f766e"/>}
          {isUS ? 'Spending' : 'Gastos'}
        </h1>
        <p style={{fontSize:'0.875rem',color:'#9ca3af',marginTop:4}}>
          <span style={{fontWeight:700,color:'#0d9488'}}>{fp(monthTotal)}</span> {isUS ? 'this month' : 'este mes'} · {tickets.length} {isUS ? 'receipts' : 'tickets'} total
        </p>
      </div>

      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
        {[
          {label:monthNames[now.getMonth()],val:fp(monthTotal),sub:`${monthTickets.length} ${isUS?'receipts':'tickets'}`,bg:'linear-gradient(135deg,#0f766e,#0d9488)',shadow:'rgba(13,148,136,.3)'},
          {label:isUS?'Monthly avg':'Media mensual',val:fp(avgMonthly),sub:isUS?'last months':'últimos meses',bg:'linear-gradient(135deg,#0369a1,#0284c7)',shadow:'rgba(3,105,161,.25)'},
          {label:isUS?'All time':'Total histórico',val:fp(allTotal),sub:`${tickets.length} ${isUS?'receipts':'tickets'}`,bg:'linear-gradient(135deg,#134e4a,#0f766e)',shadow:'rgba(19,78,74,.3)'},
        ].map(c=>(
          <div key={c.label} style={{borderRadius:16,padding:'12px 10px',color:'#fff',background:c.bg,boxShadow:`0 2px 10px ${c.shadow}`}}>
            <div style={{fontSize:'0.6rem',fontWeight:700,opacity:.75,marginBottom:3,textTransform:'uppercase',letterSpacing:'.04em'}}>{c.label}</div>
            <div style={{fontSize:'1.05rem',fontWeight:900,lineHeight:1}}>{c.val}</div>
            <div style={{fontSize:'0.6rem',marginTop:3,opacity:.7}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {!tickets.length&&(
        <div style={{textAlign:'center',color:'#d1d5db',padding:'40px 0',fontSize:'0.875rem'}}>
          Sin tickets aún · sube tu primer ticket para ver el resumen
        </div>
      )}

      {tickets.length>0&&(
        <>
          {/* Variación vs mes anterior */}
          {prevTotal>0&&(
            <div style={{marginBottom:16,padding:'10px 14px',borderRadius:14,background:monthDiff<=0?'#f0fdf4':'#fef2f2',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:'1.4rem'}}>{monthDiff<=0?'📉':'📈'}</span>
              <div>
                <p style={{margin:0,fontSize:'0.8rem',fontWeight:700,color:monthDiff<=0?'#0f766e':'#dc2626'}}>
                  {monthDiff<=0?'Gastas menos':'Gastas más'} que el mes anterior
                </p>
                <p style={{margin:0,fontSize:'0.7rem',color:'#9ca3af'}}>
                  {fp(Math.abs(monthDiff))} {isUS ? 'difference · prev' : 'de diferencia · antes'} {fp(prevTotal)}
                </p>
              </div>
            </div>
          )}

          {/* Últimos tickets */}
          <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)',marginBottom:16}}>
            <SectionTitle>Últimas compras</SectionTitle>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[...tickets].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5).map(t=>(
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f8fafc'}}>
                  <div>
                    <p style={{margin:0,fontSize:'0.82rem',fontWeight:600,color:'#374151'}}>{t.store||t.filename?.split('.')[0]||'Ticket'}</p>
                    <p style={{margin:0,fontSize:'0.7rem',color:'#9ca3af'}}>{t.date||'Sin fecha'} · {(t.items||[]).length} productos</p>
                  </div>
                  <span style={{fontSize:'0.9rem',fontWeight:800,color:'#111827'}}>{fp(t.total||0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top categorías */}
          {catData.length>0&&(
            <div style={{background:'#fff',borderRadius:20,padding:'16px 12px',border:'1px solid #f1f5f9',boxShadow:'0 2px 8px rgba(0,0,0,.05)',marginBottom:20}}>
              <SectionTitle>Distribución por categoría</SectionTitle>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {catData.slice(0,5).map(c=>(
                  <div key={c.cat}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:'0.8rem',color:'#374151',fontWeight:600}}>{c.name}</span>
                      <span style={{fontSize:'0.8rem',fontWeight:800,color:'#111827'}}>{fp(c.value)}
                        <span style={{fontSize:'0.65rem',fontWeight:400,color:'#9ca3af',marginLeft:4}}>{catTotal>0?Math.round(c.value/catTotal*100):0}%</span>
                      </span>
                    </div>
                    <div style={{height:6,borderRadius:6,background:'#f1f5f9',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:6,background:c.fill,width:catTotal>0?`${c.value/catTotal*100}%`:'0%',transition:'width .5s'}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón informe completo */}
          {canSeeReport?(
            <button onClick={()=>setShowFull(true)}
              style={{width:'100%',padding:'13px',borderRadius:16,fontWeight:800,fontSize:'0.9rem',border:'none',cursor:'pointer',
                background:'linear-gradient(135deg,#b45309,#d97706,#fbbf24)',color:'#fff',
                boxShadow:'0 4px 14px rgba(180,83,9,.35)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <ChartBar size={16} style={{flexShrink:0}}/> Ver informe completo
            </button>
          ):(
            <button onClick={onUpgrade}
              style={{width:'100%',padding:'13px',borderRadius:16,fontWeight:800,fontSize:'0.875rem',border:'none',cursor:'pointer',
                background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',
                boxShadow:'0 4px 14px rgba(245,158,11,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <span>💎</span> Informe completo con gráficos — Solo Pro
            </button>
          )}
        </>
      )}

      {/* Modal informe completo */}
      <InformeCompletoModal
        open={showFull}
        onClose={()=>setShowFull(false)}
        tickets={tickets}
        ingredients={ingredients}
        priceHistory={priceHistory}
      />
    </div>
  );
}
