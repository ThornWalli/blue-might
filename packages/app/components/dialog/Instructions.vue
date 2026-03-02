<template>
  <div class="bm-dialog-instructions">
    <bm-details label="Keyboard" open>
      <div class="grid-row">
        <div class="grid-col">
          <div class="keys">
            <bm-key-cap
              value="Q"
              direction="top-right"
              description="Pitch Left" />
            <bm-key-cap
              value="W"
              direction="top-right"
              description="Move Forward" />
            <bm-key-cap
              value="E"
              direction="top-right"
              description="Pitch Right" />
            <bm-key-cap value="R" direction="top-right" description="Up" />
          </div>
          <div class="keys">
            <bm-key-cap
              value="A"
              direction="bottom-right"
              description="Rotate Left" />
            <bm-key-cap
              value="S"
              direction="bottom-right"
              description="Move Backward" />
            <bm-key-cap
              value="D"
              direction="bottom-right"
              description="Rotate Right" />
            <bm-key-cap value="F" direction="bottom-right" description="Down" />
          </div>
        </div>
        <div class="grid-col">
          <div>
            <div class="keys center">
              <bm-key-cap
                value="↑"
                direction="top"
                description="Secondary Top" />
            </div>
          </div>
          <div class="keys center">
            <bm-key-cap
              value="←"
              direction="bottom-right"
              description="Secondary Left" />
            <bm-key-cap
              value="↓"
              direction="bottom-right"
              description="Secondary Bottom" />
            <bm-key-cap
              value="→"
              direction="bottom-right"
              description="Secondary Right" />
          </div>
        </div>
      </div>
      <div class="grid-row">
        <div class="grid-col grid-col-start">
          <div class="keys right">
            <bm-key-cap value="P" direction="right" description="Power" />
            <bm-key-cap
              value="X"
              direction="right"
              description="Switch Weapon" />
            <bm-key-cap value="Space" direction="right" description="Fire" />
          </div>
          <div class="keys right">
            <bm-key-cap value="G" direction="right" description="Get in/out" />
            <bm-key-cap
              value="L"
              direction="right"
              description="Landing Gears" />
          </div>
        </div>
      </div>
    </bm-details>
  </div>
</template>

<script lang="ts" setup>
import { inject } from 'vue';
import type { App } from '@blue-might/app/lib/types';

import type { DialogContext } from '../base/Dialog.vue';
import BmKeyCap from '../KeyCap.vue';
import BmDetails from '../Details.vue';

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
  min-width: 584px;
  font-size: var(--bm-font-size-small);

  & .keys {
    display: flex;
    gap: var(--bm-spacing-large);

    &.center {
      justify-content: center;
    }

    &.right {
      gap: var(--bm-spacing-large) 120px;
    }
  }

  .grid-row {
    & .grid-col {
      gap: var(--bm-spacing-large);
      padding: 100px;
      padding-left: 20px;
    }

    &:last-child {
      & .grid-col {
        padding: 20px;
      }
    }
  }
}
</style>
