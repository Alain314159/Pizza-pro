import { n } from '../db.js';
import { TOAST } from '../constants.js';

export default {
  data() {
    return {
      _notifTimer: null,
      soportaNotif: typeof window !== 'undefined' && 'Notification' in window
    };
  },

  methods: {
    async pedirPermisoNotif() {
      if (!('Notification' in window)) return this.toastMsg('Sin soporte de notificaciones', TOAST.WARN);
      if (Notification.permission === 'granted') {
        this.cfg.notifActivo = true;
        await this.guardarCfg();
        return;
      }
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          this.cfg.notifActivo = true;
          await this.guardarCfg();
          this.enviarNotif('Pizza Pro', 'Notificaciones activadas');
          this.toastMsg('Notificaciones activadas');
        } else {
          this.toastMsg('Permiso denegado', TOAST.BAD);
        }
      } catch (e) { this.toastMsg('Error: ' + e.message, TOAST.BAD); }
    },

    async desactivarNotif() {
      this.cfg.notifActivo = false;
      await this.guardarCfg();
      this.toastMsg('Notificaciones desactivadas');
    },

    async enviarNotif(titulo, cuerpo) {
      try {
        if (!('Notification' in window)) return { ok: false };
        if (Notification.permission !== 'granted') return { ok: false };
        const opts = {
          body: cuerpo,
          icon: '/Pizza-pro/icons/icon-192.png',
          badge: '/Pizza-pro/icons/icon-192.png',
          tag: 'pizza-' + Date.now()
        };
        const conTimeout = (promesa, ms) => Promise.race([
          promesa,
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
        ]);
        if ('serviceWorker' in navigator) {
          try {
            const reg = await conTimeout(navigator.serviceWorker.ready, 3000);
            if (reg && reg.showNotification) {
              await conTimeout(reg.showNotification(titulo, opts), 3000);
              return { ok: true, via: 'sw' };
            }
          } catch (e) {}
        }
        try {
          new Notification(titulo, opts);
          return { ok: true, via: 'constructor' };
        } catch (e2) { return { ok: false }; }
      } catch (e) { return { ok: false }; }
    },

    async chequearNotificaciones() {
      if (!this.cfg.notifActivo) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const hoy = new Date().toISOString().split('T')[0];
      let cambio = false;

      // Stock bajo
      const bajo = this.insumosBajoStock.length;
      if (bajo > 0 && this.cfg.ultimaNotifStock !== hoy) {
        this.enviarNotif('Insumos bajo stock', bajo + ' insumo(s) por debajo del minimo');
        this.cfg.ultimaNotifStock = hoy;
        cambio = true;
      }

      // Auditoría pendiente
      const ultAud = this.cfg.ultimaAuditoria;
      if (ultAud) {
        const dias = Math.floor((Date.now() - new Date(ultAud).getTime()) / 86400000);
        if (dias >= (this.cfg.umbralDiasAuditoria || 7) && this.cfg.ultimaNotifAuditoria !== hoy) {
          this.enviarNotif('Auditoria pendiente', dias + ' dias sin auditar insumos');
          this.cfg.ultimaNotifAuditoria = hoy;
          cambio = true;
        }
      }

      if (cambio) await this.guardarCfg();
    },

    async pedirPersistenciaStorage() {
      try {
        if (!navigator.storage || !navigator.storage.persist) return false;
        const ya = await navigator.storage.persisted();
        if (ya) { this.storagePersistente = true; return true; }
        if (this.ventas.length + this.productos.length < 3) return false;
        const ok = await navigator.storage.persist();
        this.storagePersistente = ok;
        return ok;
      } catch (e) { return false; }
    },

    async actualizarInfoStorage() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          this.storageInfo = {
            uso: est.usage || 0,
            cuota: est.quota || 0,
            porcentaje: est.quota ? Number(((est.usage / est.quota) * 100).toFixed(2)) : 0
          };
        }
        if (navigator.storage && navigator.storage.persisted) {
          this.storagePersistente = await navigator.storage.persisted();
        }
      } catch (e) {}
    },

    fmtBytes(n) {
      if (!n) return '0 B';
      const u = ['B', 'KB', 'MB', 'GB'];
      let i = 0;
      while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
      return n.toFixed(i === 0 ? 0 : 1) + ' ' + u[i];
    },

    storageClase() {
      if (this.storageInfo.porcentaje >= 80) return 'bad';
      if (this.storageInfo.porcentaje >= 50) return 'warn';
      return 'ok';
    }
  }
};
