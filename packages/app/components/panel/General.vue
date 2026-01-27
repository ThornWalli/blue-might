<template>
  <bm-panel class="bm-panel-general" hide-title title="General">
    <div class="controls">
      <bm-button label="Instructions" @click="onClickInstructions" />
      <bm-button label="Menu" @click="onClickMenu" />
    </div>
    <teleport to="body">
      <bm-dialog ref="instructionsDialog">
        <template #header>Instructions</template>
        <template #default>
          <bm-dialog-instructions :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="menuDialog">
        <template #header>Menu</template>
        <template #default>
          <bm-dialog-menu :app="$props.app" />
        </template>
      </bm-dialog>
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import type { App } from '@blue-might/app/lib/types';

import BmPanel from '../Panel.vue';
import BmDialog from '../Dialog.vue';
import BmButton from '../Button.vue';
import BmDialogMenu from '../dialog/Menu.vue';
import BmDialogInstructions from '../dialog/Instructions.vue';

const instructionsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const menuDialog = ref<InstanceType<typeof BmDialog> | null>(null);

defineProps<{
  app: App;
}>();

function onClickInstructions() {
  instructionsDialog.value?.context?.open();
}

function onClickMenu() {
  menuDialog.value?.context?.open();
}
</script>

<style lang="postcss" scoped>
.bm-panel-general {
  & .controls {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
    align-items: stretch;
    width: 160px;

    & > * {
      flex: 1;
    }
  }
}
</style>
