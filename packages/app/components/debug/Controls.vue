<template>
  <bm-details label="Controls" class="bm-debug-controls">
    <p>
      Pos.: {{ currentPosition.x.toFixed(2) }} /
      {{ currentPosition.y.toFixed(2) }}
    </p>
    <bm-button @click="onClickLockGrid">
      {{ lockGrid ? 'Unlock Grid' : 'Lock Grid' }}
    </bm-button>
  </bm-details>
</template>

<script lang="ts" setup>
import type App from '../../lib/classes/App';
import { onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';

import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';

import { Vector2 } from 'three';

const subscription = new Subscription();
const currentPosition = ref<Vector2>(new Vector2(0, 0));
const lockGrid = ref<boolean>(false);

const $props = defineProps<{
  app: App;
}>();

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
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

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
