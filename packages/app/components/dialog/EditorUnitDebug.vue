<template>
  <form class="bm-dialog-editor-unit-debug" @submit="onSubmit" @reset="onReset">
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
import { inject, ref } from 'vue';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { ModuleDebug } from '@blue-might/app/lib/classes/Unit';

import BmToggle from '../Toggle.vue';
import BmButton from '../Button.vue';
import type { DialogContext } from '../base/Dialog.vue';

const dialog = inject<DialogContext>('dialog')!;

const $props = defineProps<{
  app: AppEditor;
  modelValue: Partial<ModuleDebug>;
}>();

const $emit = defineEmits<{
  (e: 'update:modelValue', value: ModuleDebug): void;
}>();

function onSubmit(e: Event) {
  e.preventDefault();
  $emit(
    'update:modelValue',
    Object.fromEntries(
      Object.entries(moduleDebug.value).filter(([_, v]) => v)
    ) as ModuleDebug
  );
  dialog.close();
}

const moduleDebug = ref<ModuleDebug>({
  animation: $props.modelValue.animation ?? false,
  attack: $props.modelValue.attack ?? false,
  building: $props.modelValue.building ?? false,
  collision: $props.modelValue.collision ?? false,
  damage: $props.modelValue.damage ?? false,
  faction: $props.modelValue.faction ?? false,
  figure: $props.modelValue.figure ?? false,
  figureMovable: $props.modelValue.figureMovable ?? false,
  groundVehicle: $props.modelValue.groundVehicle ?? false,
  helicopter: $props.modelValue.helicopter ?? false,
  landingPort: $props.modelValue.landingPort ?? false,
  movable: $props.modelValue.movable ?? false,
  pathfinding: $props.modelValue.pathfinding ?? false,
  patrol: $props.modelValue.patrol ?? false,
  player: $props.modelValue.player ?? false,
  rescue: $props.modelValue.rescue ?? false,
  seaVehicle: $props.modelValue.seaVehicle ?? false,
  selection: $props.modelValue.selection ?? false,
  supply: $props.modelValue.supply ?? false,
  transport: $props.modelValue.transport ?? false,
  weapon: $props.modelValue.weapon ?? false,
  radar: $props.modelValue.radar ?? false,
  customize: $props.modelValue.customize ?? false
});

function onReset() {
  dialog.close();
}
</script>

<style lang="postcss" scoped>
.bm-dialog-editor-unit-debug {
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
