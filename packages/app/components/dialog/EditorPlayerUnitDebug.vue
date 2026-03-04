<template>
  <form
    class="bm-dialog-editor-player-unit-debug"
    @submit="onSubmit"
    @reset="onReset">
    <p>Select Modules to Debug:</p>
    <ul>
      <li v-for="[key] in Object.entries(moduleDebug)" :key="key">
        <bm-toggle v-model="moduleDebug[key]!" :label="key" />
      </li>
    </ul>
    <div class="controls">
      <bm-button label="Close" type="reset" />
      <bm-button label="Apply" type="submit" />
    </div>
  </form>
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
const editorPlayerModule = $props.app.modules.editorPlayer;

function onSubmit(e: Event) {
  e.preventDefault();

  const unitDebug = Object.fromEntries(
    Object.entries(moduleDebug).filter(([_, v]) => v)
  );
  editorPlayerModule.setPlayerOptions({
    ...editorPlayerModule.getPlayerOptions(),
    unitDebug: unitDebug
  });
  dialog.close();
}

function onReset() {
  dialog.close();
}

const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    editorPlayerModule.observables.playerOptions$.subscribe(playerOptions => {
      Object.assign(moduleDebug, playerOptions.unitDebug);
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-player-unit-debug {
  display: flex;
  flex-direction: column;
  gap: var(--bm-spacing-medium);

  & .controls {
    display: flex;
    flex-direction: row;
    gap: var(--bm-spacing-small) var(--bm-spacing-medium);

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
