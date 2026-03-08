<template>
  <div
    class="base-sticky-wrapper"
    :class="{
      empty
    }"
    :style="{
      '--wrapper-translate-x': wrapperTranslate?.x ?? 0,
      '--wrapper-translate-y': wrapperTranslate?.y ?? 0,
      '--wrapper-size-x': wrapperSize?.x ?? 0,
      '--wrapper-size-y': wrapperSize?.y ?? 0
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
  type Object3D,
  Box3
} from 'three';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const wrapperTranslate = ref<Vector2>(new Vector2());
const wrapperSize = ref<Vector2>(new Vector2());

const $props = defineProps<{
  app: App;
  camera?: Camera;
  target: StickyWrapperTarget;
  dimension?: Vector2;
  size?: StickyWrapperSize;
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

const empty = computed(() => {
  return (
    (wrapperSize.value.x === 0 && wrapperSize.value.y === 0) ||
    (wrapperTranslate.value.x === 0 && wrapperTranslate.value.y === 0)
  );
});

function updateControls() {
  const app = $props.app;
  let position;
  let size = new Vector3(1, 1, 1);
  if ($props.target !== undefined) {
    if ($props.target instanceof Vector3) {
      position = $props.target as Vector3;
    } else if ($props.target) {
      const box = new Box3().setFromObject($props.target);
      size = box.getSize(new Vector3());
      position = ($props.target as Object3D).position;
    } else {
      throw new Error('Invalid target');
    }
  }
  if (position) {
    const { x, y, width, height } = getStickyBox(
      $props.camera ?? app.renderer.modules.camera.getCamera(),
      position,
      size,
      $props.dimension ??
        new Vector2(app.renderer.el.offsetWidth, app.renderer.el.offsetHeight)
    );
    wrapperTranslate.value.set(x, y);
    wrapperSize.value.set(width, height);
  }
}
</script>

<script lang="ts">
export function getStickyBox(
  camera: Camera,
  position: Vector3,
  size: Vector3,
  dimension: Vector2
) {
  camera.updateMatrix();
  camera.updateMatrixWorld();

  const frustum = new Frustum();
  const matrix = new Matrix4();
  frustum.setFromProjectionMatrix(
    matrix
      .clone()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  );

  // Berechne die acht Ecken der 3D-Box (zentriert um die Position)
  const halfWidth = size.x / 2;
  const halfHeight = size.y / 2;
  const halfDepth = size.z / 2;
  const corners = [
    // Vorne (z + halfDepth)
    new Vector3(
      position.x - halfWidth,
      position.y - halfHeight,
      position.z + halfDepth
    ),
    new Vector3(
      position.x + halfWidth,
      position.y - halfHeight,
      position.z + halfDepth
    ),
    new Vector3(
      position.x + halfWidth,
      position.y + halfHeight,
      position.z + halfDepth
    ),
    new Vector3(
      position.x - halfWidth,
      position.y + halfHeight,
      position.z + halfDepth
    ),
    // Hinten (z - halfDepth)
    new Vector3(
      position.x - halfWidth,
      position.y - halfHeight,
      position.z - halfDepth
    ),
    new Vector3(
      position.x + halfWidth,
      position.y - halfHeight,
      position.z - halfDepth
    ),
    new Vector3(
      position.x + halfWidth,
      position.y + halfHeight,
      position.z - halfDepth
    ),
    new Vector3(
      position.x - halfWidth,
      position.y + halfHeight,
      position.z - halfDepth
    )
  ];

  // Projiziere die Ecken auf den Bildschirm, falls sie im Frustum sind
  const projected: Vector2[] = [];
  for (const corner of corners) {
    if (frustum.containsPoint(corner)) {
      const projectedCorner = corner.clone().project(camera);
      const screenX = ((projectedCorner.x + 1) / 2) * dimension.x;
      const screenY = (-(projectedCorner.y - 1) / 2) * dimension.x;
      projected.push(new Vector2(screenX, screenY));
    }
  }

  if (projected.length === 0) {
    // Wenn keine Ecke im Frustum ist, gib eine leere Box zurück
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Berechne die 2D-Bounding-Box der projizierten Punkte
  const xs = projected.map(p => p.x);
  const ys = projected.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  let screenX = 0;
  let screenY = 0;

  if (frustum.containsPoint(position)) {
    position = position.clone().project(camera);
    screenX = ((position.x + 1) / 2) * dimension.x;
    screenY = (-(position.y - 1) / 2) * dimension.y;
  }

  return {
    x: screenX,
    y: screenY,
    width: maxX - minX,
    height: maxY - minY
  };
}
export type StickyWrapperTarget = Object3D | Vector3 | null | undefined;
export type StickyWrapperSize = Vector3 | null | undefined;
</script>

<style lang="postcss" scoped>
.base-sticky-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(var(--wrapper-size-x, 0) * 1px);
  height: calc(var(--wrapper-size-y, 0) * 1px);
  transform: translate(-50%, -50%)
    translate(
      calc(var(--wrapper-translate-x, 0) * 1px),
      calc(var(--wrapper-translate-y, 0) * 1px)
    );
}
</style>
