<template>
  <div v-if="app.aporteAbierto" class="modal no-print">
    <div class="modal-box">
      <div class="modal-title"><icon name="plus" :size="20"></icon> Aportar Capital</div>
      <input v-model="app.aporteForm.monto" type="number" inputmode="decimal" step="0.01" placeholder="Monto del aporte">
      <input v-model="app.aporteForm.nota" type="text" placeholder="Nota (opcional)">
      <select v-model="app.aporteForm.socioId">
        <option value="">Sin asignar (capital general)</option>
        <option v-for="s in app.sociosActivos" :key="s.id" :value="s.id">{{ s.nombre }}</option>
      </select>
      <div class="grid2">
        <button class="btn ok" @click="app.registrarAporte()">Registrar Aporte</button>
        <button class="btn ghost" @click="app.aporteAbierto = false">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ModalAporte', inject: ['$app'] };
</script>
