<template>
  <bm-panel class="bm-panel-general" hide-title title="General">
    <div class="controls">
      <bm-button-upload
        v-if="showImport"
        label="Use local Map"
        @files="onFiles" />
      <hr v-if="showImport" />
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
import { createImport } from '@blue-might/app/utils/export';

import BmPanel from '../Panel.vue';
import BmDialog from '../Dialog.vue';
import BmButton from '../Button.vue';
import BmButtonUpload from '../button/Upload.vue';
import BmDialogMenu from '../dialog/Menu.vue';
import BmDialogInstructions from '../dialog/Instructions.vue';

const instructionsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const menuDialog = ref<InstanceType<typeof BmDialog> | null>(null);

const $props = defineProps<{
  app: App;
  showImport?: boolean;
}>();

function onClickInstructions() {
  instructionsDialog.value?.context?.open();
}

function onClickMenu() {
  menuDialog.value?.context?.open();
}

async function onFiles(files: FileList) {
  const file = files.item(0);
  if (file) {
    $props.app.modules.map.enterMap(await createImport(file));
  }
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
