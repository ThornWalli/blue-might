<template>
  <bm-details label="Controls" class="bm-debug-effect">
    <bm-button @click="onClickLockAddExplosion"> Add Explosion </bm-button>
  </bm-details>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import { Vector2, Vector3 } from 'three';

import type App from '../../lib/classes/App';
import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';

const subscription = new Subscription();
const currentPosition = ref<Vector2>(new Vector2(0, 0));

const $props = defineProps<{
  app: App;
}>();

onMounted(() => {
  const app = $props.app;
  subscription.add(
    app.modules.debug.observables.currentPosition$.subscribe(p => {
      currentPosition.value.copy(p);
    })
  );
});

function onClickLockAddExplosion() {
  const app = $props.app;
  const map = app.modules.map.getMap();
  const y = map.modules.ground.getSurfaceHeightAt(
    currentPosition.value.x,
    currentPosition.value.y
  );
  map.modules.effect.addExplosion(
    new Vector3(currentPosition.value.x, y, currentPosition.value.y)
  );
}
onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<style lang="postcss" scoped>
.markers + div {
  display: flex;
  flex-direction: column;
}
</style>
