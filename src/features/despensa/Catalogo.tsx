// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Confirm } from '../../components/ui/Confirm';
import { uid } from '../../utils/helpers';
import { CAT_EMOJI, CATEGORIES, getIngEmoji, CAT_BG, CAT_TEXT } from '../../data/categories';
import { useLS } from '../../hooks/useLS';
import type { Ingredient } from '../../data/types';

/* ── Paleta pastel por categoría ───────────────────────────────── */
const CAT_PASTEL: Record<string, { bg: string; border: string; accent: string }> = {
  'carnes':                { bg: '#fde8e5', border: '#f5b0a0', accent: '#b83025' },
  'pescado':               { bg: '#e4f0fd', border: '#93c5ef', accent: '#1a5fa8' },
  'verduras':              { bg: '#e5f7ea', border: '#5eead4', accent: '#0f766e' },
  'legumbres':             { bg: '#fef3c7', border: '#fcd34d', accent: '#a16207' },
  'lácteos':               { bg: '#fef9c3', border: '#fde68a', accent: '#d97706' },
  'pasta y harinas':       { bg: '#fff0e5', border: '#fbbf87', accent: '#c2510e' },
  'conservas':             { bg: '#e8f5ee', border: '#a7d9b8', accent: '#134e4a' },
  'fruta':                 { bg: '#fde8ed', border: '#f9a8c0', accent: '#be123c' },
  'bebidas':               { bg: '#eaefff', border: '#a5b4fc', accent: '#3730a3' },
  'congelados':            { bg: '#e4f5fd', border: '#7dd3fc', accent: '#0369a1' },
  'bollería y dulces':     { bg: '#fefce8', border: '#fde047', accent: '#a16207' },
  'snacks y aperitivos':   { bg: '#fef8e5', border: '#fcd98a', accent: '#b45309' },
  'especias y condimentos':{ bg: '#f5f0eb', border: '#d4b896', accent: '#78350f' },
};
const DEFAULT_PASTEL = { bg: '#f1f5f9', border: '#cbd5e1', accent: '#475569' };

/* ════════════════════════════════════════════════════════════════
   TARJETA DE INGREDIENTE
   mode: 'catalog' | 'cart' | 'pantry' | 'recent'
   - catalog → tap = añadir a la compra (needed)
   - cart    → tap = comprado, pasa a despensa (available)
   - pantry  → tap = retirar de despensa
   - recent  → readOnly, sin borrar
════════════════════════════════════════════════════════════════ */
function IngCard({ ing, onToggle, onDelete, mode = 'catalog' }) {
  const pal   = CAT_PASTEL[ing.category] || DEFAULT_PASTEL;
  const emoji = getIngEmoji(ing.name, ing.category);

  // Colores según sección
  let bg     = pal.bg;
  let border = '1.5px solid ' + pal.border;
  let nameColor = pal.accent;

  if (mode === 'cart') {
    bg = '#fffbeb'; border = '2px solid #f59e0b'; nameColor = '#b45309';
  } else if (mode === 'pantry') {
    bg = '#f0fdf4'; border = '1.5px solid #5eead4'; nameColor = '#0f766e';
  }

  // Icono de indicación en esquina superior derecha según modo
  const actionIcon = mode === 'catalog' ? 'cart'
                   : mode === 'cart'    ? 'check'
                   : mode === 'pantry'  ? 'pantry'
                   : null;

  const actionBg = mode === 'catalog' ? '#fff'
                 : mode === 'cart'    ? '#f59e0b'
                 : mode === 'pantry'  ? '#0d9488'
                 : null;

  const actionBorder = mode === 'catalog' ? '#e2e8f0'
                     : mode === 'cart'    ? '#fbbf24'
                     : mode === 'pantry'  ? '#5eead4'
                     : null;

  const actionColor = (mode === 'cart' || mode === 'pantry') ? '#fff' : '#94a3b8';

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <button
        onClick={() => onToggle(ing.id)}
        style={{
          width: '100%', aspectRatio: '1 / 1',
          borderRadius: 16, border,
          background: bg,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: '8px 4px 7px',
          boxShadow: '0 1px 4px rgba(0,0,0,.07)',
          transition: 'transform .12s',
          position: 'relative', overflow: 'hidden',
        }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(.93)'; }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {/* Emoji */}
        <span style={{ fontSize: '2rem', lineHeight: 1, marginBottom: 5 }}>
          {emoji}
        </span>

        {/* Nombre */}
        <span style={{
          fontSize: '0.6rem', fontWeight: 700,
          color: nameColor,
          textAlign: 'center', lineHeight: 1.25,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word',
          padding: '0 3px',
        }}>
          {ing.name}
        </span>
      </button>

      {/* Icono de acción — esquina superior derecha */}
      {actionIcon && (
        <div style={{
          position: 'absolute', top: -7, right: -7,
          width: 22, height: 22, borderRadius: '50%',
          background: actionBg,
          border: '2px solid ' + actionBorder,
          boxShadow: '0 1px 4px rgba(0,0,0,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: actionColor,
          pointerEvents: 'none',
          zIndex: 2,
        }}>
          {actionIcon === 'cart' ? <ShoppingCart size={12} weight="fill"/> : actionIcon === 'check' ? '✓' : <Basket size={12} weight="fill"/>}
        </div>
      )}

      {/* ✕ Borrar — esquina inferior izquierda (solo en catalog y pantry) */}
      {(mode === 'catalog' || mode === 'pantry') && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(ing.id); }}
          style={{
            position: 'absolute', bottom: -6, left: -6,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff', border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8', cursor: 'pointer', zIndex: 2, padding: 0
          }}
        >×</button>
      )}
    </div>
  );
}

/* ── Cabecera de sección colapsable ────────────────────────────── */
import { MagnifyingGlass, Basket, ShoppingCart } from '@phosphor-icons/react';

function SectionHeader({ label, count, isCollapsed, onToggle, badge }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 2px', background: 'none', border: 'none',
        borderBottom: '1.5px solid #f1f5f9', cursor: 'pointer',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badge}
        <span style={{
          fontSize: '1.1rem', color: '#cbd5e1', fontWeight: 300,
          display: 'inline-block',
          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          transition: 'transform .2s', lineHeight: 1,
        }}>›</span>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   CATÁLOGO PRINCIPAL
════════════════════════════════════════════════════════════════ */
export function Catalogo({ ingredients, setIngredients, isPro }) {
  const [recentIds, setRecentIds] = useLS<string[]>('despensa_recent_v1', []);
  const [search, setSearch]       = useState('');
  const [addModal, setAddModal]   = useState(false);
  const [newIng, setNewIng]       = useState({ name: '', category: 'verduras' });
  const [confirm, setConfirm]     = useState(null);
  // Secciones colapsadas: 'acomprar' | 'recientes' | cat name
  // Categorías empiezan colapsadas (true), secciones especiales expandidas (false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { recientes: false };
    CATEGORIES.forEach(cat => { init[cat] = true; });
    return init;
  });

  const toggleSection = (key: string) =>
    setCollapsed(c => ({ ...c, [key]: !c[key] }));

  /* ── Acciones (flujo Bring) ────────────────────────────────── */
  // Catálogo → tap = añadir a la lista de la compra
  const addToCart = (id: string) => {
    setIngredients(ings => ings.map(i =>
      i.id === id ? { ...i, needed: true, available: false } : i
    ));
    setRecentIds(ids => [id, ...ids.filter(x => x !== id)].slice(0, 20));
  };

  // "A comprar" → tap = comprado, pasa a despensa
  const markBought = (id: string) => {
    setIngredients(ings => ings.map(i =>
      i.id === id ? { ...i, available: true, needed: false } : i
    ));
    setRecentIds(ids => [id, ...ids.filter(x => x !== id)].slice(0, 20));
  };

  // "En despensa" → tap = retirar (se ha usado / se ha acabado)
  const removeFromPantry = (id: string) => {
    setIngredients(ings => ings.map(i =>
      i.id === id ? { ...i, available: false, needed: false } : i
    ));
  };

  const addIng = () => {
    if (!newIng.name.trim()) return;
    setIngredients(ings => [...ings, {
      id: 'i' + uid(),
      name: newIng.name.trim().toLowerCase(),
      category: newIng.category,
      available: false, needed: false,
    }]);
    setNewIng({ name: '', category: 'verduras' });
    setAddModal(false);
  };

  /* ── Datos derivados ───────────────────────────────────────── */
  const searchActive = search.trim().length > 0;
  // Normaliza quitando tildes/diacríticos → búsqueda sin acento (brocoli → brócoli, etc.)
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const searchNorm   = norm(search);

  const neededIngs   = useMemo(() => ingredients.filter(i => i.needed),   [ingredients]);
  const availableIngs = useMemo(() => ingredients.filter(i => i.available), [ingredients]);
  // Registro permanente: orden histórico, sin filtrar por estado actual
  const recentIngs  = useMemo(() =>
    recentIds.map(id => ingredients.find(i => i.id === id)).filter(Boolean).slice(0, 20),
    [recentIds, ingredients]
  );
  const byCategory  = useMemo(() =>
    CATEGORIES
      .filter(c => ingredients.some(i => i.category === c))
      .map(cat => ({
        cat,
        items: ingredients.filter(i =>
          i.category === cat &&
          (!searchActive || norm(i.name).includes(searchNorm))
        ),
      }))
      .filter(({ items }) => items.length > 0),
    [ingredients, searchActive, searchNorm]
  );

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div style={{ paddingBottom: 32 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1e293b', letterSpacing: '-0.02em', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Basket size={28} weight="fill" color="#0f766e"/> Mi despensa
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Buscador */}
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}><MagnifyingGlass size={16}/></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar ingrediente…"
              style={{
                width: '100%', boxSizing: 'border-box',
                borderRadius: 12, border: '1.5px solid #e2e8f0',
                background: '#f8fafc', padding: '9px 12px 9px 32px',
                fontSize: '16px', outline: 'none', color: '#1e293b',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
              >×</button>
            )}
          </div>
          {/* Botón añadir */}
          <button
            onClick={() => setAddModal(true)}
            style={{
              width: 40, height: 40, borderRadius: 13, flexShrink: 0,
              background: '#0d9488', color: '#fff', border: 'none',
              fontSize: '1.6rem', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 10px rgba(13,148,136,.35)',
            }}
          >+</button>
        </div>
      </div>

      {/* ══ 1. A COMPRAR ═══════════════════════════════════════ */}
      {!searchActive && neededIngs.length > 0 && (
        <section style={{ marginBottom: 8 }}>
          <SectionHeader
            label="A comprar"
            isCollapsed={collapsed['acomprar']}
            onToggle={() => toggleSection('acomprar')}
            badge={
              <span style={{
                fontSize: '0.65rem', fontWeight: 800,
                background: '#fff7ed', color: '#c2510e',
                border: '1px solid #fed7aa',
                padding: '2px 8px', borderRadius: 20,
              }}>
                {neededIngs.length}
              </span>
            }
          />
          {!collapsed['acomprar'] && (
            <>
              <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '4px 0 10px', fontStyle: 'italic' }}>
                Toca cuando lo hayas comprado →
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, paddingBottom: 8 }}>
                {neededIngs.map(ing => (
                  <IngCard key={ing.id} ing={ing} onToggle={markBought} onDelete={setConfirm} mode="cart" />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ══ 2. UTILIZADOS RECIENTEMENTE ════════════════════════ */}
      {!searchActive && recentIngs.length > 0 && (
        <section style={{ marginBottom: 8 }}>
          <SectionHeader
            label="Utilizados recientemente"
            isCollapsed={collapsed['recientes']}
            onToggle={() => toggleSection('recientes')}
            badge={null}
          />
          {!collapsed['recientes'] && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, paddingTop: 12, paddingBottom: 8 }}>
              {recentIngs.map(ing => (
                <IngCard key={ing.id} ing={ing} onToggle={addToCart} onDelete={setConfirm} mode="recent" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══ 3. EN DESPENSA ═════════════════════════════════════ */}
      {!searchActive && availableIngs.length > 0 && (
        <section style={{ marginBottom: 8 }}>
          <SectionHeader
            label="En despensa"
            isCollapsed={collapsed['endespensa']}
            onToggle={() => toggleSection('endespensa')}
            badge={
              <span style={{
                fontSize: '0.65rem', fontWeight: 800,
                background: '#f0fdf4', color: '#0f766e',
                border: '1px solid #99f6e4',
                padding: '2px 8px', borderRadius: 20,
              }}>
                {availableIngs.length}
              </span>
            }
          />
          {!collapsed['endespensa'] && (
            <>
              <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '4px 0 10px', fontStyle: 'italic' }}>
                Toca cuando lo hayas usado →
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, paddingBottom: 8 }}>
                {availableIngs.map(ing => (
                  <IngCard key={ing.id} ing={ing} onToggle={removeFromPantry} onDelete={setConfirm} mode="pantry" />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ══ 4. SECCIONES POR CATEGORÍA ═════════════════════════ */}
      {byCategory.map(({ cat, items }) => {
        const isCollapsed = collapsed[cat] !== false;
        // Filtrar en catalog: no mostrar los que ya están en "A comprar" o "En despensa"
        const catalogItems = items.filter(i => !i.needed && !i.available);
        if (catalogItems.length === 0 && isCollapsed) return null;
        return (
          <section key={cat} style={{ marginBottom: 4 }}>
            <SectionHeader
              label={`${CAT_EMOJI[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
              isCollapsed={isCollapsed}
              onToggle={() => toggleSection(cat)}
              badge={null}
            />
            {!isCollapsed && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, paddingTop: 12, paddingBottom: 8 }}>
                {catalogItems.map(ing => (
                  <IngCard key={ing.id} ing={ing} onToggle={addToCart} onDelete={setConfirm} mode="catalog" />
                ))}
                {catalogItems.length === 0 && (
                  <p style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                    Todos los productos de esta categoría están en la lista o en la despensa
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}

      {searchActive && byCategory.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MagnifyingGlass size={56}/></div>
          <p style={{ fontSize: '0.85rem' }}>Sin resultados para "<strong>{search}</strong>"</p>
        </div>
      )}

      {!searchActive && ingredients.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#cbd5e1' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Basket size={64} weight="fill" color="#cbd5e1"/></div>
          <p style={{ fontSize: '0.9rem' }}>Sin ingredientes aún.<br/>Pulsa <strong>+</strong> para añadir.</p>
        </div>
      )}

      {/* ── Modal añadir ── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Nuevo ingrediente">
        <div className="space-y-4">
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              Nombre
            </label>
            <input
              value={newIng.name}
              onChange={e => setNewIng(n => ({ ...n, name: e.target.value }))}
              placeholder="ej: calabaza"
              style={{ width: '100%', borderRadius: 14, padding: '12px 16px', fontSize: '16px', fontWeight: 500, border: '2px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && addIng()}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              Categoría
            </label>
            <select
              value={newIng.category}
              onChange={e => setNewIng(n => ({ ...n, category: e.target.value }))}
              style={{ width: '100%', borderRadius: 14, padding: '12px 16px', fontSize: '16px', border: '2px solid #e2e8f0', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addIng}
            style={{ width: '100%', borderRadius: 14, padding: '14px', fontSize: '0.9rem', fontWeight: 800, border: 'none', background: '#0d9488', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 16px rgba(13,148,136,.35)' }}
          >
            Añadir a mi despensa →
          </button>
        </div>
      </Modal>

      <Confirm
        open={!!confirm}
        msg="¿Eliminar este ingrediente del catálogo?"
        onOk={() => { setIngredients(ings => ings.filter(i => i.id !== confirm)); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
