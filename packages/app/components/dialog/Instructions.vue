<template>
  <div class="bm-dialog-instructions">
    <bm-fieldset label="Controls">
      <div class="controls-grid">
        <div>Power</div>
        <div>P</div>
        <div>Move</div>
        <div>W/S</div>
        <div>Rotate</div>
        <div>A/D</div>
        <div>Pitch Left/Right</div>
        <div>Q/E</div>
        <div>Move Turret</div>
        <div>Arrow Keys</div>
        <div>Primary Fire</div>
        <div>Space</div>
        <div>Switch Weapon</div>
        <div>X</div>
        <div>Landing Gears</div>
        <div>L</div>
        <div>Get in/out</div>
        <div>G</div>
        <div>Up / Down</div>
        <div>R/F</div>
      </div>
    </bm-fieldset>
  </div>
</template>

<script lang="ts" setup>
import { inject } from 'vue';
import type { App } from '@blue-might/app/lib/types';

import type { DialogContext } from '../base/Dialog.vue';
import BmFieldset from '../Fieldset.vue';

inject<DialogContext>('dialog')!;

defineProps<{
  app: App;
}>();
</script>

<style lang="postcss" scoped>
.bm-dialog-instructions {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-small);
  width: 420px;
  font-size: var(--bm-font-size-small);

  & .controls-grid {
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
