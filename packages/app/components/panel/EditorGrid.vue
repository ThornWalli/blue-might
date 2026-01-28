<template>
  <bm-panel class="bm-panel-editor-grid" title="Editor Grid">
    <bm-toggle
      :model-value="snapPosition"
      label="Snap Position"
      @update:model-value="app.modules.editorGrid.setSnapPosition($event)" />
    <bm-toggle
      :model-value="gridVisible"
      label="Grid Visibility"
      @update:model-value="app.modules.editorGrid.setGridActive($event)" />
    <bm-form-field label="Grid Size">
      <bm-select
        :model-value="gridSize"
        :options="gridSizeOptions"
        label="Grid Size"
        @update:model-value="app.modules.editorGrid.setGridSize($event)" />
    </bm-form-field>
    <div class="position">
      Position:
      <span>
        {{ currentPosition.x.toFixed(2) }},
        {{ currentPosition.y.toFixed(2) }}
      </span>
    </div>
  </bm-panel>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { Vector2 } from 'three';
import { Subscription } from 'rxjs';

import BmPanel from '../Panel.vue';
import BmSelect from '../Select.vue';
import BmFormField from '../FormField.vue';
import BmToggle from '../Toggle.vue';

const $props = defineProps<{
  app: AppEditor;
}>();

const snapPosition = ref(false);
const gridVisible = ref(false);
const gridSize = ref(1);
const gridSizeOptions = ref(
  Array(10)
    .fill(null)
    .map((_, i) => ({
      label: `${i + 1}`,
      value: 1 / (i + 1)
    }))
);

const currentPosition = ref(new Vector2());

const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    $props.app.modules.editorGrid.observables.currentPosition$.subscribe(p => {
      currentPosition.value.copy(p);
    })
  );

  subscription.add(
    $props.app.modules.editorGrid.observables.gridActive$.subscribe(v => {
      gridVisible.value = v;
    })
  );

  subscription.add(
    $props.app.modules.editorGrid.observables.gridSize$.subscribe(v => {
      gridSize.value = v;
    })
  );
  subscription.add(
    $props.app.modules.editorGrid.observables.snapPosition$.subscribe(p => {
      snapPosition.value = p;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>
<style lang="postcss" scoped>
.bm-panel-editor-grid {
  & .position {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-base);
    font-size: 12px;
    font-weight: bold;
    text-align: center;
  }
}
</style>
