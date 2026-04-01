// @ts-nocheck

/* ── App colour palette ───────────────────────────────────────── */
const C = {
  headerDark:  [13,  78,  74],
  headerMid:   [15, 118, 110],
  accent:      [13, 148, 136],
  accentLight: [204, 251, 241],
  bgLight:     [240, 253, 250],
  textDark:    [13,  78,  74],
  textMid:     [15, 118, 110],
  textLight:   [94, 234, 212],
  white:       [255, 255, 255],
  gray:        [148, 163, 184],
  grayLight:   [241, 245, 249],
};

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.jspdf.jsPDF;
}

/* ══════════════════════════════════════════════════════════════
   INFORME NUTRICIONAL
══════════════════════════════════════════════════════════════ */
export async function generateNutriPDF(report, year, month, tickets = []) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, ml = 14, mr = 14, cw = W - ml - mr;
  const MN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // ── CABECERA TEAL ──
  doc.setFillColor(...C.headerDark);
  doc.rect(0, 0, W, 36, 'F');
  doc.setFillColor(...C.headerMid);
  doc.rect(0, 0, 8, 36, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('MiDespensa', ml + 2, 14);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Informe Nutricional - Plan mensual', ml + 2, 22);
  doc.setFontSize(8.5);
  doc.text(`${MN[month]} ${year}  -  ${report.rows.length} dia${report.rows.length !== 1 ? 's' : ''} analizados`, ml + 2, 30);
  const todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(7.5); doc.setTextColor(...C.textLight);
  doc.text('Generado: ' + todayStr, W - mr - doc.getTextWidth('Generado: ' + todayStr), 30);

  let y = 46;

  // ── TARJETAS RESUMEN ──
  doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Media diaria estimada', ml, y);
  y += 4;
  const cards = [
    { label: 'Calorias',  val: report.avg.kcal,  unit: 'kcal',  bg: [255,247,237], fg: [194, 65, 12] },
    { label: 'Proteinas', val: report.avg.prot,  unit: 'g/dia', bg: [219,234,254], fg: [ 29, 78,216] },
    { label: 'Hidratos',  val: report.avg.carbs, unit: 'g/dia', bg: [254,249,195], fg: [161, 98,  7] },
    { label: 'Grasas',    val: report.avg.fat,   unit: 'g/dia', bg: [254,226,226], fg: [220, 38, 38] },
    { label: 'Azucar',    val: report.avg.sugar, unit: 'g/dia', bg: [204,251,241], fg: [ 13,148,136] },
  ];
  const cCardW = (cw - 12) / 5;
  cards.forEach((c, i) => {
    const cx = ml + i * (cCardW + 3);
    doc.setFillColor(...c.bg);
    doc.roundedRect(cx, y, cCardW, 22, 2.5, 2.5, 'F');
    doc.setTextColor(...c.fg);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text(c.label.toUpperCase(), cx + cCardW / 2, y + 6, { align: 'center' });
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text(String(c.val), cx + cCardW / 2, y + 15, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text(c.unit, cx + cCardW / 2, y + 19.5, { align: 'center' });
  });
  y += 28;

  // Totales acumulados
  doc.setFillColor(...C.accentLight);
  doc.roundedRect(ml, y, cw, 8, 1.5, 1.5, 'F');
  doc.setTextColor(...C.textMid); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  const totTxt = `Total: ${report.totals.kcal} kcal - ${report.totals.prot}g prot - ${report.totals.carbs}g HC - ${report.totals.fat}g grasas - ${report.totals.sugar}g azucar`;
  doc.text(totTxt, ml + cw / 2, y + 5.2, { align: 'center' });
  y += 14;

  // ── GRÁFICO CALORIAS POR DÍA ──
  if (report.rows.length > 0) {
    doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Calorias por dia', ml, y);
    y += 3;
    const chartH = 48, chartX = ml + 14, chartW = cw - 14;
    const maxKcal = Math.max(...report.rows.map(r => r.totKcal), 1);
    const yMax = Math.ceil(maxKcal / 500) * 500;
    doc.setFillColor(...C.bgLight);
    doc.rect(chartX, y, chartW, chartH, 'F');
    for (let i = 0; i <= 4; i++) {
      const gy = y + chartH - (i / 4) * chartH;
      doc.setDrawColor(200, 240, 235); doc.setLineWidth(0.2);
      doc.line(chartX, gy, chartX + chartW, gy);
      doc.setTextColor(...C.gray); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(String(Math.round((i / 4) * yMax)), chartX - 1.5, gy + 1, { align: 'right' });
    }
    const barSpacing = chartW / report.rows.length;
    const barW = Math.min(barSpacing - 2, 11);
    report.rows.forEach((r, i) => {
      const bh = r.totKcal > 0 ? (r.totKcal / yMax) * chartH : 0;
      const bx = chartX + i * barSpacing + (barSpacing - barW) / 2;
      const by = y + chartH - bh;
      if (r.totKcal > 2200)      doc.setFillColor(...C.headerDark);
      else if (r.totKcal > 1600) doc.setFillColor(...C.headerMid);
      else if (r.totKcal > 0)    doc.setFillColor(...C.accent);
      else                        doc.setFillColor(...C.grayLight);
      if (bh > 0) {
        doc.roundedRect(bx, by, barW, bh, 1, 1, 'F');
        if (bh > 6) { doc.setTextColor(...C.textDark); doc.setFontSize(4.8); doc.text(String(r.totKcal), bx + barW / 2, by - 0.5, { align: 'center' }); }
      } else {
        doc.setFillColor(...C.grayLight); doc.rect(bx, y + chartH - 1.5, barW, 1.5, 'F');
      }
      doc.setTextColor(...C.textMid); doc.setFontSize(5.5);
      doc.text(String(r.day), bx + barW / 2, y + chartH + 4, { align: 'center' });
    });
    doc.setTextColor(...C.gray); doc.setFontSize(7);
    doc.text('Dia del mes', chartX + chartW / 2, y + chartH + 9, { align: 'center' });
    y += chartH + 14;
  }

  // ── DISTRIBUCIÓN DE MACROS ──
  if (report.totals.kcal > 0) {
    doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Distribucion energetica (media diaria)', ml, y);
    y += 4;
    const protKcal = report.avg.prot * 4, carbsKcal = report.avg.carbs * 4, fatKcal = report.avg.fat * 9;
    const totalMK = protKcal + carbsKcal + fatKcal || 1;
    const segs = [
      { pct: protKcal / totalMK,  r:  59, g: 130, b: 246, label: `Proteinas ${Math.round(protKcal / totalMK * 100)}%` },
      { pct: carbsKcal / totalMK, r: 234, g: 179, b:   8, label: `Hidratos ${Math.round(carbsKcal / totalMK * 100)}%` },
      { pct: fatKcal / totalMK,   r: 239, g:  68, b:  68, label: `Grasas ${Math.round(fatKcal / totalMK * 100)}%` },
    ];
    let bx2 = ml;
    segs.forEach(s => {
      const sw = s.pct * cw;
      doc.setFillColor(s.r, s.g, s.b); doc.rect(bx2, y, sw, 11, 'F');
      if (sw > 18) { doc.setTextColor(...C.white); doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text(s.label, bx2 + sw / 2, y + 7, { align: 'center' }); }
      bx2 += sw;
    });
    y += 11;
    const legItems = [
      { txt: `Proteinas: ${report.avg.prot}g - ${protKcal} kcal`,  r:  59, g: 130, b: 246 },
      { txt: `Hidratos: ${report.avg.carbs}g - ${carbsKcal} kcal`, r: 161, g: 119, b:   0 },
      { txt: `Grasas: ${report.avg.fat}g - ${fatKcal} kcal`,       r: 239, g:  68, b:  68 },
    ];
    let lx = ml;
    legItems.forEach(l => {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.setFillColor(l.r, l.g, l.b); doc.rect(lx, y + 3.5, 3, 3, 'F');
      doc.setTextColor(70, 70, 90); doc.text(l.txt, lx + 4.5, y + 6.2);
      lx += doc.getTextWidth(l.txt) + 10;
    });
    y += 12;
  }

  // ── TABLA DETALLADA POR DÍA ──
  if (report.rows.length > 0) {
    const rowH = 13, hdrH = 8;
    if (y + hdrH + report.rows.length * rowH + 20 > H - 18) { doc.addPage(); y = 20; }
    doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Detalle por dia', ml, y);
    y += 4;
    const cols = [
      { h: 'Dia',    x: ml,       w: 10 },
      { h: 'Comida', x: ml + 10,  w: 46 },
      { h: 'Cena',   x: ml + 56,  w: 46 },
      { h: 'Kcal',   x: ml + 102, w: 18 },
      { h: 'P',      x: ml + 120, w: 13 },
      { h: 'HC',     x: ml + 133, w: 13 },
      { h: 'G',      x: ml + 146, w: 13 },
      { h: 'Az',     x: ml + 159, w: 13 },
    ];
    doc.setFillColor(...C.headerDark); doc.rect(ml, y, cw, hdrH, 'F');
    doc.setTextColor(...C.white); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    cols.forEach(c => doc.text(c.h, c.x + 1.5, y + 5.5));
    y += hdrH;
    report.rows.forEach((r, i) => {
      const ry = y + i * rowH;
      doc.setFillColor(...(i % 2 === 0 ? C.bgLight : C.white));
      doc.rect(ml, ry, cw, rowH, 'F');
      doc.setTextColor(...C.textDark); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text(String(r.day), ml + 1.5, ry + 5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 80);
      const lName = r.lunch  ? (r.lunch.name.length  > 22 ? r.lunch.name.slice(0, 22)  + '...' : r.lunch.name)  : '-';
      const dName = r.dinner ? (r.dinner.name.length > 22 ? r.dinner.name.slice(0, 22) + '...' : r.dinner.name) : '-';
      doc.text(lName, ml + 11.5, ry + 5);
      doc.text(dName, ml + 57.5, ry + 5);
      if (r.totKcal > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(194,  65,  12); doc.text(String(r.totKcal), ml + 103.5, ry + 5);
        doc.setTextColor( 29,  78, 216); doc.text(`${r.totProt}g`,   ml + 121.5, ry + 5);
        doc.setTextColor(161,  98,   7); doc.text(`${r.totCarbs}g`,  ml + 134.5, ry + 5);
        doc.setTextColor(220,  38,  38); doc.text(`${r.totFat}g`,    ml + 147.5, ry + 5);
        doc.setTextColor(219,  39, 119); doc.text(`${r.totSugar}g`,  ml + 160.5, ry + 5);
      } else {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(190, 190, 190);
        doc.text('Sin datos', ml + 103.5, ry + 5);
      }
      // Sub-fila kcal — solo texto ASCII (sin emojis/simbolos Unicode)
      if (r.lMacros || r.dMacros) {
        doc.setTextColor(...C.textMid); doc.setFontSize(5.8); doc.setFont('helvetica', 'normal');
        let sub = '';
        if (r.lMacros) sub += `C: ${r.lMacros.kcal} kcal  `;
        if (r.dMacros) sub += `Ce: ${r.dMacros.kcal} kcal`;
        doc.text(sub, ml + 11.5, ry + 9.5);
      }
      doc.setDrawColor(200, 240, 235); doc.setLineWidth(0.1);
      doc.line(ml, ry + rowH, ml + cw, ry + rowH);
    });
    y += report.rows.length * rowH + 6;
  }

  // ── GASTO POR SUPERMERCADO ──
  if (tickets.length > 0) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthTickets = tickets.filter(t => t.date?.startsWith(monthKey));
    const storeMap = {};
    tickets.forEach(t => {
      const s = t.store || (t.filename?.toLowerCase().includes('mercadona') ? 'Mercadona' : t.filename?.toLowerCase().includes('consum') ? 'Consum' : 'Otro');
      if (!storeMap[s]) storeMap[s] = { total: 0, count: 0, monthTotal: 0 };
      storeMap[s].total += (t.total || 0); storeMap[s].count++;
      if (t.date?.startsWith(monthKey)) storeMap[s].monthTotal += (t.total || 0);
    });
    const storeArr = Object.entries(storeMap).sort((a, b) => b[1].total - a[1].total);
    const totalAll = storeArr.reduce((s, [, v]) => s + v.total, 0);
    const totalMonth = monthTickets.reduce((s, t) => s + (t.total || 0), 0);
    const neededH2 = 14 + storeArr.length * 14 + 20;
    if (y + neededH2 > H - 18) { doc.addPage(); y = 20; }
    doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Gasto por supermercado', ml, y);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.textMid);
    doc.text(`Total historico: ${totalAll.toFixed(2)}EUR  -  ${MN[month]}: ${totalMonth.toFixed(2)}EUR  -  ${tickets.length} tickets`, ml, y + 5);
    y += 10;
    storeArr.forEach(([store, { total, count, monthTotal }]) => {
      doc.setFillColor(...C.bgLight); doc.roundedRect(ml, y, cw, 12, 1.5, 1.5, 'F');
      doc.setTextColor(...C.textDark); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(store, ml + 3, y + 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.textMid);
      doc.text(`${count} ticket${count !== 1 ? 's' : ''}`, ml + 50, y + 8);
      if (monthTotal > 0) { doc.setTextColor(22, 101, 52); doc.text(`Este mes: ${monthTotal.toFixed(2)}EUR`, ml + 80, y + 8); }
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.headerMid); doc.setFontSize(9);
      const tw2 = doc.getTextWidth(total.toFixed(2) + 'EUR');
      doc.text(total.toFixed(2) + 'EUR', ml + cw - 3 - tw2, y + 8);
      const barW2 = totalAll > 0 ? (total / totalAll) * (cw - 6) : 0;
      doc.setFillColor(...C.accentLight); doc.rect(ml + 3, y + 10, barW2, 1.5, 'F');
      y += 14;
    });
    y += 4;
  }

  _addFooter(doc, W, H, ml, mr);
  doc.save(`informe-nutricional-${MN[month].toLowerCase()}-${year}.pdf`);
}

/* ══════════════════════════════════════════════════════════════
   INFORME DE GASTOS
══════════════════════════════════════════════════════════════ */
export async function generateGastoPDF(tickets, priceHistory, ingredients) {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, ml = 14, mr = 14, cw = W - ml - mr;
  const MN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const CAT_HEX = { 'carnes':'#ef4444','pescado':'#0ea5e9','verduras':'#10b981','legumbres':'#f59e0b','lácteos':'#eab308','pasta y harinas':'#f97316','conservas':'#64748b','fruta':'#fb923c','bebidas':'#78716c','congelados':'#06b6d4','bollería y dulces':'#ec4899','snacks y aperitivos':'#84cc16','especias y condimentos':'#14b8a6' };
  const STORE_RGB = { Mercadona:[13,148,136], Consum:[59,130,246], Carrefour:[239,68,68], Lidl:[245,158,11], Aldi:[249,115,22] };
  const PALETTE_RGB = [[13,148,136],[217,119,6],[245,158,11],[239,68,68],[59,130,246],[16,185,129],[249,115,22],[251,191,36],[236,72,153],[6,182,212],[132,204,22],[20,184,166]];
  const h2r = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];

  // ── Calcular datos ──
  const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));
  const allTotal = tickets.reduce((s, t) => s + (t.total || 0), 0);

  const monthMap = {};
  tickets.forEach(t => { const k = t.date?.slice(0,7); if (k) monthMap[k] = (monthMap[k]||0) + (t.total||0); });
  const monthlyArr = Object.entries(monthMap).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6)
    .map(([k,v]) => { const [,m] = k.split('-'); return { mes: MN[parseInt(m)-1], val: parseFloat(v.toFixed(2)) }; });
  const avgMonthly = monthlyArr.length > 0 ? monthlyArr.reduce((s,m)=>s+m.val,0) / monthlyArr.length : 0;

  const catMap = {};
  Object.entries(priceHistory).forEach(([id, recs]) => {
    const ing = ingMap[id]; if (!ing) return;
    recs.forEach((r: any) => { catMap[ing.category] = (catMap[ing.category]||0) + r.price; });
  });
  const catArr = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,v],i) => ({
    cat, val: parseFloat(v.toFixed(2)),
    rgb: CAT_HEX[cat] ? h2r(CAT_HEX[cat]) : PALETTE_RGB[i % PALETTE_RGB.length],
  }));
  const catTotal = catArr.reduce((s,c)=>s+c.val, 0);

  const storeMap2 = {};
  tickets.forEach(t => {
    const store = t.store || (t.filename?.toLowerCase().includes('mercadona')?'Mercadona':t.filename?.toLowerCase().includes('consum')?'Consum':t.filename?.toLowerCase().includes('carrefour')?'Carrefour':t.filename?.toLowerCase().includes('lidl')?'Lidl':t.filename?.toLowerCase().includes('aldi')?'Aldi':'Otro');
    if (!storeMap2[store]) storeMap2[store] = { total:0, count:0 };
    storeMap2[store].total += (t.total||0); storeMap2[store].count++;
  });
  const storeArr = Object.entries(storeMap2).sort((a,b)=>b[1].total-a[1].total);

  const topIngs = Object.entries(priceHistory).map(([id,recs]) => {
    const ing = ingMap[id]; if (!ing) return null;
    return { name: ing.name, total: parseFloat((recs as any[]).reduce((s,r)=>s+r.price,0).toFixed(2)) };
  }).filter(Boolean).sort((a,b)=>b.total-a.total).slice(0,8);

  // ── CABECERA ──
  doc.setFillColor(...C.headerDark); doc.rect(0,0,W,36,'F');
  doc.setFillColor(...C.headerMid);  doc.rect(0,0,8,36,'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text('MiDespensa', ml+2, 14);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Informe de Gastos - Historico completo', ml+2, 22);
  doc.setFontSize(8.5);
  doc.text(`${tickets.length} tickets  -  ${allTotal.toFixed(2)} EUR total`, ml+2, 30);
  const todayStr = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});
  doc.setFontSize(7.5); doc.setTextColor(...C.textLight);
  doc.text('Generado: '+todayStr, W-mr-doc.getTextWidth('Generado: '+todayStr), 30);

  let y = 46;

  // ── TARJETAS RESUMEN ──
  const summaryCards = [
    { label:'Gasto total',   val:allTotal.toFixed(2),     unit:'EUR',     bg:C.accentLight,  fg:C.textDark    },
    { label:'Media mensual', val:avgMonthly.toFixed(2),   unit:'EUR/mes', bg:[219,234,254],  fg:[29,78,216]   },
    { label:'Tickets',       val:String(tickets.length),  unit:'total',   bg:[254,249,195],  fg:[161,98,7]    },
    { label:'Tiendas',       val:String(storeArr.length), unit:'supers',  bg:[254,226,226],  fg:[220,38,38]   },
  ];
  const sCardW = (cw-9)/4;
  summaryCards.forEach((c,i) => {
    const cx = ml + i*(sCardW+3);
    doc.setFillColor(...c.bg); doc.roundedRect(cx,y,sCardW,22,2.5,2.5,'F');
    doc.setTextColor(...c.fg);
    doc.setFontSize(6); doc.setFont('helvetica','normal');
    doc.text(c.label.toUpperCase(), cx+sCardW/2, y+6, {align:'center'});
    doc.setFontSize(14); doc.setFont('helvetica','bold');
    doc.text(c.val, cx+sCardW/2, y+15, {align:'center'});
    doc.setFontSize(6); doc.setFont('helvetica','normal');
    doc.text(c.unit, cx+sCardW/2, y+19.5, {align:'center'});
  });
  y += 28;

  // ── GRÁFICO EVOLUCIÓN MENSUAL ──
  if (monthlyArr.length > 0) {
    doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Evolucion mensual del gasto', ml, y);
    y += 4;
    const chartH=50, chartX=ml+16, chartW=cw-16;
    const maxVal = Math.max(...monthlyArr.map(m=>m.val),1);
    const yMax = Math.ceil(maxVal/50)*50;
    doc.setFillColor(...C.bgLight); doc.rect(chartX,y,chartW,chartH,'F');
    for (let i=0; i<=4; i++) {
      const gy = y+chartH-(i/4)*chartH;
      doc.setDrawColor(200,240,235); doc.setLineWidth(0.2);
      doc.line(chartX,gy,chartX+chartW,gy);
      doc.setTextColor(...C.gray); doc.setFontSize(6); doc.setFont('helvetica','normal');
      doc.text(String(Math.round((i/4)*yMax)), chartX-1.5, gy+1, {align:'right'});
    }
    const bSpacing = chartW/monthlyArr.length;
    const bW = Math.min(bSpacing-4, 18);
    const maxMonthVal = Math.max(...monthlyArr.map(m=>m.val));
    monthlyArr.forEach((m,i) => {
      const bh = m.val>0 ? (m.val/yMax)*chartH : 0;
      const bx = chartX+i*bSpacing+(bSpacing-bW)/2;
      const by = y+chartH-bh;
      doc.setFillColor(...(m.val===maxMonthVal ? C.headerDark : C.accent));
      if (bh>0) {
        doc.roundedRect(bx,by,bW,bh,1.5,1.5,'F');
        if (bh>7) { doc.setTextColor(...C.textDark); doc.setFontSize(5); doc.text(m.val.toFixed(0)+'E', bx+bW/2, by-1, {align:'center'}); }
      }
      doc.setTextColor(...C.textMid); doc.setFontSize(6); doc.setFont('helvetica','bold');
      doc.text(m.mes.slice(0,3), bx+bW/2, y+chartH+4.5, {align:'center'});
    });
    y += chartH+12;
  }

  // ── CATEGORÍAS y SUPERMERCADOS (lado a lado) ──
  const halfW = (cw-6)/2;
  if (catArr.length>0 || storeArr.length>0) {
    const listRows = Math.max(catArr.length, storeArr.length);
    const listH = listRows*11+8;
    if (y+listH+20 > H-18) { doc.addPage(); y=20; }
    doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Gasto por categoria', ml, y);
    doc.text('Gasto por supermercado', ml+halfW+6, y);
    y += 5;

    // Panel categorías
    doc.setFillColor(...C.bgLight); doc.roundedRect(ml,y,halfW,listH,2,2,'F');
    let cy = y+7;
    catArr.slice(0,10).forEach((c) => {
      const pct = catTotal>0 ? c.val/catTotal : 0;
      const barMaxW = halfW-12;
      doc.setFillColor(...c.rgb); doc.roundedRect(ml+3,cy-3,4,4,0.5,0.5,'F');
      doc.setTextColor(50,50,60); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      doc.text(c.cat.length>18 ? c.cat.slice(0,17)+'.' : c.cat, ml+9, cy);
      doc.setFont('helvetica','bold'); doc.setTextColor(...C.textDark);
      const vtxt = c.val.toFixed(2)+'E'; doc.text(vtxt, ml+halfW-2-doc.getTextWidth(vtxt), cy);
      doc.setFillColor(220,245,240); doc.rect(ml+3,cy+2,barMaxW,1.5,'F');
      doc.setFillColor(...c.rgb);    doc.rect(ml+3,cy+2,pct*barMaxW,1.5,'F');
      cy += 11;
    });

    // Panel supermercados
    const sx = ml+halfW+6;
    doc.setFillColor(...C.bgLight); doc.roundedRect(sx,y,halfW,listH,2,2,'F');
    let sy = y+7;
    storeArr.forEach(([store,{total,count}]) => {
      const pct = allTotal>0 ? total/allTotal : 0;
      const barMaxW = halfW-12;
      const rgb = STORE_RGB[store] || [107,114,128];
      doc.setFillColor(...rgb); doc.roundedRect(sx+3,sy-3,4,4,0.5,0.5,'F');
      doc.setTextColor(50,50,60); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      doc.text(store, sx+9, sy);
      doc.setFontSize(5.5); doc.setTextColor(...C.gray);
      doc.text(`${count} ticket${count!==1?'s':''}`, sx+9, sy+3.5);
      doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.setTextColor(...C.textDark);
      const vtxt2 = total.toFixed(2)+'E'; doc.text(vtxt2, sx+halfW-2-doc.getTextWidth(vtxt2), sy);
      doc.setFillColor(220,245,240); doc.rect(sx+3,sy+2,barMaxW,1.5,'F');
      doc.setFillColor(...rgb);      doc.rect(sx+3,sy+2,pct*barMaxW,1.5,'F');
      sy += 11;
    });
    y += listH+10;
  }

  // ── TOP INGREDIENTES ──
  if (topIngs.length>0) {
    if (y+topIngs.length*10+20 > H-18) { doc.addPage(); y=20; }
    doc.setTextColor(...C.textDark); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Top ingredientes por gasto historico', ml, y);
    y += 5;
    const maxIngVal = topIngs[0].total;
    topIngs.forEach((ing,i) => {
      const iy = y+i*10;
      doc.setFillColor(...(i%2===0 ? C.bgLight : C.white));
      doc.roundedRect(ml,iy-3,cw,10,1,1,'F');
      doc.setTextColor(50,50,60); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      doc.text(`${i+1}. ${ing.name}`, ml+3, iy+4);
      doc.setFont('helvetica','bold'); doc.setTextColor(...C.textDark);
      const vtxt = ing.total.toFixed(2)+' EUR'; doc.text(vtxt, ml+cw-3-doc.getTextWidth(vtxt), iy+4);
      const bw = maxIngVal>0 ? (ing.total/maxIngVal)*(cw*0.5) : 0;
      doc.setFillColor(...C.accentLight); doc.rect(ml+cw*0.38,iy+1.5,cw*0.5,2,'F');
      doc.setFillColor(...C.accent);      doc.rect(ml+cw*0.38,iy+1.5,bw,2,'F');
    });
    y += topIngs.length*10+8;
  }

  _addFooter(doc, W, H, ml, mr);
  doc.save('informe-gastos-midespensa.pdf');
}

/* ── Pie de página compartido ─────────────────────────────── */
function _addFooter(doc, W, H, ml, mr) {
  const pages = doc.getNumberOfPages();
  for (let p=1; p<=pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(200,240,235); doc.setLineWidth(0.3);
    doc.line(ml, H-12, W-mr, H-12);
    doc.setTextColor(148,163,184); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
    doc.text('* Datos basados en los tickets y platos registrados en MiDespensa.', ml, H-7);
    doc.text(`MiDespensa  -  Pag. ${p}/${pages}`, W-mr, H-7, {align:'right'});
  }
}
