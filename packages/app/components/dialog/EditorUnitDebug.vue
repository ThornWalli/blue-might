<template>
  <div class="bm-dialog-editor-unit-debug">
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
import type { ModuleDebug } from '@blue-might/app/lib/classes/Unit';
import { Subscription } from 'rxjs';

import BmToggle from '../Toggle.vue';
import BmButton from '../Button.vue';
import type { DialogContext } from '../base/Dialog.vue';

const moduleDebug: ModuleDebug = reactive({
  animation: false,
  attack: false,
  building: false,
  collision: false,
  damage: false,
  faction: false,
  figure: false,
  figureMovable: false,
  groundVehicle: false,
  helicopter: false,
  landingPort: false,
  movable: false,
  pathfinding: false,
  patrol: false,
  player: false,
  rescue: false,
  seaVehicle: false,
  selection: false,
  supply: false,
  transport: false,
  weapon: false
});
const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: AppEditor;
}>();
const editorUnitDebug = $props.app.modules.editorUnitDebug;

function onClickClose() {
  dialog.close();
}

function onClickApply() {
  editorUnitDebug.setModuleDebug(moduleDebug);
  dialog.close();
}

const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    editorUnitDebug.observables.moduleDebug$.subscribe(debug => {
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
