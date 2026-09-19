<template>
  <div class="sel-insumo">
    <button type="button" class="sel-insumo-btn" :class="{ vacio: !insumoActual }" @click="abrir">
      <span>{{ insumoActual ? insumoActual.nombre + ' (' + insumoActual.unidad + ')' : placeholder }}</span>
      <icon name="chevron" :size="16" color="#6b7280"></icon>
    </button>

    <div v-if="abierto" class="overlay no-print" @click="cerrar"></div>
    <div v-if="abierto" class="sheet no-print">
      <div class="handle"></div>
      <div class="card-title" style="margin-bottom:.5rem">
        <icon name="search" :size="18" color="#D97706"></icon> Elegir insumo
      </div>
      <input
        ref="searchInput"
        v-model="busqueda"
        type="text"
        placeholder="Buscar insumo..."
        autocomplete="off"
        @keydown.enter="elegirPrimero"
      >
      <div class="sel-lista">
        <div v-if="filtrados.length === 0" class="empty">Sin resultados</div>
        <div
          v-for="i in filtrados"
          :key="i.id"
          class="sel-item"
          :class="{ activo: i.id === modelValue }"
          @click="elegir(i)"
        >
          <span>{{ i.nombre }}</span>
          <span class="unidad">{{ i.unidad }}</span>
        </div>
      </div>
      <button class="btn ghost" style="margin-top:.5rem" @click="cerrar">Cancelar</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SelectInsumo',
  inject: ['$app'],
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Seleccionar insumo...' }
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return { abierto: false, busqueda: '' };
  },
  computed: {
    insumos() { return this.$app.insumosActivos; },
    insumoActual() { return this.insumos.find(i => i.id === this.modelValue); },
    filtrados() {
      const q = this.busqueda.toLowerCase().trim();
      if (!q) return this.insumos.slice(0, 40);
      return this.insumos.filter(i => i.nombre.toLowerCase().includes(q)).slice(0, 40);
    }
  },
  methods: {
    abrir() {
      this.abierto = true;
      this.busqueda = '';
      this.$nextTick(() => {
        if (this.$refs.searchInput) this.$refs.searchInput.focus();
      });
    },
    cerrar() { this.abierto = false; },
    elegir(i) {
      this.$emit('update:modelValue', i.id);
      this.$emit('change', i);
      this.cerrar();
    },
    elegirPrimero() {
      if (this.filtrados.length > 0) this.elegir(this.filtrados[0]);
    }
  }
};
</script>

<style scoped>
.sel-insumo { width: 100%; }
.sel-insumo-btn {
  width: 100%;
  padding: .8rem .95rem;
  border: 1.5px solid var(--brd);
  border-radius: var(--r-sm);
  background: var(--card);
  color: var(--txt);
  font-size: 16px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  margin-bottom: .55rem;
}
.sel-insumo-btn.vacio { color: var(--mut-2); }
.sel-insumo-btn:active { transform: scale(.99); }
.sel-lista {
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid var(--brd);
  border-radius: var(--r-sm);
  background: var(--card);
  margin-top: .3rem;
}
.sel-item {
  display: flex;
  justify-content: space-between;
  padding: .75rem .95rem;
  border-bottom: 1px solid var(--brd);
  cursor: pointer;
  font-size: .88rem;
}
.sel-item:last-child { border-bottom: none; }
.sel-item:active { background: var(--bg); }
.sel-item.activo { background: rgba(217,119,6,.1); color: var(--pri); font-weight: 700; }
.sel-item .unidad { color: var(--mut); font-size: .78rem; }
</style>
