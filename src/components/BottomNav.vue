<template>
  <nav class="nav no-print">
    <button :class="{ activo: sec === 'dashboard' }" @click="$emit('ir', 'dashboard')">
      <icon name="home" :size="22" :color="sec === 'dashboard' ? '#D97706' : '#6b7280'"></icon>
      <span>Inicio</span>
    </button>
    <button :class="{ activo: sec === 'ventas' }" @click="$emit('ir', 'ventas')">
      <icon name="cart" :size="22" :color="sec === 'ventas' ? '#D97706' : '#6b7280'"></icon>
      <span>Ventas</span>
    </button>
    <button :class="{ activo: sec === 'compras' }" @click="$emit('ir', 'compras')">
      <icon name="bag" :size="22" :color="sec === 'compras' ? '#D97706' : '#6b7280'"></icon>
      <span>Compras</span>
    </button>
    <button :class="{ activo: sec === 'inventario' }" @click="$emit('ir', 'inventario')">
      <icon name="package" :size="22" :color="sec === 'inventario' ? '#D97706' : '#6b7280'"></icon>
      <span>Insumos</span>
    </button>
    <button :class="{ activo: masActivo }" @click="$emit('toggle-mas')">
      <icon name="menu" :size="22" :color="masActivo ? '#D97706' : '#6b7280'"></icon>
      <span>Más</span>
    </button>
  </nav>
</template>

<script>
export default {
  name: 'BottomNav',
  props: { sec: { type: String, required: true }, masActivo: { type: Boolean, default: false } },
  emits: ['ir', 'toggle-mas']
};
</script>
