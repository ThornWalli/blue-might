<template>
  <bm-details label="Controls" class="bm-debug-effect">
    <bm-button @click="onClickLockAddExplosion"> Add Explosion </bm-button>
  </bm-details>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import { Vector2, Vector3 } from 'three';
import type { App } from '@blue-might/app/lib/types';
import type DebugAppModule from '@blue-might/app/lib/classes/appModule/Debug';

import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';

const subscription = new Subscription();
const currentPosition = ref<Vector2>(new Vector2(0, 0));

const $props = defineProps<{
  app: App;
}>();

const debugModule = computed(() => {
  const app = $props.app;
  if ('debug' in app.modules) {
    return app.modules.debug as DebugAppModule;
  }
  return null;
});

onMounted(() => {
  if (debugModule.value) {
    subscription.add(
      debugModule.value.observables.currentPosition$.subscribe(p => {
        currentPosition.value.copy(p);
      })
    );
  }
});

function onClickLockAddExplosion() {
  const app = $props.app;
  const map = app.modules.map.getMap();
  const y =
    map?.modules.surface.getSurfaceHeightAt(
      currentPosition.value.x,
      currentPosition.value.y
    ) ?? 0;
  map?.modules.effect.addExplosion(
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
