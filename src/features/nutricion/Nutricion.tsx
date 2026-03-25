// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { useLS } from '../../hooks/useLS';

/* ── Colores Nutri-Score ───────────────────────────────────────── */
const NUTRI_COLOR = { a:'#038141', b:'#85bb2f', c:'#fecb02', d:'#ee8100', e:'#e63e11' };
const NUTRI_BG    = { a:'#e8f5e9', b:'#f1f8e9', c:'#fffde7', d:'#fff3e0', e:'#fce4ec' };

/* ── Nova group ───────────────────────────────────────────────── */
const NOVA_LABEL = ['','Sin procesar','Ingrediente culinario','Procesado','Ultraprocesado'];
const NOVA_COLOR = ['','#038141','#85bb2f','#ee8100','#e63e11'];
const NOVA_BG    = ['','#e8f5e9','#f1f8e9','#fff3e0','#fce4ec'];

/* ── Campos nutricionales a mostrar ──────────────────────────── */
const NUTRI_FIELDS = [
  { key:'energy-kcal_100g',      label:'Calorías',             icon:'🔥', unit:'kcal' },
  { key:'fat_100g',              label:'Grasas',                icon:'🧈', unit:'g'   },
  { key:'saturated-fat_100g',    label:'  ↳ Saturadas',        icon:'',   unit:'g'   },
  { key:'carbohydrates_100g',    label:'Hidratos de carbono',  icon:'🍞', unit:'g'   },
  { key:'sugars_100g',           label:'  ↳ Azúcares',         icon:'',   unit:'g'   },
  { key:'proteins_100g',         label:'Proteínas',             icon:'💪', unit:'g'   },
  { key:'fiber_100g',            label:'Fibra',                 icon:'🌿', unit:'g'   },
  { key:'salt_100g',             label:'Sal',                   icon:'🧂', unit:'g'   },
];

interface ScannedProduct {
  barcode: string;
  name: string;
  brand: string;
  nutriscore?: string;
  nova?: number;
  nutriments?: Record<string,number>;
  ingredients?: string;
  additives?: string[];
  image?: string;
  scannedAt: string;
}

export function Nutricion() {
  const [history, setHistory] = useLS<ScannedProduct[]>('scanner_history_v1', []);

  // idle | scanning | loading | result | error | manual
  const [mode, setMode]       = useState<string>('idle');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [errMsg, setErrMsg]   = useState('');
  const [manualCode, setManualCode] = useState('');

  const videoRef    = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);

  // Limpiar escáner al desmontar
  useEffect(() => () => stopScanner(), []);

  /* ── Parar escáner ─────────────────────────────────────────── */
  const stopScanner = () => {
    try { controlsRef.current?.stop(); } catch {}
    controlsRef.current = null;
  };

  /* ── Iniciar escáner live ─────────────────────────────────── */
  const startScanner = async () => {
    setMode('scanning');
    setErrMsg('');

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,  BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);

    try {
      // Solicitar cámara trasera
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCam = devices.find(d =>
        /back|rear|environment/i.test(d.label)
      );
      const deviceId = backCam?.deviceId ?? (devices[devices.length - 1]?.deviceId);

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result, err, ctrl) => {
          if (result) {
            ctrl.stop();
            fetchProduct(result.getText());
          }
        }
      );
      controlsRef.current = controls;
    } catch (e: any) {
      stopScanner();
      setErrMsg('No se pudo acceder a la cámara. Comprueba los permisos.');
      setMode('error');
    }
  };

  /* ── Buscar producto en Open Food Facts ───────────────────── */
  const fetchProduct = useCallback(async (code: string) => {
    if (!code.trim()) return;
    stopScanner();
    setMode('loading');
    setErrMsg('');
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code.trim()}.json`);
      const data = await res.json();
      if (data.status === 0 || !data.product) {
        setErrMsg(`Producto con código ${code} no encontrado en la base de datos.`);
        setMode('error');
        return;
      }
      const p = data.product;
      const scanned: ScannedProduct = {
        barcode:     code.trim(),
        name:        p.product_name || p.product_name_es || 'Sin nombre',
        brand:       p.brands || '',
        nutriscore:  p.nutriscore_grade?.toLowerCase(),
        nova:        p.nova_group ? Number(p.nova_group) : undefined,
        nutriments:  p.nutriments || {},
        ingredients: p.ingredients_text_es || p.ingredients_text || '',
        additives:   p.additives_tags || [],
        image:       p.image_front_small_url || p.image_url || '',
        scannedAt:   new Date().toISOString(),
      };
      setProduct(scanned);
      setMode('result');
      setHistory(h => [scanned, ...h.filter(x => x.barcode !== code.trim())].slice(0, 30));
    } catch {
      setErrMsg('Error de conexión. Comprueba internet e inténtalo de nuevo.');
      setMode('error');
    }
  }, [setHistory]);

  /* ── Reset ────────────────────────────────────────────────── */
  const reset = () => {
    stopScanner();
    setMode('idle');
    setProduct(null);
    setErrMsg('');
    setManualCode('');
  };

  /* ════════════════════════════════════════════════════════════
     VISTA: resultado
  ════════════════════════════════════════════════════════════ */
  if (mode === 'result' && product) {
    const VALID_NS = ['a','b','c','d','e'];
    const ns   = product.nutriscore && VALID_NS.includes(product.nutriscore) ? product.nutriscore : null;
    const nova = product.nova;
    const addCount = product.additives?.length ?? 0;
    return (
      <div className="fade">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <button onClick={reset}
            style={{ width:36, height:36, borderRadius:12, background:'#f1f5f9', border:'none', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ←
          </button>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'#1e293b' }}>Resultado del escaneo</div>
        </div>

        <div style={{ borderRadius:20, background:'#fff', border:'1.5px solid #e2e8f0', padding:'16px', marginBottom:12, boxShadow:'0 2px 10px rgba(0,0,0,.07)', display:'flex', gap:14, alignItems:'flex-start' }}>
          {product.image ? (
            <img src={product.image} alt={product.name}
              style={{ width:72, height:72, borderRadius:12, objectFit:'contain', background:'#f8fafc', border:'1px solid #f1f5f9', flexShrink:0 }} />
          ) : (
            <div style={{ width:72, height:72, borderRadius:12, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', flexShrink:0 }}>🛒</div>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:900, fontSize:'1rem', color:'#1e293b', marginBottom:2 }}>{product.name}</div>
            {product.brand && <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:6 }}>{product.brand}</div>}
            <div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>🔢 {product.barcode}</div>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          {ns && (
            <div style={{ flex:1, borderRadius:16, padding:'12px', background: NUTRI_BG[ns]||'#f8fafc', border:`2px solid ${NUTRI_COLOR[ns]||'#e2e8f0'}`, textAlign:'center' }}>
              <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Nutri-Score</div>
              <div style={{ width:38, height:38, borderRadius:10, background: NUTRI_COLOR[ns]||'#e2e8f0', color:'#fff', fontWeight:900, fontSize:'1.4rem', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 4px' }}>
                {ns.toUpperCase()}
              </div>
              <div style={{ fontSize:'0.65rem', color: NUTRI_COLOR[ns], fontWeight:700 }}>
                {ns==='a'?'Excelente':ns==='b'?'Bueno':ns==='c'?'Aceptable':ns==='d'?'Malo':'Muy malo'}
              </div>
            </div>
          )}
          {nova && (
            <div style={{ flex:1, borderRadius:16, padding:'12px', background: NOVA_BG[nova]||'#f8fafc', border:`2px solid ${NOVA_COLOR[nova]||'#e2e8f0'}`, textAlign:'center' }}>
              <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Nova</div>
              <div style={{ width:38, height:38, borderRadius:10, background: NOVA_COLOR[nova]||'#e2e8f0', color:'#fff', fontWeight:900, fontSize:'1.4rem', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 4px' }}>
                {nova}
              </div>
              <div style={{ fontSize:'0.62rem', color: NOVA_COLOR[nova], fontWeight:700, lineHeight:1.3 }}>{NOVA_LABEL[nova]||''}</div>
            </div>
          )}
          <div style={{ flex:1, borderRadius:16, padding:'12px', background: addCount>0?'#fff3e0':'#e8f5e9', border:`2px solid ${addCount>0?'#ee8100':'#038141'}`, textAlign:'center' }}>
            <div style={{ fontSize:'0.62rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Aditivos</div>
            <div style={{ fontWeight:900, fontSize:'1.4rem', color: addCount>0?'#ee8100':'#038141', lineHeight:1, marginBottom:4 }}>{addCount}</div>
            <div style={{ fontSize:'0.65rem', color: addCount>0?'#ee8100':'#038141', fontWeight:700 }}>
              {addCount===0?'Ninguno':addCount<=3?'Pocos':addCount<=6?'Moderados':'Muchos'}
            </div>
          </div>
        </div>

        {/* Tabla nutricional */}
        {product.nutriments && Object.keys(product.nutriments).length > 0 && (
          <div style={{ borderRadius:16, background:'#fff', border:'1.5px solid #e2e8f0', overflow:'hidden', marginBottom:12, boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
            <div style={{ padding:'10px 14px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ fontWeight:800, fontSize:'0.82rem', color:'#1e293b' }}>📊 Valores nutricionales</div>
              <div style={{ fontSize:'0.65rem', color:'#94a3b8', marginTop:1 }}>Por 100g / 100ml</div>
            </div>
            {NUTRI_FIELDS.map(f => {
              const val = product.nutriments![f.key];
              if (val == null) return null;
              const isSubRow = f.label.startsWith('  ↳');
              return (
                <div key={f.key} style={{ display:'flex', alignItems:'center', padding:'9px 14px', borderBottom:'1px solid #f8fafc', background: isSubRow?'#fafafa':'#fff' }}>
                  <div style={{ width:22, flexShrink:0, fontSize:'0.9rem' }}>{f.icon}</div>
                  <div style={{ flex:1, fontSize: isSubRow?'0.75rem':'0.82rem', color: isSubRow?'#94a3b8':'#374151', paddingLeft: isSubRow?12:0, fontWeight: isSubRow?500:600 }}>
                    {f.label.replace('  ↳ ','')}
                  </div>
                  <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#1e293b' }}>
                    {Number(val).toFixed(1)} <span style={{ fontWeight:400, fontSize:'0.7rem', color:'#94a3b8' }}>{f.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ingredientes */}
        {product.ingredients && (
          <div style={{ borderRadius:16, background:'#fff', border:'1.5px solid #e2e8f0', padding:'12px 14px', marginBottom:12, boxShadow:'0 1px 6px rgba(0,0,0,.05)' }}>
            <div style={{ fontWeight:800, fontSize:'0.82rem', color:'#1e293b', marginBottom:6 }}>🧪 Ingredientes</div>
            <div style={{ fontSize:'0.72rem', color:'#475569', lineHeight:1.6 }}>
              {product.ingredients.length > 300 ? product.ingredients.slice(0,300)+'…' : product.ingredients}
            </div>
          </div>
        )}

        {/* Aditivos */}
        {addCount > 0 && (
          <div style={{ borderRadius:16, background:'#fff3e0', border:'1.5px solid #fde68a', padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:'0.82rem', color:'#92400e', marginBottom:8 }}>⚠️ Aditivos detectados ({addCount})</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {product.additives!.slice(0,15).map(a => (
                <span key={a} style={{ fontSize:'0.68rem', padding:'3px 8px', borderRadius:8, background:'#fff', border:'1px solid #fde68a', color:'#92400e', fontWeight:600 }}>
                  {a.replace('en:','').toUpperCase()}
                </span>
              ))}
              {addCount > 15 && <span style={{ fontSize:'0.68rem', color:'#b45309' }}>+{addCount-15} más</span>}
            </div>
          </div>
        )}

        <button onClick={startScanner}
          style={{ width:'100%', borderRadius:16, padding:'14px', fontWeight:800, fontSize:'0.9rem', color:'#fff', background:'linear-gradient(135deg,#15803d,#16a34a)', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(22,163,74,.35)', marginTop:4 }}>
          📷 Escanear otro producto
        </button>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     VISTA: cargando
  ════════════════════════════════════════════════════════════ */
  if (mode === 'loading') {
    return (
      <div className="fade" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:16, textAlign:'center' }}>
        <div style={{ fontSize:'2.4rem', animation:'spin 1s linear infinite' }}>⏳</div>
        <div style={{ fontWeight:700, fontSize:'1rem', color:'#15803d' }}>Buscando producto…</div>
        <div style={{ fontSize:'0.78rem', color:'#94a3b8' }}>Consultando base de datos mundial de alimentos</div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     VISTA: error
  ════════════════════════════════════════════════════════════ */
  if (mode === 'error') {
    return (
      <div className="fade" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center', padding:'40px 20px' }}>
        <div style={{ fontSize:'3rem' }}>😕</div>
        <div style={{ fontWeight:800, fontSize:'1rem', color:'#dc2626' }}>{errMsg}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:300 }}>
          <button onClick={startScanner}
            style={{ borderRadius:14, padding:'12px 24px', fontWeight:700, fontSize:'0.9rem', color:'#fff', background:'#16a34a', border:'none', cursor:'pointer' }}>
            📷 Intentar de nuevo
          </button>
          <button onClick={() => setMode('manual')}
            style={{ borderRadius:14, padding:'12px 24px', fontWeight:700, fontSize:'0.9rem', color:'#16a34a', background:'#f0fdf4', border:'2px solid #86efac', cursor:'pointer' }}>
            ⌨️ Introducir código manualmente
          </button>
          <button onClick={reset}
            style={{ fontSize:'0.8rem', color:'#94a3b8', background:'none', border:'none', cursor:'pointer' }}>
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     VISTA: escáner en vivo
  ════════════════════════════════════════════════════════════ */
  if (mode === 'scanning') {
    return (
      <div className="fade">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <button onClick={reset}
            style={{ width:36, height:36, borderRadius:12, background:'#f1f5f9', border:'none', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ←
          </button>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'#1e293b' }}>Apunta al código de barras</div>
        </div>

        {/* Visor de cámara */}
        <div style={{ position:'relative', borderRadius:20, overflow:'hidden', background:'#000', aspectRatio:'4/3', marginBottom:14 }}>
          <video ref={videoRef} playsInline muted autoPlay
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          {/* Marco de escaneo */}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:'75%', height:'28%', position:'relative' }}>
              {/* Esquinas del marco */}
              {[
                { top:0, left:0, borderTop:'3px solid #4ade80', borderLeft:'3px solid #4ade80', borderRadius:'8px 0 0 0' },
                { top:0, right:0, borderTop:'3px solid #4ade80', borderRight:'3px solid #4ade80', borderRadius:'0 8px 0 0' },
                { bottom:0, left:0, borderBottom:'3px solid #4ade80', borderLeft:'3px solid #4ade80', borderRadius:'0 0 0 8px' },
                { bottom:0, right:0, borderBottom:'3px solid #4ade80', borderRight:'3px solid #4ade80', borderRadius:'0 0 8px 0' },
              ].map((s, i) => (
                <div key={i} style={{ position:'absolute', width:22, height:22, ...s }} />
              ))}
              {/* Línea de escaneo animada */}
              <div style={{
                position:'absolute', left:0, right:0, height:2,
                background:'linear-gradient(90deg,transparent,#4ade80,transparent)',
                animation:'scanline 1.8s ease-in-out infinite',
              }} />
            </div>
            {/* Oscurecer los bordes */}
            <div style={{ position:'absolute', inset:0, boxShadow:'inset 0 0 0 9999px rgba(0,0,0,.35)', pointerEvents:'none' }} />
          </div>
          <div style={{ position:'absolute', bottom:14, left:0, right:0, textAlign:'center' }}>
            <span style={{ fontSize:'0.75rem', color:'#fff', background:'rgba(0,0,0,.55)', padding:'4px 14px', borderRadius:20, fontWeight:600 }}>
              🔍 Buscando código…
            </span>
          </div>
        </div>

        <style>{`
          @keyframes scanline {
            0%   { top: 10%; }
            50%  { top: 80%; }
            100% { top: 10%; }
          }
        `}</style>

        <div style={{ textAlign:'center' }}>
          <button onClick={() => { stopScanner(); setMode('manual'); }}
            style={{ fontSize:'0.75rem', color:'#64748b', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            Introducir código manualmente
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     VISTA: código manual
  ════════════════════════════════════════════════════════════ */
  if (mode === 'manual') {
    return (
      <div className="fade">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <button onClick={reset}
            style={{ width:36, height:36, borderRadius:12, background:'#f1f5f9', border:'none', fontSize:'1.1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ←
          </button>
          <div style={{ fontWeight:800, fontSize:'1rem', color:'#1e293b' }}>Código de barras manual</div>
        </div>
        <input
          value={manualCode}
          onChange={e => setManualCode(e.target.value.replace(/\D/g,''))}
          placeholder="Ej: 8410128001234"
          inputMode="numeric"
          autoFocus
          onKeyDown={e => e.key==='Enter' && manualCode.length>=8 && fetchProduct(manualCode)}
          style={{ width:'100%', borderRadius:14, border:'2px solid #86efac', padding:'14px 16px', fontSize:'1.1rem', fontWeight:700, letterSpacing:'0.08em', textAlign:'center', outline:'none', background:'#f0fdf4', boxSizing:'border-box', marginBottom:12 }}
        />
        <button onClick={() => fetchProduct(manualCode)} disabled={manualCode.length < 8}
          style={{ width:'100%', borderRadius:14, padding:'14px', fontWeight:800, fontSize:'0.9rem', color:'#fff', background: manualCode.length>=8?'#16a34a':'#d1d5db', border:'none', cursor: manualCode.length>=8?'pointer':'not-allowed', boxShadow: manualCode.length>=8?'0 4px 14px rgba(22,163,74,.35)':'none' }}>
          🔍 Buscar producto
        </button>
        <div style={{ textAlign:'center', marginTop:12 }}>
          <button onClick={startScanner}
            style={{ fontSize:'0.75rem', color:'#16a34a', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
            📷 Volver al escáner
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     VISTA: pantalla principal (idle)
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="fade">
      {/* Hero */}
      <div style={{ borderRadius:24, padding:'28px 20px', textAlign:'center', marginBottom:20, background:'linear-gradient(135deg,#15803d,#16a34a)', color:'#fff', boxShadow:'0 8px 28px rgba(22,163,74,.35)' }}>
        <div style={{ fontSize:'3rem', marginBottom:8 }}>📷</div>
        <div style={{ fontWeight:900, fontSize:'1.2rem', marginBottom:6 }}>Escáner de alimentos</div>
        <div style={{ fontSize:'0.8rem', opacity:.8, marginBottom:20, lineHeight:1.5 }}>
          Apunta la cámara al código de barras para ver Nutri-Score, Nova, aditivos y tabla nutricional
        </div>
        <button onClick={startScanner}
          style={{ borderRadius:16, padding:'14px 32px', fontWeight:800, fontSize:'1rem', color:'#16a34a', background:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(0,0,0,.15)', display:'inline-flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'1.3rem' }}>📷</span> Abrir escáner
        </button>
        <div style={{ marginTop:10 }}>
          <button onClick={() => setMode('manual')}
            style={{ fontSize:'0.72rem', color:'rgba(255,255,255,.7)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
            Introducir código manualmente
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
        {[
          { emoji:'🅰️', title:'Nutri-Score', desc:'Calidad nutricional A→E' },
          { emoji:'🔬', title:'Grupo Nova',  desc:'Nivel de procesamiento 1→4' },
          { emoji:'⚠️', title:'Aditivos',    desc:'Conservantes, colorantes…' },
          { emoji:'📊', title:'Nutrición',   desc:'Kcal, grasas, proteínas…' },
        ].map(item => (
          <div key={item.title} style={{ borderRadius:14, background:'#fff', border:'1px solid #f1f5f9', padding:'10px 12px', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize:'1.2rem', marginBottom:4 }}>{item.emoji}</div>
            <div style={{ fontWeight:700, fontSize:'0.78rem', color:'#1e293b', marginBottom:1 }}>{item.title}</div>
            <div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#1e293b' }}>🕓 Escaneados recientemente</div>
            <button onClick={() => setHistory([])}
              style={{ fontSize:'0.7rem', color:'#f87171', background:'none', border:'none', cursor:'pointer' }}>
              Borrar todo
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {history.slice(0,10).map(p => {
              const ns = p.nutriscore;
              return (
                <button key={p.barcode + p.scannedAt} onClick={() => { setProduct(p); setMode('result'); }}
                  style={{ width:'100%', textAlign:'left', borderRadius:14, background:'#fff', border:'1.5px solid #f1f5f9', padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                  {p.image
                    ? <img src={p.image} alt={p.name} style={{ width:44, height:44, borderRadius:10, objectFit:'contain', background:'#f8fafc', flexShrink:0 }} />
                    : <div style={{ width:44, height:44, borderRadius:10, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0 }}>🛒</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                    {p.brand && <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>{p.brand}</div>}
                  </div>
                  {ns && (
                    <div style={{ width:28, height:28, borderRadius:8, background: NUTRI_COLOR[ns]||'#94a3b8', color:'#fff', fontWeight:900, fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {ns.toUpperCase()}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', marginTop:24, fontSize:'0.65rem', color:'#cbd5e1' }}>
        Datos de <strong>Open Food Facts</strong> · Licencia ODbL · Más de 3 millones de productos
      </div>
    </div>
  );
}
