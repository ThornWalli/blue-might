<template>
  <div
    class="base-sticky-wrapper"
    :style="{
      '--internal-translate-x': internalTranslate?.x ?? 0,
      '--internal-translate-y': internalTranslate?.y ?? 0,
      '--translate-x': translate?.[0] ?? 0,
      '--translate-y': translate?.[1] ?? 0
    }">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import type { App } from '@blue-might/app/lib/types';
import { Subscription } from 'rxjs';
import {
  type Camera,
  Frustum,
  Matrix4,
  Vector2,
  Vector3,
  type Object3D
} from 'three';
import { onMounted, onUnmounted, ref } from 'vue';

const internalTranslate = ref<Vector2 | null>(null);
const $props = defineProps<{
  app: App;
  target: StickyWrapperTarget;
  translate?: [number | string, number | string];
}>();

const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    $props.app.renderer.observables.animationLoop$.subscribe(() =>
      updateControls()
    )
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function updateControls() {
  const app = $props.app;
  let position;
  if ($props.target !== undefined) {
    if ($props.target instanceof Vector3) {
      position = $props.target as Vector3;
    } else {
      position = ($props.target as Object3D).position;
    }
  }
  if (position) {
    internalTranslate.value = getStickyTranslate(
      app.renderer.modules.camera.getCamera(),
      position
    );
  } else {
    internalTranslate.value = null;
  }
}
</script>

<script lang="ts">
const frustum = new Frustum();
const matrix = new Matrix4();
export function getStickyTranslate(camera: Camera, position: Vector3) {
  frustum.setFromProjectionMatrix(
    matrix
      .clone()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  );
  if (position && frustum.containsPoint(position)) {
    position = position.clone().project(camera);

    const screenX = ((position.x + 1) / 2) * window.innerWidth;
    const screenY = (-(position.y - 1) / 2) * window.innerHeight;

    return new Vector2(screenX, screenY);
  }

  return new Vector2();
}

export type StickyWrapperTarget = Object3D | Vector3 | null | undefined;
</script>

<style lang="postcss" scoped>
.base-sticky-wrapper {
  position: absolute;
  top: 0;
  left: 0;

  /* z-index: 10; */
  transform: translate(
    calc(var(--internal-translate-x, 0) * 1px + var(--translate-x, 0px)),
    calc(var(--internal-translate-y, 0) * 1px + var(--translate-y, 0px))
  );
}
</style>
