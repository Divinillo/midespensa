// @ts-nocheck
import { normalizeName, uid } from './helpers';

// CDN globals
declare const window: any;

async function extractRowsFromPdf(arrayBuffer) {
  const pdf = await window.pdfjsLib.getDocument({
    data: arrayBuffer,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true,
  }).promise;

  const pageRows: string[][] = [];
  for (let p=1; p<=pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Agrupar ítems por coordenada Y (redondear a 2px)
    const rowMap = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]/2)*2;
      const x = item.transform[4];
      if (!rowMap.has(y)) rowMap.set(y,[]);
      rowMap.get(y).push({x, str:item.str.trim()});
    }
    // Ordenar filas de arriba a abajo (Y desc en coordenadas PDF)
    const sorted = [...rowMap.entries()]
      .sort((a,b)=>Number(b[0])-Number(a[0]))
      .map(([,items]) => items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ').trim())
      .filter(r=>r.length>0);
    pageRows.push(sorted);
  }

  // Desduplicar páginas idénticas (ej. tickets Consum con copia cliente)
  const allRows: string[] = [];
  const seenSigs = new Set<string>();
  for (const rows of pageRows) {
    const sig = rows.join('\t');
    if (!seenSigs.has(sig)) {
      seenSigs.add(sig);
      allRows.push(...rows);
    }
  }
  return allRows;
}

// Detecta si es un pedido online de Mercadona
function isMercadonaOnline(rows) {
  const text = rows.slice(0,20).join('\n');
  return /Pedido N[ºo]|Nombre Producto.*Cantidad|Coste de preparaci[oó]n/i.test(text);
}

// PARSER para pedido online Mercadona
// Formato: "Nombre Producto    N    X,XX €"
// Ítems por peso: nombre en una línea, luego "N X,XX €" en la siguiente
function parseMercadonaOnline(rows) {
  const products = [];
  let total = null, date = null;
  let isWithdrawal = false;

  // Extraer fecha: "Cobrado el D/MM/YY" o "Ajustado el D/MM/YY"
  for (const row of rows) {
    const dm = row.match(/(?:Cobrado|Ajustado)\s+el\s+(\d{1,2})\/(\d{2})\/(\d{2,4})/i);
    if (dm) {
      const [,d,m,y] = dm;
      const fy = y.length===2?`20${y}`:y;
      date = `${fy}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  }

  // Líneas a ignorar (cabecera, pie, datos personales, impuestos)
  const SKIP = /^(Pedido|Factura|Entrega|M[eé]todo de|Calle|Datos|David|Gil Zarza|\+34|david\.|teléfono|En Mercadona|Si lo deseas|Nombre Producto|MERCADONA\.S|A-4610|Edificio|Desglose|Base Cuota|21%|10%|4%|Coste de|Cobrado|Ajustado|Visa|\bAUT:|sábado|domingo|lunes|martes|miércoles|jueves|viernes|@gmail|Coop|A-46)/i;
  const WEIGHT_LINE = /^\s*-\s*Peso:|^\s*-\s*[\d,]+\s*kg/i;

  for (let i=0; i<rows.length; i++) {
    const row = rows[i];

    // Sección de productos retirados (ajuste)
    if (/Productos\s+retirados/i.test(row)) { isWithdrawal=true; continue; }
    if (/Productos\s+entregados/i.test(row)) { isWithdrawal=false; continue; }
    if (isWithdrawal) continue;

    // Total del pedido
    const tm = row.match(/^TOTAL\s+([\d]+[,\.]?\d{0,2})\s*€/i) ||
               row.match(/^Productos\s+([\d,\.]+)\s*€/i);
    if (tm && !isWithdrawal) {
      const t = parseFloat(tm[1].replace(',','.'));
      if (t>0 && t<2000) total=t;
      continue;
    }

    if (SKIP.test(row) || WEIGHT_LINE.test(row)) continue;
    if (row.length < 2) continue;

    // Intento 1: línea completa "Nombre N X,XX €"
    // e.g. "Huevos de gallinas camperas 1 1,90 €"
    const full = row.match(/^(.+?)\s+(\d{1,2})\s+([\d]{1,3},\d{2})\s*€\s*$/);
    if (full) {
      const [,name,,priceStr] = full;
      const price = parseFloat(priceStr.replace(',','.'));
      if (price>0 && price<500 && name.length>2 && !SKIP.test(name)) {
        products.push({id:uid(), rawName:name.trim(), price, normalizedName:normalizeName(name.trim())});
      }
      continue;
    }

    // Intento 2: nombre en esta línea, "N X,XX €" en la siguiente (ítems por peso)
    // e.g. "Calabacín verde" seguido de "2 1,14 €"
    if (i<rows.length-1) {
      const nextRow = rows[i+1];
      const nextMatch = nextRow.match(/^(\d{1,2})\s+([\d]{1,3},\d{2})\s*€\s*$/);
      if (nextMatch && !SKIP.test(row) && row.length>3 && !/^\d/.test(row)) {
        const [,, priceStr] = nextMatch;
        const price = parseFloat(priceStr.replace(',','.'));
        if (price>0 && price<500) {
          products.push({id:uid(), rawName:row.trim(), price, normalizedName:normalizeName(row.trim())});
          i++; // saltar la línea de precio
        }
        continue;
      }
    }
  }

  return {products, total, date};
}

// Detecta si es un ticket online/app de Consum (formato web)
function isConsumOnline(rows) {
  const text = rows.slice(0, 30).join('\n');
  // Los tickets físicos de Consum tienen estas cabeceras de columna — no son pedidos online
  if (/UND\s+PVP|KG\s+ARTICULO/i.test(text)) return false;
  return /consum/i.test(text) && (
    /Ref\.|Referencia|N[uú]mero de pedido|factura simplificada/i.test(text) ||
    rows.some(r => /^\d{2}\/\d{2}\/\d{4}/.test(r) && /€/.test(r))
  );
}

// Parser para tickets online/app Consum
// Formato: "Nombre    Uds    Precio unitario    Importe"
function parseConsumOnline(rows) {
  const products = [];
  let total = null, date = null;

  for (const row of rows.slice(0, 20)) {
    const dm = row.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dm) { date = `${dm[3]}-${dm[2]}-${dm[1]}`; break; }
  }
  for (const row of rows) {
    const tm = row.match(/[Tt]otal[:\s]+([\d]+[,\.]\d{2})\s*€/);
    if (tm) { total = parseFloat(tm[1].replace(',','.')); break; }
  }

  const SKIP = /^\s*$|^(Descripci[oó]n|Unidades|Importe|Precio|Ref\.|IVA|Total|TOTAL|Subtotal|Factura|Pedido|Estimado|Socio|Gracias|Consum)/i;

  for (const row of rows) {
    const t = row.trim();
    if (!t || SKIP.test(t)) continue;
    // Línea: "Nombre del producto    X    X,XX €    X,XX €"
    const m = t.match(/^(.+?)\s{2,}\d+\s{2,}[\d,\.]+\s*€?\s{1,}([\d]+[,\.]\d{2})\s*€?\s*$/);
    if (m) {
      const name = m[1].trim();
      const price = parseFloat(m[2].replace(',','.'));
      if (name.length > 1 && price > 0 && price < 500) {
        products.push({id:uid(), rawName:name, price, normalizedName:normalizeName(name)});
      }
      continue;
    }
    // Línea simple: "Nombre    X,XX €"
    const m2 = t.match(/^(.+?)\s{2,}([\d]+[,\.]\d{2})\s*€\s*$/);
    if (m2) {
      const name = m2[1].trim();
      const price = parseFloat(m2[2].replace(',','.'));
      if (name.length > 1 && price > 0 && price < 500 && !/total|iva|subtotal/i.test(name)) {
        products.push({id:uid(), rawName:name, price, normalizedName:normalizeName(name)});
      }
    }
  }
  return {products, total, date};
}

// Detecta si es un ticket de Consum.
// Busca "CONSUM" en cabecera (primeras 15 líneas) O "Total factura:" en cualquier parte.
function isConsum(rows) {
  const header = rows.slice(0, 15).join('\n');
  if (/\bCONSUM\b/i.test(header)) return true;
  return rows.some(r => /Total factura:/i.test(r));
}

// PARSER para tickets físicos de Consum
// PDF.js extrae las columnas del ticket en filas separadas:
//   · Fila A: "NOMBRE_PRODUCTO PRECIO_TOTAL"   (columnas nombre + total)
//   · Fila B: "CANTIDAD" o "CANTIDAD PRECIO_UNIT"  (columna cantidad/peso — separada)
// Ejemplos reales:
//   'PORCIÓN SALMÓN 15,09'  → producto
//   '0,605'                 → peso en kg (fila siguiente, se ignora)
//   'Q.RALLADO 4QUE CONS 4,06' → producto
//   '2 2,03'               → qty + precio_unidad (fila siguiente, se ignora)
// También puede haber líneas en formato antiguo combinado: "N NOMBRE PRECIO"
function parseConsumReceipt(rows) {
  const products = [];
  let total = null, date = null;

  // Fecha: "DD.MM.YYYY" en cabecera
  for (const row of rows.slice(0, 20)) {
    const dm = row.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dm) { date = `${dm[3]}-${dm[2]}-${dm[1]}`; break; }
  }

  // Total: "Total factura: X,XX"
  for (const row of rows) {
    const tm = row.match(/Total factura[:\s]+([\d]+[,\.]\d{2})/i);
    if (tm) { total = parseFloat(tm[1].replace(',','.')); break; }
  }

  // Pie de ticket — al detectar cualquiera de estas palabras se para
  const FOOTER = /IMPORTE A ABONAR|Total factura|Tarj\.\s|Tarjeta|EFECTIVO|CAMBIO|Socio-Cliente|Base\s+IVA|Cuota\s+Importe/i;

  // Líneas que no son productos (descuentos, cabecera columnas, bolsas…)
  const SKIP = /acumula|cheque|cup[oó]n|vale\s*desc|descuento|bolsa|UND\s+PVP|KG\s+ARTICULO|ARTICULO\s+€/i;

  // Fila de cantidad/peso standalone: solo un número (entero o decimal)
  // o "N X,XX" (cantidad + precio_unidad). Siempre SIGUEN a una línea de producto.
  // Ejemplos: '1', '0,605', '2 2,03', '18 0,75', '1,080'
  const STANDALONE_QTY = /^(\d+|\d+[,\.]\d{1,3})(\s+\d{1,4}[,\.]\d{2})?\s*$/;

  for (const row of rows) {
    const t = row.trim();
    if (!t) continue;
    if (FOOTER.test(t)) break;
    if (SKIP.test(t)) continue;
    if (/^[-=*]{3,}/.test(t)) continue;

    // Saltar filas de cantidad/peso standalone
    if (STANDALONE_QTY.test(t)) continue;

    // ── FORMATO NUEVO (columnas separadas): "NOMBRE TOTAL"
    // El nombre empieza con letra, termina con precio X,XX con coma decimal
    const newFmt = t.match(/^([A-Za-záéíóúÁÉÍÓÚñÑüÜ].+?)\s+([\d]{1,4}[,]\d{2})\s*$/);
    if (newFmt) {
      const [, name, priceStr] = newFmt;
      const price = parseFloat(priceStr.replace(',', '.'));
      if (price > 0 && price < 500 && name.trim().length > 1) {
        products.push({id:uid(), rawName:name.trim(), price, normalizedName:normalizeName(name.trim())});
      }
      continue;
    }

    // ── FORMATO ANTIGUO / COMBINADO: "N NOMBRE [PRECIO_UNIT] TOTAL"
    // Cubre enteros "1 PLÁTANO CANARIO IGP 3,02", decimales de peso "0,595 AÑOJO GUISAR 11,10"
    // y con precio/kg intermedio "0,635 LOMO DE CERDO 7,20 4,57"
    const unitMatch = t.match(/^(\d+[,\.]?\d*)\s+(.+?)\s+([\d]+[,\.]\d{2})(?:\s+([\d]+[,\.]\d{2}))?\s*$/);
    if (unitMatch) {
      const [,, name, p1, p2] = unitMatch;
      // El nombre debe contener al menos una letra (no es una fila numérica)
      if (/[A-Za-záéíóúÁÉÍÓÚñÑüÜ]/.test(name)) {
        const price = parseFloat((p2||p1).replace(',','.'));
        if (price > 0 && price < 500 && name.trim().length > 1) {
          products.push({id:uid(), rawName:name.trim(), price, normalizedName:normalizeName(name.trim())});
        }
      }
      continue;
    }
  }

  return {products, total, date};
}

// PARSER para tickets físicos tradicionales (Mercadona tienda)
// Formato: "NOMBRE PRODUCTO    X,XX" con precio al final de la línea
function parseTraditionalReceipt(rows) {
  const products = [];
  let total = null, date = null;

  // Extraer fecha — soporta DD/MM/YYYY y DD/MM/YYYY HH:MM:SS
  for (const row of rows) {
    const dm = row.match(/FECHA[:\s]+(\d{1,2})\/(\d{2})\/(\d{2,4})/i) ||
               row.match(/(\d{1,2})\/(\d{2})\/(\d{4})/);
    if (dm) {
      const [,d,m,y] = dm;
      const fy=y.length===2?`20${y}`:y;
      date=`${fy}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      break;
    }
  }

  // Líneas a ignorar completamente
  const SKIP = /CIF|NIF|TFN|TEL[ÉE]F|TICKET N|GRACIAS|SUBTOTAL|BASE\s*IMP|DESGLOSE|COBRAR|CONSUM SA|MERCADONA SA|SUPERMERCADO|DIRECCI|CAJERO|OPERADOR|TARJETA|VISA|MASTER|EFECTIVO|CONTACTLESS|AUTORIZA|COMERCIO|TERMINAL|CADUCIDAD|SIMPLIFICADA|DESCRIPCION|PVP\s+IVA|APLICA|TRANS|^\s*[*\-=]{3}/i;
  const TOTAL_PAT = /^(?:TOTAL|A PAGAR|IMPORTE TOTAL|TOTAL IVA|TOTAL FACTURA|TOTAL A COBRAR)\b/i;
  // Precio: número con 2 decimales, opcionalmente seguido de tasa de IVA (ej: 10,0 o 21,0)
  const PRICE_PAT = /\s+([\d]{1,3}(?:[.,]\d{3})*[,]\d{2})(?:\s+\d{1,2}[,]\d)?\s*$/;

  for (const row of rows) {
    if (SKIP.test(row) || row.length < 3) continue;
    // Ignorar líneas que empiezan por porcentaje de IVA (desglose)
    if (/^\d+[,.]\d+\s*%/.test(row.trim())) continue;
    // Ignorar líneas de solo números/espacios/% 
    if (/^[\d\s,\.%]+$/.test(row.trim())) continue;

    // Capturar total
    const tm = row.match(/(?:TOTAL FACTURA|TOTAL A COBRAR|TOTAL|A PAGAR)\s+([\d,\.]+)/i);
    if (tm) { const t=parseFloat(tm[1].replace(',','.')); if(t>0&&t<2000) total=t; continue; }
    if (TOTAL_PAT.test(row)) continue;

    const pm = row.match(PRICE_PAT);
    if (!pm) continue;
    const price = parseFloat(pm[1].replace('.','').replace(',','.'));
    if (price <= 0 || price > 500) continue;

    // Extraer nombre: todo antes del bloque precio+IVA, quitando código inicial
    let name = row.slice(0, row.length - pm[0].length)
      .replace(/^\d{3,6}\s+/, '')  // quitar código de producto (13403, 35051…)
      .replace(/^\d+\s+/, '')       // quitar cantidad inicial genérica
      .replace(/\s+\d+\s*[Xx×]\s*[\d,\.]+\s*$/, '') // quitar "N x precio"
      .trim();
    if (name.length < 2 || /^\d+$/.test(name)) continue;

    products.push({id:uid(), rawName:name, price, normalizedName:normalizeName(name)});
  }

  return {products, total, date};
}

/* ═══════════════════════════════════════
   OCR DE TICKETS POR FOTO (Ultra Chef)
   Usa Tesseract.js cargado dinámicamente
═══════════════════════════════════════ */
async function loadTesseract() {
  if (window.Tesseract) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('No se pudo cargar Tesseract. Comprueba la conexión a internet.'));
    document.head.appendChild(s);
  });
}

async function ocrImageFile(file, onProgress) {
  await loadTesseract();
  // Usamos la API v2 (más estable en browser que v4)
  const worker = Tesseract.createWorker({
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/worker.min.js',
    langPath:   'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0',
    corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@2.2.0/tesseract-core.wasm.js',
    logger: m => {
      if (!onProgress) return;
      if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
      else onProgress(-1);
    }
  });
  try {
    await worker.load();
    await worker.loadLanguage('spa');
    await worker.initialize('spa');
    const { data: { text } } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}

// Pre-procesa la imagen en un canvas para mejorar calidad OCR
async function enhanceImageForOCR(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Escalar a máx 2400px para balancear velocidad y calidad
      const maxDim = 2400;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w,h) > maxDim) {
        const scale = maxDim / Math.max(w,h);
        w = Math.round(w*scale); h = Math.round(h*scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // Filtro: escala de grises + contraste ligero para mejorar OCR
      const data = ctx.getImageData(0, 0, w, h);
      for (let i=0; i<data.data.length; i+=4) {
        const gray = 0.299*data.data[i] + 0.587*data.data[i+1] + 0.114*data.data[i+2];
        // Aumentar contraste
        const contrast = Math.min(255, Math.max(0, ((gray - 128) * 1.4) + 128));
        data.data[i] = data.data[i+1] = data.data[i+2] = contrast;
      }
      ctx.putImageData(data, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(new File([blob], file.name||'ticket.png', {type:'image/png'})), 'image/png');
    };
    img.src = url;
  });
}

// Convierte texto OCR bruto en rows[] compatibles con los parsers existentes
function ocrTextToRows(text) {
  return text
    .split('\n')
    .map(l => l.replace(/[|]/g, ' ').trim()) // corregir artefactos OCR comunes
    .filter(l => l.length > 1);
}

/* ═══════════════════════════════════════
   GEMINI AI — PARSER INTELIGENTE DE TICKETS
   API gratuita de Google (1500 peticiones/día).
   Se usa como fallback en PDF y como motor
   principal para fotos de ticket.
   Configura VITE_GEMINI_KEY en las variables
   de entorno de Cloudflare Pages.
═══════════════════════════════════════ */

const GEMINI_KEY: string | undefined = (import.meta as any).env?.VITE_GEMINI_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Modelos en orden de preferencia — cada uno tiene cuota independiente (1500 req/día gratis)
const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
];

const GEMINI_PROMPT_TEXT = `Analiza este texto de un ticket de supermercado español y extrae todos los productos comprados.
Devuelve ÚNICAMENTE JSON válido con este formato exacto (sin texto adicional):
{"date":"YYYY-MM-DD","total":0.00,"products":[{"name":"nombre","price":0.00}]}
Reglas:
- date: fecha en formato YYYY-MM-DD, null si no aparece
- total: importe total pagado, null si no aparece
- products: SOLO artículos físicos (comida, bebida, higiene, hogar). Excluye bolsas, descuentos, vales, comisiones, IVA, cambio, líneas de total o subtotal.
- price: precio final pagado por ese artículo (para productos por peso, el importe total de esa línea)
- name: nombre limpio del producto en español, sin códigos ni cantidades
TEXTO DEL TICKET:`;

const GEMINI_PROMPT_IMAGE = `Desglosa ingrediente por ingrediente su importe y la suma del total de este ticket de supermercado.
Devuelve ÚNICAMENTE JSON válido con este formato exacto (sin texto adicional, sin markdown):
{"date":"YYYY-MM-DD","total":0.00,"products":[{"name":"nombre","price":0.00}]}
- date: fecha del ticket en formato YYYY-MM-DD, null si no aparece
- total: importe total final pagado
- products: cada línea de producto con su importe final (si hay descuento aplicado, usa el precio ya descontado). Incluye todos los artículos sin excepción.
- name: nombre del producto en minúsculas, limpio, sin códigos`;

async function callGemini(parts) {
  if (!GEMINI_KEY) return null;
  // Intentar cada modelo en orden hasta que uno responda (cuotas independientes)
  for (const model of GEMINI_MODELS) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          // Sin responseMimeType: más compatible con todos los modelos y con imágenes
          generationConfig: { temperature: 0, maxOutputTokens: 8192 },
        }),
      });
      if (res.status === 429) {
        console.warn(`Gemini ${model}: cuota agotada, probando siguiente modelo...`);
        continue;
      }
      if (!res.ok) {
        const errText = await res.text().catch(()=>'');
        console.error(`Gemini ${model} error ${res.status}:`, errText.slice(0,200));
        continue;
      }
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText) { console.warn(`Gemini ${model}: respuesta vacía`); continue; }

      // Extraer el bloque JSON de la respuesta (puede venir con ```json ... ``` o solo el JSON)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { console.warn(`Gemini ${model}: no hay JSON en respuesta`, rawText.slice(0,200)); continue; }
      const parsed = JSON.parse(jsonMatch[0]);

      const products = (parsed.products || [])
        .filter(p => p.name && typeof p.price === 'number' && p.price > 0 && p.price < 1000)
        .map(p => ({
          id: uid(),
          rawName: String(p.name).trim(),
          price: p.price,
          normalizedName: normalizeName(String(p.name).trim()),
        }));
      console.log(`Gemini ${model} OK: ${products.length} productos`);
      return { products, total: parsed.total || null, date: parsed.date || null };
    } catch(e) {
      console.error(`Gemini ${model} excepción:`, e);
    }
  }
  console.error('Todos los modelos Gemini fallaron o tienen cuota agotada');
  return null;
}

// PDF: recibe las filas ya extraídas por PDF.js
async function geminiParsePdfText(rows) {
  return callGemini([{ text: GEMINI_PROMPT_TEXT + '\n' + rows.join('\n') }]);
}

// Redimensiona y comprime la imagen para Gemini (max 1600px, JPEG 85%)
// Mejora la legibilidad y reduce el tamaño sin perder detalle del texto
async function resizeForGemini(file): Promise<{ blob: Blob, mimeType: string }> {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1800;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w, h) > MAX) {
        const s = MAX / Math.max(w, h);
        w = Math.round(w * s); h = Math.round(h * s);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      // Fondo blanco por si la imagen tiene transparencia
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve({ blob: blob!, mimeType: 'image/jpeg' }), 'image/jpeg', 0.88);
    };
    img.onerror = () => {
      // Si no se puede procesar, usar el archivo original
      URL.revokeObjectURL(url);
      resolve({ blob: file, mimeType: file.type || 'image/jpeg' });
    };
    img.src = url;
  });
}

// Foto: recibe el File directamente (mucho mejor que Tesseract)
async function geminiParseImage(file): Promise<any> {
  const { blob, mimeType } = await resizeForGemini(file);
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const base64 = e.target.result.split(',')[1];
      const result = await callGemini([
        { text: GEMINI_PROMPT_IMAGE },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ]);
      resolve(result);
    };
    reader.readAsDataURL(blob);
  });
}

// Procesa un ticket desde una foto → datos del ticket
// Usa Gemini como motor principal (OCR/Tesseract comentado — peor calidad)
export async function processImageTicket(file, onProgress) {
  onProgress && onProgress(-1);

  if (!GEMINI_KEY) {
    throw new Error('No hay clave de IA configurada. Contacta con el administrador.');
  }

  const aiResult = await geminiParseImage(file);
  if (aiResult && aiResult.products.length > 0) {
    const total = aiResult.total || aiResult.products.reduce((s, p) => s + (p.price || 0), 0);
    return {
      id: 'tk' + uid(),
      filename: (file.name && file.name !== 'image.jpg'
        ? file.name
        : 'foto-ticket-' + new Date().toISOString().slice(0, 10) + '.jpg'),
      date: aiResult.date || new Date().toISOString().slice(0, 10),
      products: aiResult.products,
      total,
      store: 'Otro',
      fromCamera: true,
      parsedByAI: true,
    };
  }

  throw new Error('No se pudieron extraer productos del ticket. Si el problema persiste, puede que la cuota diaria de IA esté agotada — inténtalo mañana.');

  /* ── OCR fallback desactivado (Tesseract — peor calidad que Gemini) ──
  const enhanced = await enhanceImageForOCR(file);
  const text = await ocrImageFile(enhanced, onProgress);
  const rows = ocrTextToRows(text);
  const parsed = isMercadonaOnline(rows) ? parseMercadonaOnline(rows)
               : isConsum(rows)           ? parseConsumReceipt(rows)
               :                            parseTraditionalReceipt(rows);
  const totalProds = parsed.total || parsed.products.reduce((s,p)=>s+(p.price||0),0);
  return {
    id: 'tk'+uid(),
    filename: file.name||'foto-ticket.jpg',
    date: parsed.date || new Date().toISOString().slice(0,10),
    products: parsed.products,
    total: totalProds,
    store: 'Otro',
    fromCamera: true,
  };
  */
}

/* ═══════════════════════════════════════
   PROCESADO COMPLETO DE UN PDF → datos del ticket
═══════════════════════════════════════ */
export async function processPdf(file) {
  const buf = await file.arrayBuffer();
  let rows;
  try {
    rows = await extractRowsFromPdf(buf);
  } catch(e) {
    console.error('PDF.js error:', e);
    throw new Error(`No se pudo extraer texto del PDF: ${e?.message||e}`);
  }
  if (!rows || rows.length === 0) throw new Error('El PDF no contiene texto legible. Puede ser una imagen escaneada.');

  let parsed = isMercadonaOnline(rows) ? parseMercadonaOnline(rows)
              : isConsumOnline(rows)     ? parseConsumOnline(rows)
              : isConsum(rows)           ? parseConsumReceipt(rows)
              :                            parseTraditionalReceipt(rows);
  if (!parsed.products) throw new Error('No se reconoció el formato del ticket.');

  // ── Gemini fallback: si el regex encontró menos de 3 productos ──
  if (GEMINI_KEY && parsed.products.length < 3) {
    const aiResult = await geminiParsePdfText(rows);
    if (aiResult && aiResult.products.length > parsed.products.length) {
      parsed = { ...parsed, ...aiResult };
    }
  }

  const totalProds = parsed.total || parsed.products.reduce((s,p)=>s+(p.price||0),0);
  const storeType2 = isMercadonaOnline(rows)?'Mercadona':isConsum(rows)||isConsumOnline(rows)?'Consum':'Otro';
  return {
    id: 'tk'+uid(),
    filename: file.name,
    date: parsed.date || new Date().toISOString().slice(0,10),
    products: parsed.products,
    total: totalProds,
    store: storeType2,
  };
}

// Aplica un ticket al catálogo: devuelve ingredientes actualizados + historial + resumen
// learnedMappings: { [normalizedRawName]: ingredientName } — mapeos guardados manualmente
export function applyTicket(ticket, ingredients, priceHistory, learnedMappings = {}) {
  const ingsByName = Object.fromEntries(ingredients.map(i=>[i.name.toLowerCase(),i]));
  const newHistory = JSON.parse(JSON.stringify(priceHistory));
  let updatedIngs = ingredients.map(i=>({...i}));
  const matched = [], unmatched = [];

  // Palabras que indican líneas de ticket que no son productos reales
  const JUNK_PAT = /acumula|cheque|cup[oó]n|vale\s*desc|descuento|bolsa|importe\s*a\s*abonar|tarj\.|cr[eé]dito|efectivo|subtotal|base\s+iva|iva\s+\d|^\s*$/i;

  for (const prod of ticket.products) {
    if (JUNK_PAT.test(prod.rawName||'')) continue;   // ignorar basura silenciosamente
    const normName = prod.normalizedName;

    let ing = null;

    // 1. Coincidencia directa por nombre normalizado (si existe)
    if (normName) {
      ing = ingsByName[normName.toLowerCase()];
    }

    // 2. Mapeo aprendido manualmente — clave = rawName en minúsculas
    //    (funciona incluso cuando normalizedName es null)
    if (!ing) {
      const rawKey = (prod.rawName||'').trim().toLowerCase();
      const learnedName = learnedMappings[rawKey]
        || (normName ? learnedMappings[normName.toLowerCase()] : null);
      if (learnedName) ing = ingsByName[learnedName.toLowerCase()];
    }

    if (!ing) { unmatched.push(prod); continue; }

    if (!newHistory[ing.id]) newHistory[ing.id]=[];
    // Evitar duplicados del mismo ticket
    const alreadyIn = newHistory[ing.id].some(r=>r.ticketId===ticket.id && r.rawName===prod.rawName);
    if (!alreadyIn) {
      newHistory[ing.id].push({date:ticket.date, price:prod.price, rawName:prod.rawName, ticketId:ticket.id});
    }
    updatedIngs = updatedIngs.map(i=>i.id===ing.id?{...i,available:true}:i);
    matched.push({rawName:prod.rawName, ingredientName:ing.name, price:prod.price, category:ing.category});
  }

  return {updatedIngs, newHistory, matched, unmatched};
}

// build Tue Mar 31 13:28:51 CEST 2026
