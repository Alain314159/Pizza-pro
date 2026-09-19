import { db, n, m, genId, clean, P, buildData, fmtFH } from '../db.js';
import { tgGetMe, tgGetUpdates, tgCheckName, tgRegister, tgLogin, tgStatus, tgListBackups, tgSendDocument, tgGetFile, tgFileUrl, tgDeleteMessage, tgDetectarChatId } from '../telegram.js';
import { TOAST } from '../constants.js';

export default {
  data() {
    return {
      tgEstado: 'sin-config',
      tgBackups: [],
      tgCargando: false,
      tgProgreso: '',
      tgColaPendiente: 0,
      tgForm: { nombre: '', password: '', password2: '', modo: 'register', loginNombre: '', loginPassword: '' },
      tgCheck: { estado: 'idle', motivo: '', verificando: false },
      tgProcesando: false,
      _tgPollTimer: null,
      _tgColaTimer: null,
      _tgProcesandoCola: false
    };
  },

  computed: {
    passwordsMatch() {
      return this.tgForm.password && this.tgForm.password === this.tgForm.password2;
    },
    puedoRegistrar() {
      return this.tgCheck.estado === 'ok'
        && this.passwordsMatch
        && (this.tgForm.password || '').length >= 4
        && !this.tgProcesando;
    }
  },

  methods: {
    tgTokenActual() {
      // El proxy no requiere token del cliente. Antes devolvía ''
      // cuando no había chatId, lo que rompía la auto-detección inicial.
      return 'proxy';
    },

    async comprimirGzip(blob) {
      if (typeof CompressionStream === 'undefined') return blob;
      try {
        const cs = new CompressionStream('gzip');
        const stream = blob.stream().pipeThrough(cs);
        return new Blob([await new Response(stream).arrayBuffer()], { type: 'application/gzip' });
      } catch (e) { return blob; }
    },

    async descomprimirGzip(blob) {
      if (typeof DecompressionStream === 'undefined') return blob;
      try {
        const ds = new DecompressionStream('gzip');
        const stream = blob.stream().pipeThrough(ds);
        return new Blob([await new Response(stream).arrayBuffer()], { type: 'application/json' });
      } catch (e) { return blob; }
    },

    async hashContenido(texto) {
      try {
        const enc = new TextEncoder().encode(texto);
        const buf = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
      } catch (e) { return String(texto.length); }
    },

    async tgVerificar() {
      if (!this.tgTokenActual()) return this.toastMsg('Proxy no configurado', TOAST.BAD);
      this.tgCargando = true;
      try {
        const me = await tgGetMe();
        const updates = await tgGetUpdates();
        const chat = tgDetectarChatId(updates);
        if (!chat) {
          this.tgEstado = 'sin-chat';
          this.toastMsg('Bot OK (@' + me.username + '). Envia /start al bot', TOAST.WARN);
          return;
        }
        this.cfg.tgChatId = String(chat.chatId);
        this.cfg.tgNombre = chat.nombre || chat.username || 'Usuario';
        await this.guardarCfg();
        this.tgEstado = 'conectado';
        this.toastMsg('Conectado: ' + this.cfg.tgNombre);
      } catch (e) {
        this.tgEstado = 'error';
        this.toastMsg('Error: ' + e.message, TOAST.BAD);
      } finally { this.tgCargando = false; }
    },

    async tgAutoDetectarChat() {
      if (!this.tgTokenActual()) return false;
      if (this.cfg.tgChatId) return true;
      try {
        const updates = await tgGetUpdates();
        const chat = tgDetectarChatId(updates);
        if (chat) {
          this.cfg.tgChatId = String(chat.chatId);
          this.cfg.tgNombre = chat.nombre || chat.username || 'Usuario';
          this.cfg.tgAutoBackup = true;
          await this.guardarCfg();
          this.tgEstado = 'conectado';
          try { await this.tgCargarEstadoTienda(); } catch (e) {}
          this.toastMsg('Telegram conectado: ' + this.cfg.tgNombre);
          return true;
        }
        this.tgEstado = 'esperando-start';
        return false;
      } catch (e) {
        this.tgEstado = 'error';
        return false;
      }
    },

    async tgBackupAhora() {
      if (!this.cfg.tiendaConfigurada || !this.cfg.nombreTienda) {
        return this.toastMsg('Configura un nombre de tienda antes de hacer backups', TOAST.BAD);
      }
      const data = buildData(this);
      try {
        await this.tgEnviarDatos(data, 'manual', true);
      } catch (e) {
        await this.tgEncolar(data, 'manual');
        this.toastMsg('Sin conexion. Backup en cola.', TOAST.WARN);
      }
    },

    async tgEnviarDatos(data, motivo, mostrarToast) {
      const chatId = this.cfg.tgChatId;
      if (!this.tgTokenActual() || !chatId) throw new Error('Sin conexion a Telegram');
      this.tgCargando = true;
      this.tgProgreso = 'Preparando...';
      try {
        const json = JSON.stringify(data);
        const hash = await this.hashContenido(json);
        if (motivo === 'auto' && this.cfg.tgUltimoHash === hash) {
          this.tgProgreso = 'Sin cambios';
          return { ok: true, saltado: true };
        }
        this.tgProgreso = 'Comprimiendo...';
        const blobSinComprimir = new Blob([json], { type: 'application/json' });
        const gz = await this.comprimirGzip(blobSinComprimir);
        const fecha = new Date().toISOString();
        const fileName = 'pizzeria-backup-' + fecha.split('T')[0] + '-' + Date.now().toString(36) + '.json.gz';
        const resumen = data.productos.length + ' prod · ' + data.ventas.length + ' ventas · ' + (blobSinComprimir.size / 1024).toFixed(1) + ' KB';
        this.tgProgreso = 'Subiendo...';
        await tgSendDocument(chatId, this.cfg.nombreTienda, gz, 'Backup · ' + resumen);
        this.cfg.tgUltimoBackup = fecha;
        this.cfg.tgUltimoHash = hash;
        await this.guardarCfg();
        this.tgProgreso = '';
        if (mostrarToast) this.toastMsg('Backup OK · ' + (gz.size / 1024).toFixed(1) + ' KB');
        return { ok: true };
      } finally {
        this.tgCargando = false;
        this.tgProgreso = '';
      }
    },

    async tgListar() {
      if (!this.cfg.tiendaConfigurada || !this.cfg.nombreTienda) {
        return this.toastMsg('Configura un nombre de tienda primero', TOAST.WARN);
      }
      this.tgCargando = true;
      try {
        this.tgBackups = await tgListBackups(this.cfg.tgChatId, this.cfg.nombreTienda);
        this.toastMsg(this.tgBackups.length + ' backup(s)');
      } catch (e) { this.toastMsg('Error: ' + e.message, TOAST.BAD); }
      finally { this.tgCargando = false; }
    },

    async tgRestaurar(bk) {
      if (!this.tgTokenActual()) return;
      this.confirm = {
        activo: true,
        titulo: 'Restaurar backup',
        msg: 'Restaurar el backup del ' + fmtFH(bk.fecha) + '?',
        onOk: async () => {
          this.tgCargando = true;
          this.tgProgreso = 'Descargando...';
          try {
            const file = await tgGetFile(bk.fileId);
            const url = tgFileUrl(file.file_path);
            const r = await fetch(url);
            const blob = await r.blob();
            let txt;
            if (bk.fileName.endsWith('.gz')) {
              this.tgProgreso = 'Descomprimiendo...';
              const d = await this.descomprimirGzip(blob);
              txt = await d.text();
            } else {
              txt = await blob.text();
            }
            this.tgProgreso = 'Importando...';
            const data = JSON.parse(txt);
            if (!data.productos && !data.ventas) throw new Error('Archivo invalido');
            await this.importarData(data);
            this.toastMsg('Backup restaurado');
          } catch (e) {
            this.toastMsg('Error: ' + e.message, TOAST.BAD);
          } finally {
            this.tgCargando = false;
            this.tgProgreso = '';
          }
        }
      };
    },

    async tgEliminar(bk) {
      if (!this.tgTokenActual()) return;
      this.confirm = {
        activo: true,
        titulo: 'Eliminar backup',
        msg: 'Eliminar el backup del ' + fmtFH(bk.fecha) + '?',
        onOk: async () => {
          try {
            await tgDeleteMessage(this.cfg.tgChatId, bk.messageId);
            this.tgBackups = this.tgBackups.filter(x => x.messageId !== bk.messageId);
            this.toastMsg('Backup eliminado');
          } catch (e) { this.toastMsg('Error: ' + e.message, TOAST.BAD); }
        }
      };
    },

    tgDesconectar() {
      this.confirm = {
        activo: true, titulo: 'Desconectar Telegram',
        msg: 'Se borrara el chat_id guardado. Los backups en Telegram no se tocan.',
        onOk: async () => {
          this.cfg.tgChatId = '';
          this.cfg.tgNombre = '';
          this.cfg.tgAutoBackup = false;
          this.cfg.nombreTienda = '';
          this.cfg.tiendaConfigurada = false;
          await this.guardarCfg();
          this.tgEstado = 'sin-config';
          this.tgBackups = [];
          this.toastMsg('Desconectado');
        }
      };
    },

    // ═══ CONFIGURACION DE TIENDA ═══

    async verificarNombreTienda() {
      const nombre = (this.tgForm.nombre || '').toLowerCase().trim();
      if (!nombre || nombre.length < 3) {
        this.tgCheck = { estado: 'idle', motivo: '', verificando: false };
        return;
      }
      this.tgCheck = { estado: 'verificando', motivo: '', verificando: true };
      try {
        const r = await tgCheckName(nombre);
        if (r.disponible) this.tgCheck = { estado: 'ok', motivo: '', verificando: false };
        else this.tgCheck = { estado: 'ocupado', motivo: r.motivo || 'Nombre ya en uso', verificando: false };
      } catch (e) {
        this.tgCheck = { estado: 'error', motivo: e.message, verificando: false };
      }
    },

    async registrarTienda() {
      if (!this.puedoRegistrar) return;
      if (!this.cfg.tgChatId) return this.toastMsg('Primero conecta el bot con /start', TOAST.BAD);
      this.tgProcesando = true;
      try {
        const r = await tgRegister(this.tgForm.nombre.toLowerCase().trim(), this.tgForm.password, this.cfg.tgChatId);
        this.cfg.nombreTienda = r.nombre;
        this.cfg.tiendaConfigurada = true;
        this.cfg.tgAutoBackup = true;
        await this.guardarCfg();
        this.tgForm = { nombre: '', password: '', password2: '', modo: 'register', loginNombre: '', loginPassword: '' };
        this.tgCheck = { estado: 'idle', motivo: '', verificando: false };
        this.toastMsg('Tienda registrada correctamente');
        await this.tgListar();
      } catch (e) {
        this.toastMsg(e.message, TOAST.BAD);
      } finally { this.tgProcesando = false; }
    },

    async loginTienda() {
      if (!this.tgForm.loginNombre || !this.tgForm.loginPassword) {
        return this.toastMsg('Completa nombre y contraseña', TOAST.BAD);
      }
      if (!this.cfg.tgChatId) return this.toastMsg('Primero conecta el bot con /start', TOAST.BAD);
      this.tgProcesando = true;
      try {
        const r = await tgLogin(this.tgForm.loginNombre.toLowerCase().trim(), this.tgForm.loginPassword, this.cfg.tgChatId);
        this.cfg.nombreTienda = r.nombre;
        this.cfg.tiendaConfigurada = true;
        this.cfg.tgAutoBackup = true;
        await this.guardarCfg();
        this.tgForm = { nombre: '', password: '', password2: '', modo: 'register', loginNombre: '', loginPassword: '' };
        this.toastMsg('Sesion iniciada');
        await this.tgListar();
      } catch (e) {
        this.toastMsg(e.message, TOAST.BAD);
      } finally { this.tgProcesando = false; }
    },

    async tgCargarEstadoTienda() {
      if (!this.cfg.tgChatId) return;
      try {
        const r = await tgStatus(this.cfg.tgChatId);
        if (r.nombre) {
          this.cfg.nombreTienda = r.nombre;
          this.cfg.tiendaConfigurada = true;
          await this.guardarCfg();
        } else {
          this.cfg.tiendaConfigurada = false;
          this.cfg.nombreTienda = '';
        }
      } catch (e) { /* silencioso */ }
    },

    async tgAutoBackupCheck() {
      try { await this.tgProcesarCola(); } catch (e) {}
      if (!this.cfg.tgAutoBackup || !this.cfg.tgChatId) return;
      if (!this.cfg.tiendaConfigurada || !this.cfg.nombreTienda) return;
      const ult = this.cfg.tgUltimoBackup ? new Date(this.cfg.tgUltimoBackup).getTime() : 0;
      const horas = (Date.now() - ult) / 3600000;
      if (horas >= 24) {
        const data = buildData(this);
        try {
          await this.tgEnviarDatos(data, 'auto', false);
          if (this.cfg.tgFallosConsecutivos > 0) {
            this.cfg.tgFallosConsecutivos = 0;
            await this.guardarCfg();
          }
        } catch (e) {
          this.cfg.tgFallosConsecutivos = (this.cfg.tgFallosConsecutivos || 0) + 1;
          await this.guardarCfg();
          await this.tgEncolar(data, 'auto');
        }
      }
    },

    async tgEncolar(datos, motivo) {
      const id = genId('tq');
      await P(db.tgQueue, {
        id, ts: new Date().toISOString(), estado: 'pendiente',
        intentos: 0, motivo: motivo || 'auto', datos
      });
      await this.tgActualizarCola();
      return id;
    },

    async tgActualizarCola() {
      try {
        const items = await db.tgQueue.toArray();
        this.tgColaPendiente = items.filter(x => x.estado === 'pendiente' || x.estado === 'error').length;
      } catch (e) { this.tgColaPendiente = 0; }
    },

    async tgProcesarCola() {
      if (this._tgProcesandoCola || !this.cfg.tgChatId) return;
      this._tgProcesandoCola = true;
      try {
        const items = await db.tgQueue.filter(x => x.estado === 'pendiente' || (x.estado === 'error' && (x.intentos || 0) < 5)).toArray();
        for (const item of items) {
          try {
            await P(db.tgQueue, { ...item, estado: 'enviando' });
            await this.tgEnviarDatos(item.datos, item.motivo, false);
            await db.tgQueue.delete(item.id);
          } catch (e) {
            await P(db.tgQueue, { ...item, estado: 'error', intentos: (item.intentos || 0) + 1, ultimoError: e.message });
          }
        }
        await this.tgActualizarCola();
      } finally { this._tgProcesandoCola = false; }
    },

    iniciarTgPoll() {
      if (this._tgPollTimer) return;
      this._tgPollTimer = setInterval(async () => {
        if (this.cfg.tgChatId) { clearInterval(this._tgPollTimer); this._tgPollTimer = null; return; }
        await this.tgAutoDetectarChat();
      }, 5000);
    },

    iniciarTgTimers() {
      if (!this._tgColaTimer) {
        this._tgColaTimer = setInterval(() => this.tgProcesarCola(), 5 * 60 * 1000);
      }
      this.iniciarTgPoll();
    },

    destroyTgTimers() {
      if (this._tgPollTimer) { clearInterval(this._tgPollTimer); this._tgPollTimer = null; }
      if (this._tgColaTimer) { clearInterval(this._tgColaTimer); this._tgColaTimer = null; }
    }
  }
};
