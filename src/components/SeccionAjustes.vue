<template>
  <div class="modal no-print" @click.self="$emit('cerrar')">
    <div class="modal-box" @click.stop>
      <div class="modal-title"><icon name="settings" :size="20"></icon> Ajustes</div>

      <div class="set-group">Tienda</div>
      <div class="set-row">
        <span class="lbl"><icon name="store" :size="18"></icon> Nombre</span>
        <input v-model="app.cfg.nombre" type="text" style="width:auto;flex:1;margin:0;padding:.4rem .6rem" @change="app.guardarCfg">
      </div>
      <div class="set-row">
        <span class="lbl"><icon name="dollar" :size="18"></icon> Capital inicial</span>
        <input :value="app.cfg.capitalInicial || 0" @change="app.setCapitalInicial($event.target.value)" type="number" inputmode="decimal" step="0.01" style="width:auto;flex:1;margin:0;padding:.4rem .6rem">
      </div>

      <div class="set-group">Alertas</div>
      <div class="set-row">
        <span class="lbl">Umbral merma (%)</span>
        <input v-model.number="app.cfg.umbralMermaPct" type="number" min="1" max="100" style="width:5rem;margin:0;padding:.3rem .5rem" @change="app.guardarCfg">
      </div>
      <div class="set-row">
        <span class="lbl">Días sin auditoría</span>
        <input v-model.number="app.cfg.umbralDiasAuditoria" type="number" min="1" style="width:5rem;margin:0;padding:.3rem .5rem" @change="app.guardarCfg">
      </div>

      <div class="set-group">Notificaciones</div>
      <div v-if="!app.soportaNotif" class="info-box" style="background:rgba(220,38,38,.1);color:var(--bad);font-size:.75rem">
        Este dispositivo no soporta notificaciones. En iPhone necesitas instalar la app como PWA.
      </div>
      <div class="set-row" v-if="app.soportaNotif">
        <span class="lbl"><icon name="alert" :size="18"></icon> Activar notificaciones</span>
        <label class="switch">
          <input type="checkbox" :checked="app.cfg.notifActivo" @change="app.cfg.notifActivo ? app.desactivarNotif() : app.pedirPermisoNotif()">
          <span class="slider"></span>
        </label>
      </div>

      <div class="set-group">Datos</div>
      <button class="btn pri" @click="app.exportar"><icon name="download" :size="16" color="#fff"></icon> Exportar respaldo (JSON)</button>
      <button class="btn ghost" @click="app.triggerImport"><icon name="upload" :size="16" :color="app.txtColor"></icon> Importar datos</button>

      <div class="set-group">Backup en Telegram</div>

      <!-- ESTADO 1: Sin chat detectado -->
      <div v-if="!app.cfg.tgChatId">
        <div v-if="app.tgEstado === 'error'" class="info-box" style="background:rgba(239,68,68,.1);color:var(--bad);border-color:var(--bad);font-size:.78rem">
          Error de conexión. Verifica que el bot esté activo.
        </div>
        <div v-else class="info-box" style="background:rgba(217,119,6,.08);border-color:var(--pri);font-size:.78rem">
          <b>Esperando conexión...</b><br>
          Abre Telegram, busca <b>@pizza_pro_backup_bot</b> y envíale <b>/start</b>.
          La app lo detecta en 5 segundos.
        </div>
        <button class="btn ghost" style="font-size:.72rem" @click="app.tgAutoDetectarChat">
          <icon name="refresh" :size="14" :color="app.txtColor"></icon> Buscar ahora
        </button>
      </div>

      <!-- ESTADO 2: Chat OK pero sin tienda configurada -->
      <div v-else-if="!app.cfg.tiendaConfigurada">
        <div class="info-box" style="background:rgba(217,119,6,.08);border-color:var(--pri);font-size:.78rem">
          <b>Chat conectado:</b> {{ app.cfg.tgNombre || app.cfg.tgChatId }}<br>
          Registra un nombre único para tu tienda. Este nombre identifica tus backups en Telegram.
        </div>

        <div class="tg-modo-toggle">
          <button :class="{ activo: app.tgForm.modo === 'register' }" @click="app.tgForm.modo = 'register'">Registrar nueva</button>
          <button :class="{ activo: app.tgForm.modo === 'login' }" @click="app.tgForm.modo = 'login'">Ya tengo una</button>
        </div>

        <div v-if="app.tgForm.modo === 'register'">
          <input v-model="app.tgForm.nombre" type="text" placeholder="Nombre único (ej: mi-pizzeria)" @input="app.verificarNombreTienda()" autocomplete="off">
          <div v-if="app.tgCheck.estado === 'verificando'" class="tg-check-info">Verificando...</div>
          <div v-else-if="app.tgCheck.estado === 'ok'" class="tg-check-info ok">✓ Disponible</div>
          <div v-else-if="app.tgCheck.estado === 'ocupado'" class="tg-check-info bad">✗ {{ app.tgCheck.motivo }}</div>
          <div v-else-if="app.tgCheck.estado === 'error'" class="tg-check-info bad">Error: {{ app.tgCheck.motivo }}</div>

          <input v-model="app.tgForm.password" type="password" placeholder="Contraseña (mín. 4 caracteres)" autocomplete="new-password">
          <input v-model="app.tgForm.password2" type="password" placeholder="Repetir contraseña" autocomplete="new-password">
          <div v-if="app.tgForm.password && app.tgForm.password2 && !app.passwordsMatch" class="tg-check-info bad">Las contraseñas no coinciden</div>

          <button class="btn pri" :disabled="!app.puedoRegistrar" @click="app.registrarTienda()">
            {{ app.tgProcesando ? 'Registrando...' : 'Registrar Tienda' }}
          </button>
        </div>

        <div v-else>
          <input v-model="app.tgForm.loginNombre" type="text" placeholder="Nombre de tienda existente" autocomplete="off">
          <input v-model="app.tgForm.loginPassword" type="password" placeholder="Contraseña" autocomplete="current-password">
          <button class="btn pri" :disabled="app.tgProcesando" @click="app.loginTienda()">
            {{ app.tgProcesando ? 'Conectando...' : 'Iniciar Sesión' }}
          </button>
        </div>

        <button class="btn ghost" style="margin-top:.5rem;font-size:.72rem" @click="app.tgDesconectar">
          Desconectar Telegram
        </button>
      </div>

      <!-- ESTADO 3: Todo OK -->
      <div v-else>
        <div class="tg-conectado">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
            <div class="tg-dot"></div>
            <span style="font-size:.8rem"><b>{{ app.cfg.nombreTienda }}</b></span>
          </div>
          <div style="font-size:.72rem;color:var(--mut);margin-bottom:.6rem">
            Chat: {{ app.cfg.tgNombre || app.cfg.tgChatId }}<br>
            Último backup: {{ app.cfg.tgUltimoBackup ? app.fmtFH(app.cfg.tgUltimoBackup) : 'nunca' }}
            <span v-if="app.tgColaPendiente > 0" style="color:var(--warn);font-weight:700"> · {{ app.tgColaPendiente }} en cola</span>
          </div>
          <div v-if="app.tgProgreso" class="tg-progreso">
            <div class="tg-spinner"></div>
            <span>{{ app.tgProgreso }}</span>
          </div>
          <div class="set-row">
            <span class="lbl" style="font-size:.78rem">Backup automático (cada 24h)</span>
            <label class="switch">
              <input type="checkbox" v-model="app.cfg.tgAutoBackup" @change="app.guardarCfg">
              <span class="slider"></span>
            </label>
          </div>
          <div class="grid2" style="margin-top:.6rem">
            <button class="btn pri" style="margin:0;font-size:.75rem;padding:.6rem" :disabled="app.tgCargando" @click="app.tgBackupAhora">
              <icon name="upload" :size="14" color="#fff"></icon> Backup ahora
            </button>
            <button class="btn ghost" style="margin:0;font-size:.75rem;padding:.6rem" :disabled="app.tgCargando" @click="app.tgListar">
              <icon name="refresh" :size="14" :color="app.txtColor"></icon> Ver backups
            </button>
          </div>
          <button v-if="app.tgColaPendiente > 0" class="btn warn" style="margin-top:.5rem;font-size:.72rem" @click="app.tgProcesarCola">
            Procesar {{ app.tgColaPendiente }} en cola
          </button>

          <div v-if="app.tgBackups.length" class="tg-lista">
            <div style="font-size:.75rem;font-weight:800;margin-bottom:.4rem;color:var(--pri)">Backups disponibles</div>
            <div v-for="bk in app.tgBackups.slice(0, 10)" :key="bk.messageId" class="tg-bk">
              <div style="flex:1;min-width:0">
                <div style="font-size:.78rem;font-weight:700">{{ app.fmtFH(bk.fecha) }}</div>
                <div style="font-size:.68rem;color:var(--mut)">{{ (bk.fileSize/1024).toFixed(1) }} KB</div>
              </div>
              <button class="icon-btn ok" @click="app.tgRestaurar(bk)">
                <icon name="download" :size="14" color="#16a34a"></icon>
              </button>
              <button class="icon-btn bad" @click="app.tgEliminar(bk)">
                <icon name="trash" :size="14" color="#dc2626"></icon>
              </button>
            </div>
          </div>
        </div>

        <button class="btn ghost" style="margin-top:.5rem;font-size:.72rem" @click="app.tgDesconectar">
          Desconectar Telegram
        </button>
      </div>

      <div class="set-group">Almacenamiento</div>
      <div style="background:var(--bg);border-radius:var(--r-sm);padding:.7rem;margin-bottom:.6rem;font-size:.78rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">
          <span style="color:var(--mut);font-weight:700">Uso de disco</span>
          <span :class="'storage-badge ' + app.storageClase()">
            {{ app.fmtBytes(app.storageInfo.uso) }} / {{ app.fmtBytes(app.storageInfo.cuota) }}
          </span>
        </div>
        <div class="storage-bar">
          <div class="storage-bar-fill" :class="app.storageClase()" :style="{ width: Math.min(app.storageInfo.porcentaje, 100) + '%' }"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.35rem">
          <span style="color:var(--mut);font-size:.72rem">{{ app.storageInfo.porcentaje }}% usado</span>
          <span :class="'storage-badge ' + (app.storagePersistente ? 'ok' : 'warn')">
            {{ app.storagePersistente ? '✓ Persistente' : '⚠ Best-effort' }}
          </span>
        </div>
        <button v-if="!app.storagePersistente" class="btn ghost" style="width:auto;margin:.5rem 0 0;padding:.4rem .8rem;font-size:.72rem" @click="app.pedirPersistenciaStorage">
          <icon name="lock" :size="12" :color="app.txtColor"></icon> Solicitar almacenamiento persistente
        </button>
      </div>

      <div class="set-group" style="color:var(--bad)">Zona peligrosa</div>
      <button class="btn bad" @click="app.borrarTodo">
        <icon name="trash" :size="16" color="#fff"></icon> Borrar TODOS los datos
      </button>

      <div class="set-group">Información</div>
      <div style="font-size:.78rem;color:var(--mut)">
        Pizza Pro v1.0 · Datos locales<br>
        {{ app.insumos.length }} insumos · {{ app.productos.length }} productos · {{ app.ventas.length }} ventas
      </div>

      <button class="btn ghost" style="margin-top:.8rem" @click="$emit('cerrar')">Cerrar</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SeccionAjustes',
  inject: ['$app'],
  emits: ['cerrar'],
  computed: {
    app() { return this.$app; }
  }
};
</script>
