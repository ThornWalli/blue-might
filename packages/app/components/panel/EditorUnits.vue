<template>
  <bm-panel
    v-if="mode === EDITOR_MODE.UNITS"
    class="bm-panel-editor-units"
    title="Editor Units">
    <div class="units">
      <bm-fieldset
        v-for="itemGroup in itemGroups"
        :key="itemGroup.label"
        :label="itemGroup.label">
        <bm-button
          v-for="item in itemGroup.items"
          :key="item.value"
          :label="item.label"
          @click="onUpdateSelectedUnit(item.value)">
        </bm-button>
      </bm-fieldset>
    </div>
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
import { snakeCase } from 'change-case';

import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmFieldset from '../Fieldset.vue';
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
const itemGroups = computed(() => {
  const groupedUnits = Object.entries(units).reduce(
    (result, [key, unit]) => {
      if (!result[unit.TYPE]) {
        result[unit.TYPE] = [];
      }
      result[unit.TYPE]!.push({
        label: key,
        value: snakeCase(key)
      });
      return result;
    },
    {} as Record<string, { label: string; value: string }[]>
  );

  return Object.entries(groupedUnits).map(([group, items]) => {
    return {
      label: group,
      items
    };
  });
});

async function onUpdateSelectedUnit(value: string | null) {
  if (selectedUnit.value) {
    editorUnitsModule.abort();
  }
  selectedUnit.value = value;
  if (value) {
    console.log(`Adding unit: ${value}`);
    await editorUnitsModule.setUnitKey(value);
  }
}

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

function onClickClose() {
  editorUnitsModule.abort();
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
.bm-panel-editor-units {
  --count: 10;
  --item-height: 24.5px;

  & .units {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-medium);
    height: calc(
      var(--count) * var(--item-height) + var(--bm-spacing-small) *
        (var(--count) - 1) + var(--item-height) / 2
    );
    overflow: auto;
  }
}
</style>
