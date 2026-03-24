// @ts-nocheck
/**
 * nutriReader.ts
 * ─────────────
 * Reads a nutrition-facts label photo using Tesseract.js (already used for ticket OCR)
 * and parses EU-format nutrition tables (Spanish / English).
 *
 * Returns NutriPer100 values (per 100g / 100ml) which map directly to Ingredient.nutri.
 */

import type { NutriPer100 } from '../data/types';

declare const window: any;

/* ── Load Tesseract.js from CDN (same version as ticketProcess) ─── */
async function loadTesseract(): Promise<void> {
  if (window.Tesseract) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Tesseract.'));
    document.head.appendChild(s);
  });
}

/* ── Enhance image for OCR (grayscale + contrast) ─────────────── */
async function enhanceImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        const r = Math.min(MAX / w, MAX / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.05)';
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; }
        resolve(new File([blob], file.name, { type: 'image/png' }));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ── Run OCR ───────────────────────────────────────────────────── */
async function runOCR(file: File, onProgress?: (n: number) => void): Promise<string> {
  await loadTesseract();
  const worker = window.Tesseract.createWorker({
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/worker.min.js',
    langPath:   'https://tessdata.projectnaptha.com/4.0.0',
    corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@2.2.0/tesseract-core.wasm.js',
    logger: (m: any) => { if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100)); },
  });
  await worker.load();
  await worker.loadLanguage('spa+eng');
  await worker.initialize('spa+eng');
  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();
  return text;
}

/* ── Helpers ───────────────────────────────────────────────────── */
/** Extract first numeric value (allows comma as decimal separator) */
function num(s: string): number | null {
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(',', '.'));
}

/** Find a line containing any of the given keywords and extract its first number */
function findVal(lines: string[], keywords: RegExp): number | null {
  for (const line of lines) {
    if (keywords.test(line)) {
      const v = num(line);
      if (v !== null) return v;
    }
  }
  return null;
}

/* ── Parse EU nutrition label text ────────────────────────────── */
export function parseNutritionText(text: string): Partial<NutriPer100> {
  // Normalise: lower-case, collapse whitespace, split into lines
  const lines = text
    .toLowerCase()
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0);

  const result: Partial<NutriPer100> = {};

  // Energy / Energía — pick the kcal value (not kJ)
  // Look for line with "kcal" or "caloría"
  const kcalLine = lines.find(l => /kcal|caloría|caloria/.test(l));
  if (kcalLine) {
    const v = num(kcalLine);
    if (v !== null) result.kcal = Math.round(v);
  }
  // Fallback: line with "energía" or "energia" — may contain "kJ ... kcal"
  if (!result.kcal) {
    const eLines = lines.filter(l => /energ[ií]a|valor energético|energy/.test(l));
    for (const el of eLines) {
      // Find all numbers; if there's a kJ/kcal pattern prefer the smaller (kcal)
      const nums = [...el.matchAll(/(\d+(?:[.,]\d+)?)/g)].map(m => parseFloat(m[1].replace(',', '.')));
      if (nums.length >= 2) { result.kcal = Math.round(Math.min(...nums)); break; }
      if (nums.length === 1) { result.kcal = Math.round(nums[0]); break; }
    }
  }

  // Fat / Grasas totales
  result.fat = findVal(lines, /^grasas$|^grasas totales|^total fat|^fat$/) ?? undefined;

  // Saturated fat / Ácidos grasos saturados
  result.saturates = findVal(lines, /saturad|satur/) ?? undefined;

  // Carbohydrates / Hidratos de carbono
  result.carbs = findVal(lines, /hidratos|carbohidrat|carbohydrate/) ?? undefined;

  // Sugars / Azúcares
  result.sugar = findVal(lines, /az[uú]cares|sugars/) ?? undefined;

  // Protein / Proteínas
  result.prot = findVal(lines, /prote[ií]nas?|protein/) ?? undefined;

  // Fibre / Fibra
  result.fiber = findVal(lines, /fibra|fibre|fiber/) ?? undefined;

  // Salt / Sal
  result.salt = findVal(lines, /^sal$|^sal /) ?? undefined;

  return result;
}

/* ── Public API ─────────────────────────────────────────────────── */
export async function readNutritionLabel(
  file: File,
  onProgress?: (n: number) => void,
): Promise<Partial<NutriPer100>> {
  const enhanced = await enhanceImage(file);
  const text = await runOCR(enhanced, onProgress);
  return parseNutritionText(text);
}
