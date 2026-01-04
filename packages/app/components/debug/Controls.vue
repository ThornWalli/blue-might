<template>
  <bm-details label="Controls" class="bm-debug-controls">
    <p>
      Pos.:
      <code
        >{{ currentPosition.x.toFixed(2) }}, 0,
        {{ currentPosition.y.toFixed(2) }}</code
      >
    </p>
    <p>Tile Type: {{ tileType }}</p>
    <p>Surface Height: {{ surfaceHeight }}</p>
    <p>Terrain Height: {{ terrainHeight }}</p>
    <base-form-field label="Navigator" label-top>
      <bm-select v-model="currentNavigator" :options="navigatorOptions">
      </bm-select>
    </base-form-field>
    <bm-button @click="onClickLockGrid">
      {{ lockGrid ? 'Unlock Grid' : 'Lock Grid' }}
    </bm-button>
  </bm-details>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Subscription } from 'rxjs';
import { Vector2 } from 'three';
import { NAVIGATOR_TYPE } from '@blue-might/app/lib/classes/mapModule/Pathfinding';

import type App from '../../lib/classes/App';
import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';
import BmSelect from '../Select.vue';
import BaseFormField from '../base/FormField.vue';

const subscription = new Subscription();
const currentPosition = ref<Vector2>(new Vector2(0, 0));
const lockGrid = ref<boolean>(false);

const $props = defineProps<{
  app: App;
}>();

const currentNavigator = ref<NAVIGATOR_TYPE | null>(
  NAVIGATOR_TYPE.GROUND_LARGE
);
const navigatorOptions = computed(() => {
  return Object.values(NAVIGATOR_TYPE).map(key => {
    return {
      label: String(key),
      value: String(key)
    };
  });
});

onMounted(() => {
  const app = $props.app;
  subscription.add(
    app.modules.debug.observables.lockGrid$.subscribe(v => {
      lockGrid.value = v;
    })
  );
  subscription.add(
    app.modules.debug.observables.currentPosition$.subscribe(p => {
      currentPosition.value.copy(p);

      const navigator = app.modules.map
        .getMap()
        .modules.pathfinding.getGroundNavigatorLarge();
      const grid = navigator.getGrid();
      const node = navigator.worldToNode(p.x, p.y);

      tileType.value = (node && grid.getTileType?.(node).toString()) ?? '';

      surfaceHeight.value = app.modules.map
        .getMap()
        .modules.ground.getSurfaceHeightAt(p.x, p.y);
      terrainHeight.value = app.modules.map
        .getMap()
        .modules.ground.getHeightAt(p.x, p.y);
    })
  );
});

const tileType = ref<string>('');
const surfaceHeight = ref<number>(0);
const terrainHeight = ref<number>(0);

onUnmounted(() => {
  subscription.unsubscribe();
});

watch(
  () => currentNavigator.value,
  newValue => {
    const app = $props.app;
    app.modules.debug.setLockGridNavigator(newValue);
  }
);

function onClickLockGrid() {
  const app = $props.app;
  app.modules.debug.setLockGrid(!lockGrid.value);
}
</script>

<style lang="postcss" scoped>
.markers + div {
  display: flex;
  flex-direction: column;
}
</style>
