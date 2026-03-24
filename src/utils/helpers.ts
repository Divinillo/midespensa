// @ts-nocheck
import { NORM_RULES } from '../data/norms';

export function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
export function fmt2(n) { return String(n).padStart(2,'0'); }
export function dateKey(y,m,d) { return `${y}-${fmt2(m+1)}-${fmt2(d)}`; }
export function getDays(y,m) { return new Date(y,m+1,0).getDate(); }
export function getFirstWD(y,m) { let d=new Date(y,m,1).getDay(); return d===0?6:d-1; }

export function normalizeName(raw) {
  const s = raw.trim();
  for (const [pat, name] of NORM_RULES) if (pat.test(s)) return name;
  return null;
}

