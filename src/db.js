import Dexie from 'dexie';

export const db = new Dexie('PizzaProDB');

db.version(1).stores({
  insumos: 'id, nombre, categoria, archivado',
  lotesInsumo: 'id, insumoId, compraId, fecha, [insumoId+fecha]',
  productos: 'id, nombre, archivado',
  ventas: 'id, fecha, anulada',
  compras: 'id, insumoId, fecha',
  bajas: 'id, productoId, fecha, motivo',
  gastos: 'id, fecha, categoria',
  movCaja: 'id, fecha, tipo',
  arqueos: 'id, fecha',
  auditorias: 'id, fecha, estado',
  config: 'key'
});

db.version(2).stores({
  insumos: 'id, nombre, categoria, archivado',
  lotesInsumo: 'id, insumoId, compraId, fecha, [insumoId+fecha]',
  productos: 'id, nombre, archivado',
  ventas: 'id, fecha, anulada',
  compras: 'id, insumoId, fecha',
  bajas: 'id, productoId, fecha, motivo',
  gastos: 'id, fecha, categoria',
  movCaja: 'id, fecha, tipo',
  arqueos: 'id, fecha',
  auditorias: 'id, fecha, estado',
  socios: 'id, nombre, activo',
  distribuciones: 'id, fecha, socioId',
  capital: 'id, fecha, socioId',
  retiros: 'id, fecha',
  config: 'key'
});

if (typeof window !== 'undefined') window.db = db;

export const n = v => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
export const m = v => Math.round((n(v) + Number.EPSILON) * 10000) / 10000;
export const q = v => Math.round((n(v) + Number.EPSILON) * 10000) / 10000;

export const genId = prefix => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clean = obj => JSON.parse(JSON.stringify(obj));
export const P = (table, obj) => table.put(clean(obj));
export const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch(e){} };

export function fmt(v) {
  try { return '$' + n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  catch(e) { return '$0.00'; }
}

export function fmtCant(v) {
  const num = parseFloat(v);
  if (isNaN(num)) return '0';
  if (num % 1 === 0) return String(num);
  return num.toFixed(2).replace(/\.?0+$/, '');
}

export function fmtFecha(iso) {
  try {
    const d = new Date(iso);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2);
  } catch (e) { return ''; }
}

export function fmtFH(iso) {
  try {
    const d = new Date(iso);
    return fmtFecha(iso) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch (e) { return ''; }
}

export function buildData(state) {
  return clean({
    version: 2,
    fecha: new Date().toISOString(),
    cfg: state.cfg,
    insumos: state.insumos,
    lotesInsumo: state.lotesInsumo,
    productos: state.productos,
    ventas: state.ventas,
    compras: state.compras,
    bajas: state.bajas,
    gastos: state.gastos,
    movCaja: state.movCaja,
    arqueos: state.arqueos,
    auditorias: state.auditorias,
    socios: state.socios,
    distribuciones: state.distribuciones,
    capital: state.capital,
    retiros: state.retiros
  });
}
