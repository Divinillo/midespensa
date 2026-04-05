// @ts-nocheck
import React, { useState, useRef } from 'react';
import type { NutriPer100 } from '../../data/types';
import { readNutritionLabel } from '../../utils/nutriReader';

interface Props {
  ingName: string;
  existing?: NutriPer100;
  onSave: (n: NutriPer100) => void;
  onClose: () => void;
}

const FIELDS: { key: keyof NutriPer100; label: string; icon: string; required?: boolean }[] = [
  { key: 'kcal',      label: 'Calorías',        icon: '🔥', required: true },
  { key: 'fat',       label: 'Grasas',           icon: '🧈', required: true },
  { key: 'saturates', label: 'de las cuales satur.', icon: '↳' },
  { key: 'carbs',     label: 'Hidratos de carbono', icon: '🍞', required: true },
  { key: 'sugar',     label: 'de los cuales azúcares', icon: '↳' },
  { key: 'prot',      label: 'Proteínas',        icon: '💪', required: true },
  { key: 'fiber',     label: 'Fibra',            icon: '🌿' },
  { key: 'salt',      label: 'Sal',              icon: '🧂' },
];

export function NutritionLabelModal({ ingName, existing, onSave, onClose }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [values, setValues] = useState<Partial<NutriPer100>>(existing || {});
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setErrorMsg('Selecciona una imagen (jpg, png, webp…)'); return; }
    setStatus('loading');
    setProgress(0);
    setErrorMsg('');
    try {
      const parsed = await readNutritionLabel(file, p => setProgress(p));
      setValues(prev => ({ ...prev, ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)) }));
      setStatus('done');
    } catch (e) {
      console.error(e);
      setStatus('error');
      setErrorMsg('No se pudo leer la etiqueta. Inténtalo con una foto más nítida.');
    }
  };

  const set = (key: keyof NutriPer100, raw: string) => {
    const v = parseFloat(raw.replace(',', '.'));
    setValues(prev => ({ ...prev, [key]: isNaN(v) ? undefined : v }));
  };

  const canSave = values.kcal != null && values.prot != null && values.carbs != null && values.fat != null;

  const handleSave = () => {
    if (!canSave) return;
    onSave(values as NutriPer100);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', paddingBottom: 32 }}>

        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: '#fff', borderRadius: '24px 24px 0 0', padding: '18px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b' }}>📊 Valor nutricional</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{ingName} · por 100g / 100ml</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#f1f5f9', border: 'none', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* OCR scan zone */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              📷 Escanear etiqueta (Pro)
            </div>

            {status === 'idle' && (
              <div onClick={() => fileRef.current?.click()}
                style={{ borderRadius: 16, border: '2px dashed #a7f3d0', background: '#f0fdf4', padding: '20px 16px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>📸</div>
                <div style={{ fontWeight: 700, color: '#0f766e', fontSize: '0.85rem' }}>Toca para hacer foto a la etiqueta</div>
                <div style={{ fontSize: '0.68rem', color: '#5eead4', marginTop: 3 }}>jpg · png · webp · heic</div>
              </div>
            )}

            {status === 'loading' && (
              <div style={{ borderRadius: 16, background: '#f0fdf4', border: '1.5px solid #5eead4', padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>⏳</div>
                <div style={{ fontWeight: 700, color: '#0f766e', fontSize: '0.85rem', marginBottom: 8 }}>Leyendo etiqueta… {progress}%</div>
                <div style={{ height: 6, borderRadius: 6, background: '#f0fdfa', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, background: '#0d9488', width: `${progress}%`, transition: 'width .3s' }} />
                </div>
              </div>
            )}

            {status === 'done' && (
              <div style={{ borderRadius: 16, background: '#f0fdf4', border: '2px solid #2dd4bf', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f766e', fontSize: '0.82rem' }}>Etiqueta leída — revisa los valores</div>
                  <button onClick={() => { setStatus('idle'); fileRef.current?.click(); }}
                    style={{ fontSize: '0.68rem', color: '#0d9488', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, marginTop: 2 }}>
                    Volver a escanear
                  </button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div style={{ borderRadius: 16, background: '#fef2f2', border: '1.5px solid #fca5a5', padding: '12px 16px' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.82rem', marginBottom: 4 }}>⚠️ {errorMsg}</div>
                <button onClick={() => setStatus('idle')}
                  style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  Intentar de nuevo
                </button>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            <span style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 600 }}>O INTRODUCE MANUALMENTE</span>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: f.icon === '↳' ? '0.75rem' : '1rem', color: '#94a3b8', flexShrink: 0 }}>{f.icon}</div>
                <div style={{ flex: 1, fontSize: '0.8rem', color: '#475569', fontWeight: f.required ? 700 : 500, paddingLeft: f.icon === '↳' ? 8 : 0 }}>
                  {f.label} {f.required && <span style={{ color: '#f87171' }}>*</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="—"
                    value={values[f.key] != null ? String(values[f.key]) : ''}
                    onChange={e => set(f.key, e.target.value)}
                    style={{ width: 68, borderRadius: 10, padding: '6px 8px', fontSize: '0.82rem', textAlign: 'right', border: `1.5px solid ${values[f.key] != null ? '#5eead4' : '#e2e8f0'}`, background: values[f.key] != null ? '#f0fdf4' : '#f8fafc', outline: 'none', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', width: 28 }}>{f.key === 'kcal' ? 'kcal' : 'g'}</span>
                </div>
              </div>
            ))}
          </div>

          {!canSave && (
            <div style={{ fontSize: '0.68rem', color: '#f87171', textAlign: 'center' }}>
              Rellena al menos calorías, grasas, hidratos y proteínas
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={handleSave} disabled={!canSave}
              style={{ flex: 1, borderRadius: 14, padding: '13px', fontSize: '0.9rem', fontWeight: 800, color: '#fff', background: canSave ? '#0d9488' : '#d1d5db', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', boxShadow: canSave ? '0 4px 12px rgba(13,148,136,.3)' : 'none' }}>
              💾 Guardar
            </button>
            {existing && (
              <button onClick={() => onSave(null as any)}
                style={{ padding: '13px 16px', borderRadius: 14, fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1.5px solid #fecaca', cursor: 'pointer' }}>
                🗑️ Borrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
