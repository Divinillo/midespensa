// @ts-nocheck
import { NORM_RULES, NORM_RULES_US } from '../data/norms';

export function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
export function fmt2(n) { return String(n).padStart(2,'0'); }
export function dateKey(y,m,d) { return `${y}-${fmt2(m+1)}-${fmt2(d)}`; }
export function getDays(y,m) { return new Date(y,m+1,0).getDate(); }
export function getFirstWD(y,m) { let d=new Date(y,m,1).getDay(); return d===0?6:d-1; }

// Prefixes/keywords that indicate a COMPOSITE/PROCESSED product —
// these should NOT be normalized to a raw ingredient even if they contain one.
const COMPOSITE_ES = /\b(bizc|bizcocho|tarta|galleta|pastel|magdalena|croissan|bolleri|donut|snack|pizza|bocata|bocad|bocadillo|helado|sorbete|salsa|caldo|crema\s+de|sopa|zumo|mermelada|confitura|conserva|precocinado|preparado|empanada|croqueta|nugget|lasaña|canelone|burrito)\b/i;
const COMPOSITE_US = /\b(cake|pie|cookie|muffin|donut|croissant|pastry|pizza|sandwich|ice\s*cream|sorbet|sauce|broth|soup|juice|jam|jelly|preserv|frozen\s+meal|nugget|burrito|lasagna|potpie|snack|chips|crackers|cereal|granola\s+bar)\b/i;

export function normalizeName(raw, isUS = false) {
  const s = raw.trim();
  // Reject composite/processed products: they contain ingredient names
  // but are NOT the ingredient itself (e.g. "BIZC.TRAD.ZANAHORIA" ≠ zanahoria)
  const compositePat = isUS ? COMPOSITE_US : COMPOSITE_ES;
  if (compositePat.test(s)) return null;
  const rules = isUS ? NORM_RULES_US : NORM_RULES;
  for (const [pat, name] of rules) if (pat.test(s)) return name;
  return null;
}

