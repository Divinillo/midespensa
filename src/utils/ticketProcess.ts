// @ts-nocheck
import { normalizeName } from './helpers';

// CDN globals
declare const window: any;

async function extractRowsFromPdf(arrayBuffer) {
  const pdf = await window.pdfjsLib.getDocument({data: arrayBuffer}).promise;
  const allRows = [];
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
    allRows.push(...sorted);
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

// Detecta si es un ticket de Consum.
// Busca "CONSUM" en cabecera (primeras 15 líneas) O "Total factura:" en cualquier parte.
function isConsum(rows) {
  const header = rows.slice(0, 15).join('\n');
  if (/\bCONSUM\b/i.test(header)) return true;
  return rows.some(r => /Total factura:/i.test(r));
}

// PARSER para tickets físicos de Consum
// Las líneas de separación (---) son gráficas en el PDF y NO aparecen en el texto extraído,
// por lo que NO se usan como delimitadores. En su lugar:
//   · Las líneas de productos SIEMPRE empiezan por dígito (cantidad o peso)
//   · Se para en cuanto se detecta una línea de pie de ticket
//   · Se ignoran líneas de descuentos/puntos/etc.
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

  // Palabras clave que indican fin del área de productos (pie de ticket)
  const FOOTER = /IMPORTE A ABONAR|Total factura|Tarj\.\s|Tarjeta|EFECTIVO|CAMBIO|Socio-Cliente|Base\s+IVA|Cuota\s+Importe/i;

  // Líneas a ignorar dentro del área de productos (no son artículos)
  const SKIP = /acumula|al cheque|cup[oó]n|vale\s*desc|bolsa|UND\s+PVP|KG\s+ARTICULO|ARTICULO\s+€/i;

  // Líneas que son solo números separados por espacios/comas (tabla IVA)
  const ALL_NUMS = /^[\d\s,\.]+$/;

  for (const row of rows) {
    const t = row.trim();
    if (!t) continue;

    // Parar en pie de ticket
    if (FOOTER.test(t)) break;

    // Ignorar líneas no-producto
    if (SKIP.test(t)) continue;
    if (ALL_NUMS.test(t)) continue;
    if (/^[-=*]{3,}/.test(t)) continue;

    // Formato unidades: "N NOMBRE PRECIO" o "N NOMBRE PRECIO_UNIT TOTAL"
    const unitMatch = t.match(/^(\d+)\s+(.+?)\s+([\d]+[,\.]\d{2})(?:\s+([\d]+[,\.]\d{2}))?\s*$/);
    if (unitMatch) {
      const [,, name, p1, p2] = unitMatch;
      const price = parseFloat((p2||p1).replace(',','.'));
      if (price > 0 && price < 500 && name.trim().length > 1) {
        products.push({id:uid(), rawName:name.trim(), price, normalizedName:normalizeName(name.trim())});
      }
      continue;
    }

    // Formato peso: "0,NNN NOMBRE TOTAL"
    const weightMatch = t.match(/^0[,\.](\d{3})\s+(.+?)\s+([\d]+[,\.]\d{2})\s*$/);
    if (weightMatch) {
      const [,, name, priceStr] = weightMatch;
      const price = parseFloat(priceStr.replace(',','.'));
      if (price > 0 && price < 500 && name.trim().length > 1) {
        products.push({id:uid(), rawName:name.trim(), price, normalizedName:normalizeName(name.trim())});
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

// Procesa un ticket desde una foto → datos del ticket (mismo formato que processPdf)
export async function processImageTicket(file, onProgress) {
  onProgress && onProgress(-1); // señal: pre-procesando imagen
  const enhanced = await enhanceImageForOCR(file);
  const text = await ocrImageFile(enhanced, onProgress);
  const rows = ocrTextToRows(text);

  const parsed = isMercadonaOnline(rows) ? parseMercadonaOnline(rows)
               : isConsum(rows)           ? parseConsumReceipt(rows)
               :                            parseTraditionalReceipt(rows);

  const totalProds = parsed.total || parsed.products.reduce((s,p)=>s+(p.price||0),0);
  const storeType = isMercadonaOnline(rows)?'Mercadona':isConsum(rows)?'Consum':'Otro';
  return {
    id: 'tk'+uid(),
    filename: (file.name && file.name !== 'image.jpg'
                ? file.name
                : 'foto-ticket-'+new Date().toISOString().slice(0,10)+'.jpg'),
    date: parsed.date || new Date().toISOString().slice(0,10),
    products: parsed.products,
    total: totalProds,
    store: storeType,
    fromCamera: true,
  };
}

/* ═══════════════════════════════════════
   PROCESADO COMPLETO DE UN PDF → datos del ticket
═══════════════════════════════════════ */
export async function processPdf(file) {
  const buf = await file.arrayBuffer();
  const rows = await extractRowsFromPdf(buf);
  const parsed = isMercadonaOnline(rows) ? parseMercadonaOnline(rows)
              : isConsum(rows)           ? parseConsumReceipt(rows)
              :                            parseTraditionalReceipt(rows);
  const totalProds = parsed.total || parsed.products.reduce((s,p)=>s+(p.price||0),0);
  const storeType2 = isMercadonaOnline(rows)?'Mercadona':isConsum(rows)?'Consum':'Otro';
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
export function applyTicket(ticket, ingredients, priceHistory) {
  const ingsByName = Object.fromEntries(ingredients.map(i=>[i.name.toLowerCase(),i]));
  const newHistory = JSON.parse(JSON.stringify(priceHistory));
  let updatedIngs = ingredients.map(i=>({...i}));
  const matched = [], unmatched = [];

  // Palabras que indican líneas de ticket que no son productos reales
  const JUNK_PAT = /acumula|cheque|cup[oó]n|vale\s*desc|descuento|bolsa|importe\s*a\s*abonar|tarj\.|cr[eé]dito|efectivo|subtotal|base\s+iva|iva\s+\d|^\s*$/i;

  for (const prod of ticket.products) {
    if (JUNK_PAT.test(prod.rawName||'')) continue;   // ignorar basura silenciosamente
    const normName = prod.normalizedName;
    if (!normName) { unmatched.push(prod); continue; }
    const ing = ingsByName[normName.toLowerCase()];
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

