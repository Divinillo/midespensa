// @ts-nocheck
// @ts-ignore
import jsPDF from 'jspdf';

export async function generateNutriPDF(report, year, month, tickets=[]) {
  // Carga jsPDF dinámicamente
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297, ml = 14, mr = 14, cw = W - ml - mr;
  const MN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // ── CABECERA PÚRPURA ──
  doc.setFillColor(88, 28, 135);
  doc.rect(0, 0, W, 36, 'F');
  // Icono lateral
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, 8, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Despensa Familiar', ml + 2, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Informe Nutricional · Ultra Chef', ml + 2, 22);
  doc.setFontSize(8.5);
  const periodTxt = `${MN[month]} ${year}  ·  ${report.rows.length} día${report.rows.length!==1?'s':''} analizados`;
  doc.text(periodTxt, ml + 2, 30);
  const todayStr = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});
  doc.setFontSize(7.5);
  doc.setTextColor(216, 180, 254);
  const tw = doc.getTextWidth('Generado: '+todayStr);
  doc.text('Generado: '+todayStr, W - mr - tw, 30);

  let y = 46;

  // ── TARJETAS RESUMEN ──
  doc.setTextColor(60, 20, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Media diaria estimada', ml, y);
  y += 4;

  const cards = [
    {label:'Calorías', val:report.avg.kcal, unit:'kcal', bg:[255,237,213], fg:[194,65,12]},
    {label:'Proteínas', val:report.avg.prot, unit:'g/día', bg:[219,234,254], fg:[29,78,216]},
    {label:'Hidratos', val:report.avg.carbs, unit:'g/día', bg:[254,249,195], fg:[161,98,7]},
    {label:'Grasas', val:report.avg.fat, unit:'g/día', bg:[254,226,226], fg:[220,38,38]},
    {label:'Azúcar', val:report.avg.sugar, unit:'g/día', bg:[252,231,243], fg:[219,39,119]},
  ];
  const cCardW = (cw - 12) / 5;
  cards.forEach((c, i) => {
    const cx = ml + i * (cCardW + 3);
    doc.setFillColor(...c.bg);
    doc.roundedRect(cx, y, cCardW, 22, 2.5, 2.5, 'F');
    doc.setTextColor(...c.fg);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text(c.label.toUpperCase(), cx + cCardW/2, y + 6, {align:'center'});
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text(String(c.val), cx + cCardW/2, y + 15, {align:'center'});
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text(c.unit, cx + cCardW/2, y + 19.5, {align:'center'});
  });
  y += 28;

  // Totales acumulados
  doc.setFillColor(245, 240, 255);
  doc.roundedRect(ml, y, cw, 8, 1.5, 1.5, 'F');
  doc.setTextColor(109, 40, 217); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  const totTxt = `Total acumulado:  ${report.totals.kcal} kcal  ·  ${report.totals.prot}g prot  ·  ${report.totals.carbs}g HC  ·  ${report.totals.fat}g grasas  ·  ${report.totals.sugar}g azúcar`;
  doc.text(totTxt, ml + cw/2, y + 5.2, {align:'center'});
  y += 14;

  // ── GRÁFICO DE BARRAS: Calorías por día ──
  if (report.rows.length > 0) {
    doc.setTextColor(40, 20, 80); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Calorías por día', ml, y);
    y += 3;
    const chartH = 48, chartX = ml + 14, chartW = cw - 14;
    const maxKcal = Math.max(...report.rows.map(r => r.totKcal), 1);
    const yMax = Math.ceil(maxKcal / 500) * 500;

    // Fondo del gráfico
    doc.setFillColor(250, 248, 255);
    doc.rect(chartX, y, chartW, chartH, 'F');

    // Líneas de cuadrícula
    for (let i = 0; i <= 4; i++) {
      const gy = y + chartH - (i / 4) * chartH;
      doc.setDrawColor(220, 210, 240); doc.setLineWidth(0.2);
      doc.line(chartX, gy, chartX + chartW, gy);
      doc.setTextColor(160, 140, 200); doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(String(Math.round((i/4)*yMax)), chartX - 1.5, gy + 1, {align:'right'});
    }

    // Barras
    const barSpacing = chartW / report.rows.length;
    const barW = Math.min(barSpacing - 2, 11);
    report.rows.forEach((r, i) => {
      const bh = r.totKcal > 0 ? (r.totKcal / yMax) * chartH : 0;
      const bx = chartX + i * barSpacing + (barSpacing - barW) / 2;
      const by = y + chartH - bh;
      if (r.totKcal > 2200) doc.setFillColor(167, 20, 220);
      else if (r.totKcal > 1600) doc.setFillColor(109, 40, 217);
      else if (r.totKcal > 0) doc.setFillColor(196, 167, 255);
      else doc.setFillColor(230, 225, 245);
      if (bh > 0) {
        doc.roundedRect(bx, by, barW, bh, 1, 1, 'F');
        if (bh > 6) { // valor encima solo si hay espacio
          doc.setTextColor(80, 40, 140); doc.setFontSize(4.8);
          doc.text(String(r.totKcal), bx + barW/2, by - 0.5, {align:'center'});
        }
      } else {
        doc.rect(bx, y + chartH - 1.5, barW, 1.5, 'F');
      }
      // Etiqueta día
      doc.setTextColor(100, 80, 150); doc.setFontSize(5.5);
      doc.text(String(r.day), bx + barW/2, y + chartH + 4, {align:'center'});
    });
    // Eje X label
    doc.setTextColor(130, 100, 180); doc.setFontSize(7);
    doc.text('Día del mes', chartX + chartW/2, y + chartH + 9, {align:'center'});
    y += chartH + 14;
  }

  // ── DISTRIBUCIÓN DE MACROS (barra horizontal) ──
  if (report.totals.kcal > 0) {
    doc.setTextColor(40, 20, 80); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Distribución energética (media diaria)', ml, y);
    y += 4;
    const protKcal = report.avg.prot * 4;
    const carbsKcal = report.avg.carbs * 4;
    const fatKcal = report.avg.fat * 9;
    const totalMK = protKcal + carbsKcal + fatKcal || 1;
    const segs = [
      {pct:protKcal/totalMK, r:59,g:130,b:246, label:`Proteínas ${Math.round(protKcal/totalMK*100)}%`},
      {pct:carbsKcal/totalMK, r:234,g:179,b:8, label:`Hidratos ${Math.round(carbsKcal/totalMK*100)}%`},
      {pct:fatKcal/totalMK, r:239,g:68,b:68, label:`Grasas ${Math.round(fatKcal/totalMK*100)}%`},
    ];
    let bx2 = ml;
    segs.forEach(s => {
      const sw = s.pct * cw;
      doc.setFillColor(s.r, s.g, s.b);
      doc.rect(bx2, y, sw, 11, 'F');
      if (sw > 18) {
        doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont('helvetica','bold');
        doc.text(s.label, bx2 + sw/2, y + 7, {align:'center'});
      }
      bx2 += sw;
    });
    y += 11;
    // Leyenda detallada
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    const legItems = [
      {txt:`Proteínas: ${report.avg.prot}g · ${protKcal} kcal`, r:59,g:130,b:246},
      {txt:`Hidratos: ${report.avg.carbs}g · ${carbsKcal} kcal`, r:161,g:119,b:0},
      {txt:`Grasas: ${report.avg.fat}g · ${fatKcal} kcal`, r:239,g:68,b:68},
    ];
    let lx = ml;
    legItems.forEach(l => {
      doc.setFillColor(l.r,l.g,l.b);
      doc.rect(lx, y+3.5, 3, 3, 'F');
      doc.setTextColor(70,50,100);
      doc.text(l.txt, lx+4.5, y+6.2);
      lx += doc.getTextWidth(l.txt) + 10;
    });
    y += 12;
  }

  // ── TABLA DETALLADA POR DÍA ──
  if (report.rows.length > 0) {
    const rowH = 13, hdrH = 8;
    const neededH = hdrH + report.rows.length * rowH + 20;
    if (y + neededH > H - 18) { doc.addPage(); y = 20; }

    doc.setTextColor(40, 20, 80); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Detalle por día', ml, y);
    y += 4;

    const cols = [
      {h:'Día', x:ml, w:10},
      {h:'Comida', x:ml+10, w:46},
      {h:'Cena', x:ml+56, w:46},
      {h:'Kcal', x:ml+102, w:18},
      {h:'P', x:ml+120, w:13},
      {h:'HC', x:ml+133, w:13},
      {h:'G', x:ml+146, w:13},
      {h:'Az', x:ml+159, w:13},
    ];
    // Cabecera tabla
    doc.setFillColor(88, 28, 135);
    doc.rect(ml, y, cw, hdrH, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
    cols.forEach(c => doc.text(c.h, c.x+1.5, y+5.5));
    y += hdrH;

    report.rows.forEach((r, i) => {
      const ry = y + i * rowH;
      // Fondo alternado
      doc.setFillColor(i%2===0 ? 248 : 255, i%2===0 ? 245 : 255, i%2===0 ? 255 : 255);
      doc.rect(ml, ry, cw, rowH, 'F');

      doc.setTextColor(60,20,100); doc.setFontSize(7); doc.setFont('helvetica','bold');
      doc.text(String(r.day), ml+1.5, ry+5);

      doc.setFont('helvetica','normal'); doc.setTextColor(60,60,80);
      const lName = r.lunch ? (r.lunch.name.length>22?r.lunch.name.slice(0,22)+'…':r.lunch.name) : '—';
      const dName = r.dinner ? (r.dinner.name.length>22?r.dinner.name.slice(0,22)+'…':r.dinner.name) : '—';
      doc.text(lName, ml+11.5, ry+5);
      doc.text(dName, ml+57.5, ry+5);

      if (r.totKcal > 0) {
        doc.setFont('helvetica','bold');
        doc.setTextColor(194,65,12); doc.text(String(r.totKcal), ml+103.5, ry+5);
        doc.setTextColor(29,78,216); doc.text(`${r.totProt}g`, ml+121.5, ry+5);
        doc.setTextColor(161,98,7);  doc.text(`${r.totCarbs}g`, ml+134.5, ry+5);
        doc.setTextColor(220,38,38); doc.text(`${r.totFat}g`, ml+147.5, ry+5);
        doc.setTextColor(219,39,119); doc.text(`${r.totSugar}g`, ml+160.5, ry+5);
      } else {
        doc.setFont('helvetica','normal'); doc.setTextColor(190,190,190);
        doc.text('Sin datos', ml+103.5, ry+5);
      }

      // Sub-fila: kcal por comida y cena
      if (r.lMacros || r.dMacros) {
        doc.setTextColor(150,130,190); doc.setFontSize(5.8); doc.setFont('helvetica','normal');
        let sub = '';
        if (r.lMacros) sub += `☀ ${r.lMacros.kcal}kcal  `;
        if (r.dMacros) sub += `☽ ${r.dMacros.kcal}kcal`;
        doc.text(sub, ml+11.5, ry+9.5);
      }

      // Línea separadora
      doc.setDrawColor(220,210,240); doc.setLineWidth(0.1);
      doc.line(ml, ry+rowH, ml+cw, ry+rowH);
    });
    y += report.rows.length * rowH + 6;
  }

  // ── GASTO POR SUPERMERCADO ──
  if (tickets.length > 0) {
    const MN2 = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
    const monthTickets = tickets.filter(t=>t.date?.startsWith(monthKey));
    const storeMap = {};
    tickets.forEach(t=>{
      const s = t.store || (t.filename?.toLowerCase().includes('mercadona')?'Mercadona':t.filename?.toLowerCase().includes('consum')?'Consum':'Otro');
      if(!storeMap[s]) storeMap[s]={total:0,count:0,monthTotal:0};
      storeMap[s].total += (t.total||0);
      storeMap[s].count++;
      if(t.date?.startsWith(monthKey)) storeMap[s].monthTotal += (t.total||0);
    });
    const storeArr = Object.entries(storeMap).sort((a,b)=>b[1].total-a[1].total);
    const totalAll = storeArr.reduce((s,[,v])=>s+v.total,0);
    const totalMonth = monthTickets.reduce((s,t)=>s+(t.total||0),0);

    const neededH2 = 14 + storeArr.length * 14 + 20;
    if (y + neededH2 > H - 18) { doc.addPage(); y = 20; }

    doc.setTextColor(40, 20, 80); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Gasto por supermercado', ml, y);
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(130,100,180);
    doc.text(`Total histórico: ${totalAll.toFixed(2)}€  ·  ${MN2[month]}: ${totalMonth.toFixed(2)}€  ·  ${tickets.length} tickets`, ml, y+5);
    y += 10;

    storeArr.forEach(([store,{total,count,monthTotal}]) => {
      doc.setFillColor(248,246,255);
      doc.roundedRect(ml, y, cw, 12, 1.5, 1.5, 'F');
      doc.setTextColor(60,20,100); doc.setFontSize(8); doc.setFont('helvetica','bold');
      doc.text(store, ml+3, y+8);
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,80,140);
      doc.text(`${count} ticket${count!==1?'s':''}`, ml+50, y+8);
      if (monthTotal>0) {
        doc.setTextColor(29,120,29);
        doc.text(`Este mes: ${monthTotal.toFixed(2)}€`, ml+80, y+8);
      }
      doc.setFont('helvetica','bold'); doc.setTextColor(88,28,135); doc.setFontSize(9);
      const tw2 = doc.getTextWidth(total.toFixed(2)+'€');
      doc.text(total.toFixed(2)+'€', ml+cw-3-tw2, y+8);
      // Barra de progreso
      const barW2 = totalAll>0?(total/totalAll)*(cw-6):0;
      doc.setFillColor(196,167,255);
      doc.rect(ml+3, y+10, barW2, 1.5, 'F');
      y += 14;
    });
    y += 4;
  }

  // ── PIE DE PÁGINA ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(180,150,230); doc.setLineWidth(0.3);
    doc.line(ml, H-12, W-mr, H-12);
    doc.setTextColor(160,140,200); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
    doc.text('* Estimaciones orientativas por ración. No sustituyen asesoramiento nutricional profesional.', ml, H-7);
    doc.text(`Despensa Familiar · Ultra Chef  ·  Pág. ${p}/${pages}`, W-mr, H-7, {align:'right'});
  }

  const fileName = `informe-nutricional-${MN[month].toLowerCase()}-${year}.pdf`;
  doc.save(fileName);
}

/* ═══════════════════════════════════════
   INFORME NUTRICIONAL — Modal Ultra Chef
═══════════════════════════════════════ */
