// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Confirm } from '../../components/ui/Confirm';
import { uid, fmt2 } from '../../utils/helpers';
import { FREE_TICKET_LIMIT, CAT_BG, CAT_TEXT, CAT_EMOJI, CATEGORIES } from '../../data/categories';
import { processImageTicket, processPdf, applyTicket } from '../../utils/ticketProcess';
import { normalizeName } from '../../utils/helpers';
import type { Ingredient, Ticket, PriceHistory } from '../../data/types';
import { Receipt, Trash, X, PencilSimple, Check } from '@phosphor-icons/react';

// CDN globals
declare const window: any;

export function Tickets({tickets,setTickets,ingredients,setIngredients,priceHistory,setPriceHistory,learnedMappings={},setLearnedMappings,isPro,isUltra,onUpgrade}) {
  const [pdfjsReady,setPdfjsReady]=useState(false);
  const [loading,setLoading]=useState(false);
  const [ocrProgress,setOcrProgress]=useState(null); // null | -1 (cargando) | 0-100
  const [detail,setDetail]=useState(null);
  const [mapModal,setMapModal]=useState(null);
  const [mapTarget,setMapTarget]=useState('');
  const [mapSearch,setMapSearch]=useState('');
  const [addModal,setAddModal]=useState(null);
  const [addForm,setAddForm]=useState({name:'',category:'verduras'});
  const [confirm,setConfirm]=useState(null);
  const [editingAlias,setEditingAlias]=useState<string|null>(null);
  const [aliasValue,setAliasValue]=useState('');
  const fileRef=useRef();
  const cameraRef=useRef();

  const startEditAlias=(tk)=>{setEditingAlias(tk.id);setAliasValue(tk.store||'');};
  const saveAlias=()=>{
    if(editingAlias){
      setTickets(ts=>ts.map(t=>t.id===editingAlias?{...t,store:aliasValue.trim()||t.store}:t));
    }
    setEditingAlias(null);
  };

  // Cargar pdf.js dinámicamente
  useEffect(()=>{
    if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';setPdfjsReady(true);return;}
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';setPdfjsReady(true);};
    document.head.appendChild(s);
  },[]);

  const handleFiles=async(files)=>{
    if(!pdfjsReady){alert('El lector PDF aún carga. Espera un momento.');return;}
    if(!isPro && tickets.length >= FREE_TICKET_LIMIT){ onUpgrade('tickets'); return; }
    setLoading(true);
    let currentIngs=[...ingredients];
    let currentHistory={...priceHistory};
    const newTickets=[];

    for(const file of files){
      if(!file.name.toLowerCase().endsWith('.pdf')) continue;
      try{
        const ticket=await processPdf(file);
        // Evitar duplicados por nombre de fichero
        if(tickets.some(t=>t.filename===ticket.filename)){
          alert(`Ya existe un ticket con el nombre: ${file.name}`);
          continue;
        }
        const {updatedIngs,newHistory,matched,unmatched}=applyTicket(ticket,currentIngs,currentHistory,learnedMappings);
        currentIngs=updatedIngs;
        currentHistory=newHistory;
        newTickets.push({...ticket,matched,unmatched});
      }catch(err){
        console.error('Error PDF:',err);
        alert(`No se pudo leer "${file.name}".\n\n${err?.message||'Formato no reconocido.'}\n\nPrueba con la foto del ticket (Ultra Chef).`);
      }
    }

    if(newTickets.length){
      setIngredients(currentIngs);
      setPriceHistory(currentHistory);
      setTickets(ts=>[...ts,...newTickets]);
    }
    setLoading(false);
  };

  const onFileChange=e=>{if(e.target.files.length)handleFiles(Array.from(e.target.files));e.target.value='';};
  const onDrop=e=>{e.preventDefault();handleFiles(Array.from(e.dataTransfer.files));};

  // ── Procesar foto de ticket con OCR (Ultra) ──
  const handleCameraFiles=async(files)=>{
    if(!isUltra){ onUpgrade('ultra'); return; }
    if(!isPro && tickets.length >= FREE_TICKET_LIMIT){ onUpgrade('tickets'); return; }
    setLoading(true);
    setOcrProgress(-1);
    let currentIngs=[...ingredients];
    let currentHistory={...priceHistory};
    const newTickets=[];

    for(const file of files){
      if(!file.type.startsWith('image/')){ alert('Solo se admiten imágenes (JPG, PNG, WEBP).'); continue; }
      try{
        const ticket=await processImageTicket(file, pct=>setOcrProgress(pct));
        if(tickets.some(t=>t.filename===ticket.filename)){
          // Si el nombre coincide (misma foto), generar uno distinto
          ticket.filename='foto-ticket-'+Date.now()+'.jpg';
        }
        const {updatedIngs,newHistory,matched,unmatched}=applyTicket(ticket,currentIngs,currentHistory,learnedMappings);
        currentIngs=updatedIngs;
        currentHistory=newHistory;
        newTickets.push({...ticket,matched,unmatched});
      }catch(err){
        console.error('Error OCR:',err);
        const msg=err&&err.message?err.message:(typeof err==='string'?err:JSON.stringify(err)||'Error desconocido');
        console.error('OCR error completo:',err);
        alert('No se pudo procesar la foto.\n\nDetalle: '+msg+'\n\nComprueba la conexión a internet e inténtalo de nuevo.');
      }
    }

    if(newTickets.length){
      setIngredients(currentIngs);
      setPriceHistory(currentHistory);
      setTickets(ts=>[...ts,...newTickets]);
    }
    setLoading(false);
    setOcrProgress(null);
  };

  const onCameraChange=e=>{if(e.target.files.length)handleCameraFiles(Array.from(e.target.files));e.target.value='';};

  const deleteTicket=id=>{
    if(id==='__all__'){
      setTickets([]);
      setPriceHistory({});
    } else {
      setTickets(ts=>ts.filter(t=>t.id!==id));
      // Limpiar entradas de priceHistory asociadas a este ticket
      setPriceHistory(ph=>{
        const updated={};
        Object.entries(ph).forEach(([ingId,recs])=>{
          const kept=recs.filter(r=>r.ticketId!==id);
          if(kept.length>0) updated[ingId]=kept;
        });
        return updated;
      });
    }
    setConfirm(null);
  };

  // Quitar un producto de la lista de no reconocidos (p.ej. productos de limpieza)
  const dismissUnmatched=(ticketId,productId)=>{
    setTickets(ts=>ts.map(t=>{
      if(t.id!==ticketId) return t;
      return {...t, unmatched:(t.unmatched||[]).filter(p=>p.id!==productId)};
    }));
  };

  // Mapear manualmente un producto no reconocido a un ingrediente
  const applyManualMap=()=>{
    if(!mapModal||!mapTarget) return;
    const {ticketId,productId}=mapModal;
    const ticket=tickets.find(t=>t.id===ticketId);
    const product=ticket?.unmatched?.find(p=>p.id===productId);
    if(!product) return;
    const ing=ingredients.find(i=>i.name===mapTarget);
    if(!ing) return;

    // Actualizar historial y disponibilidad
    setPriceHistory(ph=>{
      const nh={...ph};
      if(!nh[ing.id])nh[ing.id]=[];
      nh[ing.id].push({date:ticket.date,price:product.price,rawName:product.rawName,ticketId});
      return nh;
    });
    setIngredients(ings=>ings.map(i=>i.id===ing.id?{...i,available:true}:i));

    // Guardar mapeo aprendido para futuros tickets
    // CLAVE: rawName en minúsculas (normalizedName puede ser null para productos sin identificar)
    if(setLearnedMappings && product.rawName) {
      setLearnedMappings(lm => {
        const upd = { ...lm, [(product.rawName||'').trim().toLowerCase()]: ing.name };
        if(product.normalizedName) upd[product.normalizedName.toLowerCase()] = ing.name;
        return upd;
      });
    }

    // Mover de unmatched a matched en el ticket
    setTickets(ts=>ts.map(t=>{
      if(t.id!==ticketId) return t;
      return {
        ...t,
        matched:[...(t.matched||[]),{rawName:product.rawName,ingredientName:ing.name,price:product.price,category:ing.category}],
        unmatched:(t.unmatched||[]).filter(p=>p.id!==productId)
      };
    }));
    setMapModal(null);setMapTarget('');setMapSearch('');
  };

  // Añadir un producto no reconocido como NUEVO ingrediente al catálogo
  const applyAddToCatalog=()=>{
    if(!addModal||!addForm.name.trim()) return;
    const {ticketId,productId}=addModal;
    const ticket=tickets.find(t=>t.id===ticketId);
    const product=ticket?.unmatched?.find(p=>p.id===productId);
    if(!product) return;

    // Crear nuevo ingrediente en el catálogo, ya marcado como disponible
    const newIng={id:'i'+uid(), name:addForm.name.trim().toLowerCase(), category:addForm.category, available:true};
    setIngredients(ings=>[...ings, newIng]);

    // Guardar precio en historial
    setPriceHistory(ph=>{
      const nh={...ph};
      if(!nh[newIng.id]) nh[newIng.id]=[];
      nh[newIng.id].push({date:ticket.date, price:product.price, rawName:product.rawName, ticketId});
      return nh;
    });

    // Guardar mapeo aprendido para futuros tickets
    // CLAVE: rawName en minúsculas (normalizedName puede ser null para productos sin identificar)
    if(setLearnedMappings && product.rawName) {
      setLearnedMappings(lm => {
        const upd = { ...lm, [(product.rawName||'').trim().toLowerCase()]: newIng.name };
        if(product.normalizedName) upd[product.normalizedName.toLowerCase()] = newIng.name;
        return upd;
      });
    }

    // Mover de unmatched a matched en el ticket
    setTickets(ts=>ts.map(t=>{
      if(t.id!==ticketId) return t;
      return {
        ...t,
        matched:[...(t.matched||[]),{rawName:product.rawName, ingredientName:newIng.name, price:product.price, category:newIng.category}],
        unmatched:(t.unmatched||[]).filter(p=>p.id!==productId)
      };
    }));
    setAddModal(null);
    setAddForm({name:'',category:'verduras'});
  };

  const activeTicket=tickets.find(t=>t.id===detail);

  const ticketAtLimit = !isPro && tickets.length >= FREE_TICKET_LIMIT;

  return (
    <div className="fade">
      {!isPro&&<div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
        <span className="text-xs text-amber-700 font-medium">🔒 Plan gratuito · {tickets.length}/{FREE_TICKET_LIMIT} ticket</span>
        <button onClick={()=>onUpgrade('tickets')} className="text-xs font-bold text-teal-600 hover:underline">Desbloquear Pro →</button>
      </div>}
      {/* Zona de arrastrar/subir PDF */}
      <div onDrop={ticketAtLimit?undefined:onDrop} onDragOver={ticketAtLimit?undefined:e=>e.preventDefault()}
        onClick={()=>ticketAtLimit?onUpgrade('tickets'):fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all relative overflow-hidden
          ${ticketAtLimit?'border-gray-200 bg-gray-50':'border-teal-200 hover:bg-teal-50 hover:border-teal-300'}`}>
        {ticketAtLimit&&<div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10">
          <span className="text-4xl mb-2">🔒</span>
          <p className="font-bold text-gray-700 text-sm">Límite alcanzado</p>
          <p className="text-xs text-gray-400 mt-1">Actualiza a Pro para subir más tickets</p>
          <button onClick={e=>{e.stopPropagation();onUpgrade('tickets');}} className="mt-3 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-700">✨ Desbloquear Pro</button>
        </div>}
        <div className="text-4xl mb-2">📤</div>
        <p className="font-semibold text-gray-700 text-sm">Subir ticket en PDF</p>
        <p className="text-xs text-gray-400 mt-1">Mercadona online y Consum · Arrastra o haz clic</p>
        {!pdfjsReady&&<p className="text-xs text-amber-500 mt-1">⏳ Cargando lector PDF...</p>}
        {loading&&ocrProgress===null&&<p className="text-xs text-teal-500 mt-1 animate-pulse">🔄 Procesando ticket...</p>}
        <input ref={fileRef} type="file" accept=".pdf" multiple onChange={onFileChange} className="hidden"/>
      </div>

      {/* Botón foto de ticket — Ultra Chef */}
      {isUltra ? (
        <div className="mt-3">
          <button onClick={()=>cameraRef.current?.click()} disabled={loading}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm transition-all active:scale-95
              ${loading?'bg-gray-200 text-gray-500 cursor-not-allowed':'text-white'}`}
            style={loading?{}:{background:'linear-gradient(135deg,rgba(109,40,217,0.9),rgba(88,28,135,0.95))',boxShadow:'0 4px 16px rgba(109,40,217,0.35)'}}>
            {loading && ocrProgress!==null ? (
              <>
                <span className="animate-spin">⏳</span>
                {ocrProgress===-1
                  ? 'Cargando OCR…'
                  : `Reconociendo texto… ${ocrProgress}%`}
              </>
            ) : (
              <><span style={{fontSize:'1.4rem'}}>📷</span> Foto de ticket · Ultra Chef</>
            )}
          </button>

          {/* Barra de progreso OCR */}
          {ocrProgress!==null && ocrProgress>=0 && (
            <div className="mt-2 bg-amber-100 rounded-full overflow-hidden h-1.5">
              <div className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{width:`${ocrProgress}%`}}/>
            </div>
          )}

          <p className="text-[10px] text-amber-600 text-center mt-1.5 font-medium">
            📱 Abre la cámara y enfoca el ticket — el OCR reconocerá los productos automáticamente
          </p>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onCameraChange} className="hidden"/>
        </div>
      ) : (
        <button onClick={()=>onUpgrade('ultra')}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 border-2 border-dashed border-amber-200 text-amber-600 text-sm font-semibold hover:bg-amber-50 transition-all">
          <span>📷</span> Foto de ticket
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold ml-1">Ultra Chef</span>
        </button>
      )}

      <p className="text-xs text-teal-500 font-medium text-center mt-3 mb-5">Los ingredientes se añaden a la despensa automáticamente</p>

      {/* Lista de tickets procesados */}
      {tickets.length>0&&(
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-gray-400">{tickets.length} ticket{tickets.length>1?'s':''} subido{tickets.length>1?'s':''}</p>
          <button onClick={()=>setConfirm('__all__')} className="text-xs text-rose-400 hover:text-rose-600 border border-rose-200 hover:border-rose-400 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 transition-all" style={{display:'flex',alignItems:'center',gap:6}}>
            <Trash size={14}/> Limpiar todos
          </button>
        </div>
      )}
      {!tickets.length
        ? <div className="text-center py-10 text-gray-300"><div className="text-5xl mb-3"><Receipt size={56}/></div><p className="text-sm">Sin tickets subidos</p></div>
        : <div className="space-y-3">
            {[...tickets].reverse().map(tk=>{
              const matchedCount=(tk.matched||[]).length;
              const unmatchedCount=(tk.unmatched||[]).length;
              return (
                <div key={tk.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Alias editable del supermercado */}
                        {editingAlias===tk.id ? (
                          <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:2}}>
                            <Receipt size={14} color="#94a3b8" style={{flexShrink:0}}/>
                            <input
                              autoFocus
                              value={aliasValue}
                              onChange={e=>setAliasValue(e.target.value)}
                              onBlur={saveAlias}
                              onKeyDown={e=>{if(e.key==='Enter')saveAlias();if(e.key==='Escape')setEditingAlias(null);}}
                              placeholder="Ej: Mercadona, Lidl…"
                              style={{flex:1,fontSize:'0.85rem',fontWeight:600,border:'none',borderBottom:'2px solid #0d9488',outline:'none',background:'transparent',color:'#1e293b',padding:'0 2px',minWidth:0}}
                            />
                            <button onMouseDown={saveAlias} style={{background:'#0d9488',border:'none',borderRadius:6,padding:'2px 6px',cursor:'pointer',display:'flex',alignItems:'center'}}>
                              <Check size={13} color="#fff" weight="bold"/>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={()=>startEditAlias(tk)}
                            style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left',width:'100%',marginBottom:2}}
                          >
                            <Receipt size={14} color="#94a3b8" style={{flexShrink:0}}/>
                            <span style={{fontSize:'0.85rem',fontWeight:700,color:'#1e293b',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {tk.store || tk.filename}
                            </span>
                            <PencilSimple size={12} color="#cbd5e1" style={{flexShrink:0}}/>
                          </button>
                        )}
                        <p className="text-xs text-gray-400">{tk.date} · {(tk.products||[]).length} líneas · <span className="font-medium text-gray-600">{tk.total?.toFixed(2)}€</span></p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={()=>setDetail(tk.id)} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-100 font-medium">Ver</button>
                        <button onClick={()=>setConfirm(tk.id)} className="text-xs text-gray-300 hover:text-rose-400 px-2" style={{display:'flex',alignItems:'center'}}><X size={14}/></button>
                      </div>
                    </div>
                    {/* Resumen de resultados */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {matchedCount>0&&(
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium" style={{display:'flex',alignItems:'center',gap:4}}>
                          {matchedCount} ingrediente{matchedCount>1?'s':''} añadido{matchedCount>1?'s':''}
                        </span>
                      )}
                      {unmatchedCount>0&&(
                        <button onClick={()=>setDetail(tk.id)} className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium hover:bg-amber-200" style={{display:'flex',alignItems:'center',gap:4}}>
                          {unmatchedCount} sin identificar
                        </button>
                      )}
                      {matchedCount===0&&unmatchedCount===0&&(
                        <span className="text-xs text-gray-300">Sin productos detectados</span>
                      )}
                    </div>
                  </div>
                  {/* Ingredientes añadidos - cuadrícula limpia */}
                  {matchedCount>0&&(
                    <div className="border-t border-gray-100 px-4 py-3" style={{background:'#fafafa'}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'2px 8px'}}>
                        {(tk.matched||[]).map((m,i)=>(
                          <span key={i} style={{fontSize:'0.72rem',color:'#475569',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',padding:'2px 0',display:'flex',alignItems:'center',gap:4}}>
                            <span style={{width:4,height:4,borderRadius:'50%',background:'#cbd5e1',flexShrink:0}}/>
                            {m.ingredientName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>}

      {/* Modal de detalle del ticket */}
      <Modal open={!!activeTicket} onClose={()=>setDetail(null)} title={activeTicket?.filename||''} wide>
        {activeTicket&&(
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium text-gray-700 bg-gray-50 rounded-xl p-3">
              <span>📅 {activeTicket.date}</span>
              <span>💶 {activeTicket.total?.toFixed(2)}€</span>
            </div>

            {/* Productos reconocidos */}
            {(activeTicket.matched||[]).length>0&&(
              <div>
                <h3 style={{fontSize:'0.875rem',fontWeight:700,color:'#374151',marginBottom:8}}>Añadidos a la despensa ({activeTicket.matched.length})</h3>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {(activeTicket.matched||[]).map((m,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f0fdf4',borderRadius:10,padding:'8px 12px',border:'1px solid #99f6e4'}}>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_BG[m.category]} ${CAT_TEXT[m.category]}`}>{m.ingredientName}</span>
                        <span style={{fontSize:'0.7rem',color:'#94a3b8',marginLeft:6}}>← {m.rawName}</span>
                      </div>
                      <span style={{fontSize:'0.75rem',fontWeight:600,color:'#374151'}}>{m.price?.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Productos no reconocidos */}
            {(activeTicket.unmatched||[]).length>0&&(
              <div>
                <h3 style={{fontSize:'0.875rem',fontWeight:700,color:'#374151',marginBottom:4}}>Sin identificar ({activeTicket.unmatched.length})</h3>
                <p style={{fontSize:'0.7rem',color:'#94a3b8',marginBottom:10,lineHeight:1.5}}>
                  <strong style={{color:'#374151'}}>Nuevo</strong> crea el ingrediente ·
                  <strong style={{color:'#374151'}}> Asignar</strong> vincula a uno existente ·
                  <strong style={{color:'#374151'}}> Quitar</strong> descarta el producto (limpieza, etc.)
                </p>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {(activeTicket.unmatched||[]).map(prod=>(
                    <div key={prod.id} style={{background:'#fffbeb',borderRadius:14,padding:'10px 12px',border:'1px solid #fde68a'}}>
                      {/* Nombre + precio */}
                      <div style={{marginBottom:8}}>
                        <p style={{fontSize:'0.82rem',fontWeight:600,color:'#374151',marginBottom:1}}>{prod.rawName}</p>
                        <p style={{fontSize:'0.7rem',color:'#94a3b8'}}>{prod.price?.toFixed(2)}€</p>
                      </div>
                      {/* Botones en fila */}
                      <div style={{display:'flex',gap:6}}>
                        <button
                          onClick={()=>{
                            const suggested=(prod.normalizedName||prod.rawName).toLowerCase().trim();
                            setAddForm({name:suggested, category:'verduras'});
                            setAddModal({ticketId:activeTicket.id, productId:prod.id});
                          }}
                          style={{flex:1,fontSize:'0.72rem',padding:'6px 4px',borderRadius:8,fontWeight:700,border:'none',cursor:'pointer',background:'#10b981',color:'#fff'}}>
                          Nuevo
                        </button>
                        <button
                          onClick={()=>{setMapModal({ticketId:activeTicket.id,productId:prod.id});setMapTarget('');}}
                          style={{flex:1,fontSize:'0.72rem',padding:'6px 4px',borderRadius:8,fontWeight:700,border:'none',cursor:'pointer',background:'#f59e0b',color:'#fff'}}>
                          Asignar
                        </button>
                        <button
                          onClick={()=>dismissUnmatched(activeTicket.id,prod.id)}
                          style={{flex:1,fontSize:'0.72rem',padding:'6px 4px',borderRadius:8,fontWeight:700,border:'1px solid #e2e8f0',cursor:'pointer',background:'#f8fafc',color:'#64748b',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal: añadir nuevo ingrediente al catálogo */}
      <Modal open={!!addModal} onClose={()=>setAddModal(null)} title="Añadir al catálogo">
        <div className="space-y-4">
          {addModal&&(()=>{
            const tk=tickets.find(t=>t.id===addModal.ticketId);
            const prod=tk?.unmatched?.find(p=>p.id===addModal.productId);
            return prod?(<>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-xs text-gray-400 mb-0.5">Producto del ticket</p>
                <p className="text-sm font-semibold text-gray-800">{prod.rawName}</p>
                <p className="text-xs text-gray-400">{prod.price?.toFixed(2)}€ · {tk.date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">¿Cómo se llama en tu despensa?</label>
                <input
                  value={addForm.name}
                  onChange={e=>setAddForm(f=>({...f,name:e.target.value}))}
                  placeholder="ej: calabacín, atún, pasta..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  style={{fontSize:'16px'}}
                  onKeyDown={e=>e.key==='Enter'&&applyAddToCatalog()}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Usa un nombre genérico para que el ticket lo reconozca en el futuro</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
                <select value={addForm.category} onChange={e=>setAddForm(f=>({...f,category:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  {CATEGORIES.map(c=><option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                </select>
              </div>
              <button onClick={applyAddToCatalog} disabled={!addForm.name.trim()}
                className="w-full rounded-xl py-3 text-sm font-bold transition-all"
                style={addForm.name.trim()
                  ? {background:'#0d9488',color:'#fff',boxShadow:'0 2px 8px rgba(13,148,136,.25)'}
                  : {background:'#e5e7eb',color:'#9ca3af',cursor:'not-allowed'}}>
                Añadir a la despensa y marcar disponible
              </button>
              <p className="text-xs text-gray-300 text-center">El precio ({prod.price?.toFixed(2)}€) se guardará en el historial automáticamente</p>
            </>):null;
          })()}
        </div>
      </Modal>

      {/* Modal mapeo manual — con buscador */}
      <Modal open={!!mapModal} onClose={()=>{setMapModal(null);setMapTarget('');setMapSearch('');}} title="Asignar a ingrediente">
        <div className="space-y-3">
          {mapModal&&(()=>{
            const tk=tickets.find(t=>t.id===mapModal.ticketId);
            const prod=tk?.unmatched?.find(p=>p.id===mapModal.productId);
            const filtered=ingredients
              .filter(i=>!mapSearch||i.name.includes(mapSearch.toLowerCase().trim()))
              .sort((a,b)=>a.name.localeCompare(b.name,'es'));
            return prod?(<>
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-xs text-gray-400 mb-0.5">Producto del ticket</p>
                <span className="font-semibold text-gray-800">{prod.rawName}</span>
                <span className="text-gray-400 text-xs ml-2">{prod.price?.toFixed(2)}€</span>
              </div>
              {/* Buscador */}
              <input
                value={mapSearch}
                onChange={e=>{setMapSearch(e.target.value);setMapTarget('');}}
                placeholder="Buscar ingrediente..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-200"
                style={{fontSize:'16px'}}
                autoFocus
              />
              {/* Lista filtrada */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  {filtered.length===0
                    ?<p className="text-center text-gray-300 text-sm py-6">Sin resultados para "{mapSearch}"</p>
                    :filtered.map(ing=>(
                      <button key={ing.id} onClick={()=>setMapTarget(ing.name)}
                        className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-all border-b border-gray-50 last:border-0
                          ${mapTarget===ing.name?'bg-teal-600 text-white':'hover:bg-gray-50 text-gray-700'}`}>
                        <span className={`text-sm shrink-0 ${mapTarget===ing.name?'opacity-80':''}`}>{CAT_EMOJI[ing.category]}</span>
                        <span className="text-sm font-medium">{ing.name}</span>
                        {mapTarget===ing.name&&<span className="ml-auto text-xs opacity-80">seleccionado</span>}
                      </button>
                    ))
                  }
                </div>
              </div>
              <button onClick={applyManualMap} disabled={!mapTarget}
                className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                style={mapTarget
                  ? {background:'#0d9488',color:'#fff'}
                  : {background:'#e5e7eb',color:'#9ca3af',cursor:'not-allowed'}}>
                {mapTarget?`Asignar a "${mapTarget}"` :'Selecciona un ingrediente'}
              </button>
            </>):null;
          })()}
        </div>
      </Modal>

      <Confirm open={!!confirm} msg={confirm==='__all__'?'¿Eliminar todos los tickets? El historial de precios se mantendrá.':'¿Eliminar este ticket? El historial de precios asociado se mantendrá.'} onOk={()=>deleteTicket(confirm)} onCancel={()=>setConfirm(null)}/>
    </div>
  );
}

/* ═══════════════════════════════════════
   LISTA DE LA COMPRA
═══════════════════════════════════════ */

