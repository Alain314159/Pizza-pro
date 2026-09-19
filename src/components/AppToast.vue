<template>
  <div class="toast" :class="[toast.type, { show: toast.show }]">
    <span>{{ toast.msg }}</span>
    <button v-if="toast.accionTxt" @click="$emit('accion')">{{ toast.accionTxt }}</button>
  </div>
</template>

<script>
export default {
  name: 'AppToast',
  props: { toast: { type: Object, required: true } },
  emits: ['accion']
};
</script>
