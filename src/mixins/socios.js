// Mixin de Socios: registro, aportes, retiros, reparto de ganancias.
// La app le pasa el state por `this` (Options API).
import { db, n, m, genId, clean, P, fmt } from '../db.js';
import { TOAST } from '../constants.js';

export default {
  data() {
    return {
      socios: [],
      distribuciones: [],
      capital: [],
      retiros: [],
      socioForm: { editId: '', nombre: '', porcentaje: '', aporte: '' },
      repartoForm: { monto: '', concepto: '' },
      retiroForm: { monto: '', concepto: '' },
      aporteForm: { monto: '', nota: '', socioId: '' },
      retiroAbierto: false,
      aporteAbierto: false
    };
  },

  computed: {
    sociosActivos() { return this.socios.filter(s => s.activo !== false); },
    sumaPorcentajes() { return m(this.sociosActivos.reduce((s, x) => s + n(x.porcentaje), 0)); },
    totalDistribuido() { return m(this.distribuciones.reduce((s, d) => s + n(d.monto), 0)); },
    distribucionesOrdenadas() { return this.distribuciones.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); },
    aportesTotal() { return m(this.capital.reduce((s, x) => s + n(x.monto), 0)); },
    retirosTotal() { return m(this.retiros.reduce((s, x) => s + n(x.monto), 0)); },
    capitalTotal() { return m(n(this.cfg.capitalInicial) + this.aportesTotal); },
    gananciaDisponible() {
      return m(this.gananciaNetaPeriodo - this.totalDistribuido - this.retirosTotal);
    },
    movPatrimonio() {
      const movs = [
        ...this.capital.map(x => ({ id: x.id, tipo: 'Aporte', fecha: x.fecha, monto: x.monto, nota: x.nota })),
        ...this.retiros.map(x => ({ id: x.id, tipo: 'Retiro', fecha: x.fecha, monto: x.monto, nota: x.concepto }))
      ];
      return movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }
  },

  methods: {
    resetSocio() {
      this.socioForm = { editId: '', nombre: '', porcentaje: '', aporte: '' };
    },

    async guardarSocio() {
      const f = this.socioForm;
      const nombre = (f.nombre || '').trim();
      const pct = n(f.porcentaje);
      if (!nombre) return this.toastMsg('Nombre obligatorio', TOAST.BAD);
      if (pct < 0 || pct > 100) return this.toastMsg('Porcentaje entre 0 y 100', TOAST.BAD);
      const dup = this.socios.find(x => x.nombre.toLowerCase() === nombre.toLowerCase() && x.id !== f.editId);
      if (dup) return this.toastMsg('Ya existe ese socio', TOAST.BAD);
      try {
        if (f.editId) {
          const o = this.socios.find(x => x.id === f.editId);
          await P(db.socios, { ...o, nombre, porcentaje: pct, aporte: n(f.aporte) });
          this.toastMsg('Socio actualizado');
        } else {
          await P(db.socios, {
            id: genId('so'), nombre, porcentaje: pct, aporte: n(f.aporte),
            fecha: new Date().toISOString(), activo: true
          });
          this.toastMsg('Socio agregado');
        }
        this.resetSocio();
        await this.recargar(['socios']);
      } catch (e) { this.toastMsg(e.message, TOAST.BAD); }
    },

    editarSocio(id) {
      const s = this.socios.find(x => x.id === id);
      if (!s) return;
      this.socioForm = {
        editId: id, nombre: s.nombre,
        porcentaje: String(s.porcentaje || ''),
        aporte: String(s.aporte || '')
      };
      window.scrollTo(0, 0);
    },

    eliminarSocio(id) {
      const s = this.socios.find(x => x.id === id);
      if (!s) return;
      this.confirm = {
        activo: true, titulo: 'Eliminar socio',
        msg: '¿Eliminar a "' + s.nombre + '"? Las distribuciones previas se conservan.',
        onOk: async () => {
          await db.socios.delete(id);
          await this.recargar(['socios']);
          this.toastMsg('Socio eliminado');
        }
      };
    },

    async repartirGanancia() {
      const monto = n(this.repartoForm.monto);
      const concepto = (this.repartoForm.concepto || '').trim() || 'Reparto de ganancia';
      if (monto <= 0) return this.toastMsg('Monto inválido', TOAST.BAD);
      if (!this.sociosActivos.length) return this.toastMsg('Sin socios activos', TOAST.BAD);
      if (monto > this.gananciaDisponible + 0.01) return this.toastMsg('Máximo ' + fmt(this.gananciaDisponible), TOAST.BAD);
      if (Math.abs(this.sumaPorcentajes - 100) > 0.01) return this.toastMsg('Los porcentajes deben sumar 100%', TOAST.BAD);
      try {
        const dists = this.sociosActivos.map(s => ({
          id: genId('di'),
          fecha: new Date().toISOString(),
          socioId: s.id,
          socioNombre: s.nombre,
          montoTotal: monto,
          monto: m(monto * n(s.porcentaje) / 100),
          porcentaje: n(s.porcentaje),
          concepto
        }));
        await db.transaction('rw', db.distribuciones, db.retiros, async () => {
          await db.distribuciones.bulkPut(dists.map(x => clean(x)));
          await P(db.retiros, {
            id: genId('r'),
            fecha: new Date().toISOString(),
            monto,
            concepto: 'Reparto: ' + concepto,
            socios: dists.map(d => ({ socioId: d.socioId, nombre: d.socioNombre, monto: d.monto }))
          });
        });
        await this.recargar(['distribuciones', 'retiros']);
        this.repartoForm = { monto: '', concepto: '' };
        this.toastMsg('Repartido ' + fmt(monto));
      } catch (e) { this.toastMsg(e.message, TOAST.BAD); }
    },

    async registrarRetiro() {
      const monto = n(this.retiroForm.monto);
      const c = (this.retiroForm.concepto || '').trim();
      if (monto <= 0) return this.toastMsg('Monto inválido', TOAST.BAD);
      if (!c) return this.toastMsg('Concepto obligatorio', TOAST.BAD);
      if (monto > this.gananciaDisponible + 0.01) return this.toastMsg('Máximo ' + fmt(this.gananciaDisponible), TOAST.BAD);
      try {
        await P(db.retiros, {
          id: genId('r'), fecha: new Date().toISOString(), monto, concepto: c
        });
        await this.recargar(['retiros']);
        this.retiroForm = { monto: '', concepto: '' };
        this.retiroAbierto = false;
        this.toastMsg('Retiro registrado');
      } catch (e) { this.toastMsg(e.message, TOAST.BAD); }
    },

    async registrarAporte() {
      const monto = n(this.aporteForm.monto);
      if (monto <= 0) return this.toastMsg('Monto inválido', TOAST.BAD);
      try {
        await P(db.capital, {
          id: genId('k'), fecha: new Date().toISOString(),
          monto, nota: this.aporteForm.nota || '',
          socioId: this.aporteForm.socioId || null
        });
        await this.recargar(['capital']);
        this.aporteForm = { monto: '', nota: '', socioId: '' };
        this.aporteAbierto = false;
        this.toastMsg('Aporte registrado');
      } catch (e) { this.toastMsg(e.message, TOAST.BAD); }
    },

    totalPorSocio(sid) {
      return m(this.distribuciones.filter(d => d.socioId === sid).reduce((s, x) => s + n(x.monto), 0));
    },

    totalAportesSocio(sid) {
      return m(this.capital.filter(c => c.socioId === sid).reduce((s, x) => s + n(x.monto), 0));
    }
  }
};
