<template>
  <div v-if="activo" class="modal no-print">
    <div class="modal-box">
      <div class="modal-title">{{ titulo }}</div>
      <p style="margin-bottom:1rem;font-size:.9rem;white-space:pre-line">{{ msg }}</p>
      <div class="grid2">
        <button class="btn ok" @click="$emit('ok')">Confirmar</button>
        <button class="btn ghost" @click="$emit('cancelar')">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalConfirm',
  props: { activo: Boolean, titulo: { type: String, default: '' }, msg: { type: String, default: '' } },
  emits: ['ok', 'cancelar']
};
</script>
