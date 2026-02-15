<template>
  <div class="bm-dialog-editor-map-debug">
    <p>Select Modules to Debug:</p>
    <ul>
      <li v-for="[key] in Object.entries(moduleDebug)" :key="key">
        <bm-toggle v-model="moduleDebug[key]!" :label="key" />
      </li>
    </ul>
    <div class="controls">
      <bm-button label="Close" @click="onClickClose" />
      <bm-button label="Apply" @click="onClickApply" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { inject, onMounted, onUnmounted, reactive } from 'vue';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { ModuleDebug } from '@blue-might/app/lib/classes/Map';
import { Subscription } from 'rxjs';

import BmToggle from '../Toggle.vue';
import BmButton from '../Button.vue';
import type { DialogContext } from '../base/Dialog.vue';

const moduleDebug: ModuleDebug = reactive({
  effect: false,
  faction: false,
  light: false,
  pathfinding: false,
  shoot: false,
  surface: false,
  units: false
});
const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: AppEditor;
}>();
const editorMapSettingsModule = $props.app.modules.editorMapSettings;

function onClickClose() {
  dialog.close();
}

function onClickApply() {
  editorMapSettingsModule.setModuleDebug(moduleDebug);
  dialog.close();
}

const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    editorMapSettingsModule.observables.moduleDebug$.subscribe(debug => {
      Object.assign(moduleDebug, debug);
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-unit-debug {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-small);

  & .controls {
    display: flex;
    flex-direction: row;
    gap: var(--bm-spacing-small);

    & > * {
      flex: 1;
    }
  }

  & ul {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--bm-spacing-small);
  }

  & p {
    font-family: var(--font-family-base);
    font-size: 12px;
    font-weight: bold;
  }
}

.spacer {
  flex: 1;
}
</style>
