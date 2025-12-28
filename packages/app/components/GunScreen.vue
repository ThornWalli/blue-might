<template>
  <div ref="screenEl" class="bm-gun-screen">
    <canvas ref="canvasEl"></canvas>
    <div></div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import type { WebGLRenderer } from 'three';
import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { createRenderer } from '@blue-might/app/lib/classes/Renderer';
import GunUnitModule from '@blue-might/app/lib/classes/unitModule/Gun';

import type App from '../lib/classes/App';
import type Unit from '../lib/classes/Unit';

const screenEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);

const $props = defineProps<{
  app: App;
  unit: Unit;
}>();

let renderer: WebGLRenderer;

function setup() {
  if (renderer) return;

  const dimension = new Vector2(
    screenEl.value!.offsetWidth,
    screenEl.value!.offsetHeight
  );
  renderer = createRenderer(canvasEl.value!, dimension, {
    pixelated: false
  });

  const camera = new PerspectiveCamera(
    60, // FOV
    dimension.x / dimension.y,
    0.1,
    2000
  );

  renderer.setAnimationLoop(() => {
    const unit = $props.unit;
    renderer.render($props.app.getScene(), camera);
    const gunModule = unit?.getModuleByType(GunUnitModule);
    if (gunModule) {
      const sourceDirection = gunModule.getSourceDirections()[0];
      const sourcePosition = gunModule.getSourcePositions()[0];
      const barrelTarget = gunModule.getBarrelTargets()[0];
      if (unit && sourceDirection && sourcePosition && barrelTarget) {
        const testt = new Vector3();
        barrelTarget.getWorldPosition(testt);
        camera.position.copy(testt);

        const test = camera.position.clone().add(sourceDirection);
        camera.lookAt(test);
      }
    }
  });
}
onMounted(() => {
  setup();
});
</script>

<style lang="postcss" scoped>
.bm-gun-screen {
  position: relative;
  width: 240px;

  &::before {
    display: block;
    padding-top: 100%;
    content: '';
  }

  & canvas {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  & div {
    --color: lime;

    position: absolute;
    top: 50%;
    left: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 8px;
    height: 8px;
    content: '';
    border: solid var(--color) 1px;
    border-radius: 50%;
    opacity: 0.4;
    transform: translate(-50%, -50%);

    &::before {
      display: block;
      align-items: center;
      justify-content: center;
      width: 2px;
      height: 2px;
      content: '';
      background: var(--color);
    }
  }
}
</style>
