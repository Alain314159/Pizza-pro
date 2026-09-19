<template>
  <div v-if="app.retiroAbierto" class="modal no-print">
    <div class="modal-box">
      <div class="modal-title"><icon name="dollar" :size="20"></icon> Retirar Ganancia</div>
      <div style="font-size:.82rem;color:var(--mut);margin-bottom:.5rem">
        Disponible: <b class="pos">{{ app.fmt(app.gananciaDisponible) }}</b>
      </div>
      <input v-model="app.retiroForm.monto" type="number" inputmode="decimal" step="0.01" placeholder="Monto a retirar">
      <input v-model="app.retiroForm.concepto" type="text" placeholder="Concepto (obligatorio)">
      <div class="grid2">
        <button class="btn bad" @click="app.registrarRetiro()">Retirar</button>
        <button class="btn ghost" @click="app.retiroAbierto = false">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ModalRetiro', inject: ['$app'] };
</script>
