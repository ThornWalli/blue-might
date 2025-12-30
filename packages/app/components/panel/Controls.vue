<template>
  <bm-panel class="bm-panel-controls" hide-title title="Controls">
    <div class="grid">
      <div>Power</div>
      <div>P</div>
      <div>Move</div>
      <div>W/A/S/D</div>
      <div>Rotate</div>
      <div>Q/E</div>
      <div>Move Turret</div>
      <div>Arrow Keys</div>
      <div>Primary Fire</div>
      <div>Space</div>
      <div>Gears</div>
      <div>G</div>
      <div>Up / Down</div>
      <div>R/F</div>
    </div>
  </bm-panel>
</template>

<script lang="ts" setup>
import BmPanel from '../Panel.vue';
import type App from '../../lib/classes/App';

defineProps<{
  app: App;
}>();
</script>
<style lang="postcss" scoped>
.bm-panel-controls {
  font-size: var(--bm-font-size-small);
  line-height: 1.4;

  & .grid {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.5rem;

    & div:nth-of-type(odd) {
      font-weight: bold;
      opacity: 0.6;
    }

    & div:nth-of-type(even) {
      opacity: 1;
    }
  }
}
</style>
