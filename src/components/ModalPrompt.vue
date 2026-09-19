<template>
  <div v-if="activo" class="modal no-print">
    <div class="modal-box">
      <div class="modal-title">{{ titulo }}</div>
      <p style="margin-bottom:.8rem;font-size:.9rem">{{ msg }}</p>
      <input :value="value" @input="$emit('update:value', $event.target.value)"
        :type="type || 'text'" :placeholder="placeholder"
        @keyup.enter="$emit('ok', value)" autofocus>
      <div class="grid2" style="margin-top:.5rem">
        <button class="btn ok" @click="$emit('ok', value)">Aceptar</button>
        <button class="btn ghost" @click="$emit('cancelar')">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalPrompt',
  props: {
    activo: Boolean, titulo: { type: String, default: '' },
    msg: { type: String, default: '' }, placeholder: { type: String, default: '' },
    type: { type: String, default: 'text' }, value: { type: String, default: '' }
  },
  emits: ['update:value', 'ok', 'cancelar']
};
</script>
