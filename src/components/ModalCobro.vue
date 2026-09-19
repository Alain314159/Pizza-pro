<template>
  <div v-if="app.cobroModal.activo" class="modal no-print">
    <div class="modal-box">
      <div class="modal-title"><icon name="check" :size="20"></icon> Cobrar Venta</div>
      <div class="cobro-modal">Total: {{ app.fmt(app.cobroModal.total) }}</div>
      <div v-if="app.gananciaCarrito !== 0" style="text-align:center;font-size:.85rem;color:var(--mut);margin-bottom:.8rem">
        Ganancia: <b class="pos">{{ app.fmt(app.gananciaCarrito) }}</b>
      </div>
      <button class="btn ok" @click="app.procesarVenta" :disabled="app.procesandoVenta">
        {{ app.procesandoVenta ? 'Procesando...' : 'Confirmar Pago' }}
      </button>
      <button class="btn ghost" @click="app.cobroModal.activo = false">Cancelar</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalCobro',
  inject: ['$app'],
  computed: { app() { return this.$app; } }
};
</script>
