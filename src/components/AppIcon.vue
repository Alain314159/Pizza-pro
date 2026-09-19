<template>
  <svg :width="s" :height="s" viewBox="0 0 24 24" fill="none"
    :stroke="color" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round"
    style="flex-shrink:0;vertical-align:middle;display:inline-block;"
    v-html="path"></svg>
</template>

<script>
import { PATHS } from '../icons.js';
export default {
  name: 'AppIcon',
  props: {
    name: String,
    size: { type: [Number, String], default: 22 },
    color: { type: String, default: '#D97706' }
  },
  computed: {
    s() { return parseInt(this.size) || 22; },
    path() { return PATHS[this.name] || ''; }
  }
};
</script>
