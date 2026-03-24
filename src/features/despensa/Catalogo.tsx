// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Confirm } from '../../components/ui/Confirm';
import { NutritionLabelModal } from '../../components/ui/NutritionLabelModal';
import { uid } from '../../utils/helpers';
import { CAT_BG, CAT_TEXT, CAT_EMOJI, CATEGORIES, getIngEmoji } from '../../data/categories';
import type { Ingredient, NutriPer100 } from '../../data/types';

export function Catalogo({ingredients,setIngredients,isUltra}) {
  const [catFilter,setCatFilter] = useState('todos');
  const [stateFilter,setStateFilter] = useState('todos');
  const [search,setSearch] = useState('');
  const [addModal,setAddModal] = useState(false);
  const [newIng,setNewIng] = useState({name:'',category:'verduras'});
  const [confirm,setConfirm] = useState(null);
  const [nutriModal,setNutriModal] = useState<string|null>(null); // ingredient id

  const toggle = id => setIngredients(ings => ings.map(i =>
    i.id===id ? {...i, available:!i.available, needed:i.available?false:i.needed} : i
  ));
  const toggleNeeded = (e,id) => {
    e.stopPropagation();
    setIngredients(ings => ings.map(i =>
      i.id===id ? {...i, needed:!i.needed, available:i.needed?i.available:false} : i
    ));
  };
  const addIng = () => {
    if(!newIng.name.trim()) return;
    setIngredients(ings=>[...ings,{id:'i'+uid(),name:newIng.name.trim(),category:newIng.category,available:false,needed:false}]);
    setNewIng({name:'',category:'verduras'}); setAddModal(false);
  };
  const markAll = v => setIngredients(ings=>ings.map(i=>({...i,available:v,needed:v?false:i.needed})));

  const avail = ingredients.filter(i=>i.available).length;
  const miss  = ingredients.filter(i=>i.needed).length;

  const filtered = useMemo(()=>ingredients.filter(i=>{
    if(catFilter!=='todos' && i.category!==catFilter) return false;
    if(stateFilter==='disponible' && !i.available) return false;
    if(stateFilter==='falta' && !i.needed) return false;
    if(search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[ingredients,catFilter,stateFilter,search]);

  const catsWithItems = ['todos', ...CATEGORIES.filter(c=>ingredients.some(i=>i.category===c))];

  return (
    <div className="fade-in">

      {/* ── Header stats ── */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 leading-none mb-1" style={{letterSpacing:'-0.02em'}}>
          Mi despensa 🧺
        </h1>
        <p className="text-sm text-gray-400">
          <span className="font-bold text-green-600">{avail}</span> disponibles
          {miss>0 && <> · <span className="font-bold text-amber-500">{miss}</span> por comprar</>}
          {' '}· <span className="text-gray-400">{ingredients.length} total</span>
        </p>
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{background:'#e2e8f0'}}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{width:ingredients.length?`${Math.round(avail/ingredients.length*100)}%`:'0%',
            background:'linear-gradient(90deg,#16a34a,#86efac)'}}/>
        </div>
      </div>

      {/* ── Search + add ── */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar ingrediente..."
            className="w-full bg-white rounded-2xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            style={{border:'1px solid #e2e8f0'}}/>
        </div>
        <button onClick={()=>setAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-bold"
          style={{background:'#16a34a',color:'#fff',boxShadow:'0 2px 8px rgba(22,163,74,.3)'}}>
          ➕ Añadir
        </button>
      </div>

      {/* ── State filter pills ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5 p-1 rounded-2xl" style={{background:'#f1f5f9'}}>
          {[['todos','Todos'],['disponible','✓ Tengo'],['falta','🛒 Falta']].map(([f,l])=>(
            <button key={f} onClick={()=>setStateFilter(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: stateFilter===f ? '#16a34a' : 'transparent',
                color: stateFilter===f ? '#fff' : '#94a3b8',
                boxShadow: stateFilter===f ? '0 1px 4px rgba(22,163,74,.25)' : 'none',
              }}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={()=>markAll(true)} className="text-xs px-2.5 py-1.5 rounded-xl font-semibold"
            style={{background:'#f0fdf4',color:'#16a34a',border:'1px solid #bbf7d0'}}>✓ Todo</button>
          <button onClick={()=>markAll(false)} className="text-xs px-2.5 py-1.5 rounded-xl font-semibold"
            style={{background:'#f8fafc',color:'#94a3b8',border:'1px solid #e2e8f0'}}>✗ Vacío</button>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
        {catsWithItems.map(cat=>(
          <button key={cat} onClick={()=>setCatFilter(cat)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: catFilter===cat ? '#16a34a' : '#fff',
              color: catFilter===cat ? '#fff' : '#64748b',
              border: catFilter===cat ? 'none' : '1px solid #e2e8f0',
              boxShadow: catFilter===cat ? '0 2px 8px rgba(22,163,74,.28)' : 'none',
            }}>
            {cat==='todos' ? '🌿 Todos' : `${CAT_EMOJI[cat]} ${cat}`}
          </button>
        ))}
      </div>

      {/* ── Ingredient chips ── */}
      {!filtered.length
        ? <div className="text-center text-gray-300 py-12 text-sm">Sin resultados</div>
        : <div className="grid grid-cols-3 gap-2.5">
            {filtered.map(ing=>{
              const cat=ing.category;
              return (
                <div key={ing.id} className="relative" style={{userSelect:'none'}}>
                  <button onClick={()=>toggle(ing.id)}
                    className="relative w-full flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: ing.available ? '#f0fdf4' : '#fff',
                      border: ing.available ? '2px solid #86efac' : '1px solid #e8edf2',
                      boxShadow: ing.available ? '0 3px 10px rgba(22,163,74,.18)' : '0 2px 8px rgba(0,0,0,.08)',
                    }}>
                    {ing.available && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{background:'#16a34a',fontSize:'0.5rem',color:'#fff',fontWeight:800}}>✓</div>
                    )}
                    <span style={{fontSize:'1.75rem',lineHeight:1,marginBottom:5}}>
                      {getIngEmoji(ing.name,cat)}
                    </span>
                    <span className="text-center leading-tight font-semibold"
                      style={{
                        fontSize:'0.62rem',
                        color: ing.available ? '#15803d' : '#94a3b8',
                        wordBreak:'break-word',
                        maxHeight:'2.4em',
                        overflow:'hidden',
                      }}>
                      {ing.name}
                    </span>
                  </button>

                  {/* Cart badge */}
                  <button onClick={e=>toggleNeeded(e,ing.id)}
                    title={ing.needed?'Quitar de la lista':'Añadir a la compra'}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-all active:scale-90"
                    style={{
                      background: ing.needed ? '#f59e0b' : '#f1f5f9',
                      fontSize:'0.75rem',
                    }}>
                    🛒
                  </button>

                  {/* Nutrition label button (Ultra) */}
                  {isUltra && (
                    <button onClick={e=>{e.stopPropagation();setNutriModal(ing.id);}}
                      title="Leer etiqueta nutricional"
                      className="absolute -bottom-1.5 right-6 w-5 h-5 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110"
                      style={{background: ing.nutri ? '#dcfce7' : '#fff', border:`1px solid ${ing.nutri?'#86efac':'#e2e8f0'}`, fontSize:'0.55rem'}}>
                      📊
                    </button>
                  )}

                  {/* Nutri mini badge */}
                  {ing.nutri && (
                    <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',background:'#16a34a',color:'#fff',fontSize:'0.48rem',fontWeight:800,padding:'1px 5px',borderRadius:6,whiteSpace:'nowrap',pointerEvents:'none'}}>
                      {ing.nutri.kcal}kcal
                    </div>
                  )}

                  {/* Delete */}
                  <button onClick={e=>{e.stopPropagation();setConfirm(ing.id);}}
                    className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm transition-all hover:bg-red-50"
                    style={{border:'1px solid #e2e8f0',fontSize:'0.6rem',color:'#cbd5e1'}}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
      }

      {/* ── Modal añadir ── */}
      <Modal open={addModal} onClose={()=>setAddModal(false)} title="🌿 Nuevo ingrediente">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Nombre</label>
            <input value={newIng.name} onChange={e=>setNewIng(n=>({...n,name:e.target.value}))}
              placeholder="ej: calabaza"
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-200"
              style={{border:'2px solid #e2e8f0',background:'#f8fafc'}}
              autoFocus onKeyDown={e=>e.key==='Enter'&&addIng()}/>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Categoría</label>
            <select value={newIng.category} onChange={e=>setNewIng(n=>({...n,category:e.target.value}))}
              className="w-full rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              style={{border:'2px solid #e2e8f0',background:'#f8fafc'}}>
              {CATEGORIES.map(c=><option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
            </select>
          </div>
          <button onClick={addIng}
            className="w-full rounded-2xl py-4 text-sm font-bold"
            style={{background:'#16a34a',color:'#fff',boxShadow:'0 4px 16px rgba(22,163,74,.35)'}}>
            Añadir a mi despensa →
          </button>
        </div>
      </Modal>

      <Confirm open={!!confirm} msg="¿Eliminar este ingrediente del catálogo?"
        onOk={()=>{setIngredients(ings=>ings.filter(i=>i.id!==confirm));setConfirm(null);}}
        onCancel={()=>setConfirm(null)}/>

      {nutriModal && (()=>{
        const ing=ingredients.find(i=>i.id===nutriModal);
        if(!ing) return null;
        return (
          <NutritionLabelModal
            ingName={ing.name}
            existing={ing.nutri}
            onSave={(nutri:NutriPer100|null)=>{
              setIngredients(ings=>ings.map(i=>i.id===nutriModal?{...i,nutri:nutri??undefined}:i));
              setNutriModal(null);
            }}
            onClose={()=>setNutriModal(null)}
          />
        );
      })()}
    </div>
  );
}
