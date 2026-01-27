<template>
  <bm-panel
    v-if="mode === EDITOR_MODE.UNITS"
    class="bm-panel-editor-units"
    title="Editor Units">
    <bm-select
      v-model="selectedUnit"
      :options="unitOptions"
      :attrs="{ size: 10 }" />
    <bm-button
      :disabled="!selectedUnit"
      label="Add Unit"
      @click="onClickAddUnit" />
    <bm-button label="Close" @click="onClickClose" />
  </bm-panel>
  <teleport to="#layout-background">
    <bm-editor-units-controls
      v-if="
        (mode === EDITOR_MODE.DEFAULT || mode === EDITOR_MODE.UNITS) &&
        targetUnit &&
        !isMove
      "
      :key="targetUnit.id"
      :app="app"
      :unit="targetUnit"
      :can-abort="isCreating"
      @rotate="onRotate"
      @focus="onFocus"
      @move="onMove"
      @apply="onApply"
      @abort="onAbort"
      @delete="onDelete" />
  </teleport>
</template>

<script lang="ts" setup>
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import { getUnits } from '@blue-might/app/lib/classes/appModule/EditorUnits';
import type Unit from '@blue-might/app/lib/classes/Unit';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';

import BmPanel from '../Panel.vue';
import BmSelect from '../Select.vue';
import BmButton from '../Button.vue';
import BmEditorUnitsControls from '../editorUnits/Controls.vue';

const subscription = new Subscription();
const units = await getUnits();
const targetUnit = ref<Raw<Unit> | null>(null);
const isCreating = ref(false);

const $props = defineProps<{
  app: AppEditor;
  mode: EDITOR_MODE;
}>();
const editorUnitsModule = $props.app.modules.editorUnits;

const isMove = ref(false);
const selectedUnit = ref<string | null>('');
const unitOptions = computed(() => {
  const groupedUnits = Object.entries(units).reduce(
    (result, [key, unit]) => {
      if (!result[unit.TYPE]) {
        result[unit.TYPE] = [];
      }
      result[unit.TYPE]!.push({
        label: key,
        value: key
      });
      return result;
    },
    {} as Record<string, { label: string; value: string }[]>
  );

  return [
    { label: 'Select Unit…', value: '' },
    ...Object.entries(groupedUnits).map(([group, options]) => {
      return {
        label: group,
        options
      };
    })
  ];
});

onMounted(() => {
  subscription.add(
    editorUnitsModule.observables.unit$.subscribe(u => {
      targetUnit.value = u ? markRaw(u) : null;
    })
  );
  subscription.add(
    editorUnitsModule.observables.creating$.subscribe(c => {
      isCreating.value = c;
    })
  );
  subscription.add(
    editorUnitsModule.observables.moving$.subscribe(u => {
      isMove.value = u;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

async function onClickAddUnit() {
  if (!editorUnitsModule || !selectedUnit.value) return;
  // Emit an event or call a method to add the unit to the editor
  console.log(`Adding unit: ${selectedUnit.value}`);
  await editorUnitsModule.createUnit(selectedUnit.value);
}

function onClickClose() {
  if ('setMode' in $props.app) {
    $props.app.setMode(EDITOR_MODE.DEFAULT);
  }
}

function onRotate(angle: number) {
  targetUnit.value?.setYaw(targetUnit.value.getYaw() + angle);
}

function onMove() {
  editorUnitsModule?.move();
}
function onApply() {
  editorUnitsModule?.apply();
}
function onAbort() {
  editorUnitsModule?.abort();
}
function onDelete() {
  editorUnitsModule?.delete();
}
function onFocus() {
  editorUnitsModule?.focus();
}
</script>
<style lang="postcss" scoped>
.bm-panel-editor-grid {
  & .position {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-bit-font-family);
    font-size: var(--font-bit-font-size);
    line-height: var(--font-bit-line-height);
    text-align: center;
  }
}
</style>
