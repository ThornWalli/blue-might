<template>
  <div ref="rootEl" class="bm-gun-screen" :class="{ fullscreen }">
    <div ref="screenEl" class="screen">
      <canvas ref="canvasEl"></canvas>
      <div class="effect"></div>
      <div class="target"></div>
    </div>
    <div class="controls bottom">
      <button @click="onClickZoomIn">
        <svg-icon-plus />
      </button>
      <button @click="onClickZoomOut">
        <svg-icon-minus />
      </button>
      <button @click="onClickFullscreen">
        <svg-icon-arrows-pointing-in v-if="fullscreen" />
        <svg-icon-arrows-pointing-out v-else />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import type { WebGLRenderer } from 'three';
import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import {
  createComposer,
  createRenderer,
  DEFAULT_SHADOW_QUALITY,
  setRendererShadow
} from '@blue-might/app/lib/classes/Renderer';
import type WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

import SvgIconPlus from '../assets/icons/micro/plus.svg?component';
import SvgIconMinus from '../assets/icons/micro/minus.svg?component';
import SvgIconArrowsPointingIn from '../assets/icons/micro/arrows-pointing-in.svg?component';
import SvgIconArrowsPointingOut from '../assets/icons/micro/arrows-pointing-out.svg?component';
import type App from '../lib/classes/App';
import type Unit from '../lib/classes/Unit';
import type { UnitModules } from '../lib/classes/Unit';

const rootEl = ref<HTMLDivElement | null>(null);
const screenEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);

const fullscreen = ref(false);

const $props = defineProps<{
  app: App;
  unit: Unit<UnitModules & { weapon: WeaponUnitModule }>;
}>();

const $emit = defineEmits<{
  (e: 'fullscreen', value: boolean): void;
}>();

const zoom = ref(1);
const zoomFactor = ref(1.25);

let renderer: WebGLRenderer;
let composer: EffectComposer;
let camera: PerspectiveCamera;
const resizeObserver = new ResizeObserver(() => {
  refresh();
});

function refresh() {
  if (renderer && composer) {
    const dimension = new Vector2(
      rootEl.value!.offsetWidth,
      rootEl.value!.offsetHeight
    );
    console.log('dimension', dimension);
    renderer.setSize(dimension.x, dimension.y);
    composer.setSize(dimension.x, dimension.y);
    camera.aspect = dimension.x / dimension.y;
    camera.updateProjectionMatrix();
  }
}

function setup() {
  if (renderer) return;

  const appRenderer = $props.app.renderer;
  const scene = appRenderer.scene;
  const dimension = new Vector2(
    rootEl.value!.offsetWidth,
    rootEl.value!.offsetHeight
  );

  camera = new PerspectiveCamera(60, dimension.x / dimension.y, 0.1, 2000);

  renderer = createRenderer(canvasEl.value!, dimension, {
    pixelated: appRenderer.getPixelated()
  });

  setRendererShadow(renderer, DEFAULT_SHADOW_QUALITY);

  composer = createComposer(renderer, scene, camera, dimension);

  const target = new Vector3();
  renderer.setAnimationLoop(() => {
    const unit = $props.unit;
    renderer.render($props.app.getScene(), camera);
    const weaponModule = unit?.modules.weapon;
    if (weaponModule) {
      const index = weaponModule.getSlotIndex();
      const sourceDirection = weaponModule.getSourceDirections()[index];
      const sourcePosition = weaponModule.getSourcePositions()[index];
      const barrelTarget = weaponModule.getBarrelTargets()[index];
      if (unit && sourceDirection && sourcePosition && barrelTarget) {
        barrelTarget.getWorldPosition(target);
        camera.position.copy(target);
        camera.lookAt(
          camera.position.x + sourceDirection.x,
          camera.position.y + sourceDirection.y,
          camera.position.z + sourceDirection.z
        );

        camera.fov = 60 / zoom.value; // Basis-FOV geteilt durch Zoom-Faktor
        camera.updateProjectionMatrix(); // NEU: Projektionsmatrix aktualisieren
      }
    }
  });
}
onMounted(() => {
  setup();
  resizeObserver.observe(rootEl.value!);
});

onUnmounted(() => {
  resizeObserver.disconnect();
  if (renderer) {
    renderer.setAnimationLoop(null);
    renderer?.dispose();
    composer?.dispose();
  }
});

function onClickZoomIn() {
  zoom.value *= zoomFactor.value;
}

function onClickZoomOut() {
  zoom.value = Math.max(1, zoom.value / zoomFactor.value);
}

function onClickFullscreen() {
  fullscreen.value = !fullscreen.value;
  $emit('fullscreen', fullscreen.value);
  window.setTimeout(() => {
    refresh();
  }, 2000);
}
</script>

<style lang="postcss" scoped>
.bm-gun-screen {
  position: relative;
  pointer-events: auto;

  &:not(.fullscreen) {
    &::before {
      display: block;
      padding-top: 100%;
      content: '';
    }
  }

  &.fullscreen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  & .screen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    & canvas {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
    }

    & .effect {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
      background: lime;

      /*
    box-shadow:
      inset 0 12px 18px rgb(255 255 255 / 25%),
      inset 0 -18px 30px rgb(0 0 0 / 55%),
      0 25px 50px rgb(0 0 0 / 60%);
      */
      mix-blend-mode: multiply;
    }

    & .target {
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

  & .controls {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    gap: var(--bm-spacing-small);
    justify-content: space-between;
    justify-content: center;
    width: 100%;

    & button {
      display: block;
      padding: var(--bm-spacing-small);
      color: black;
      appearance: none;
      cursor: pointer;
      background: transparent;
      background-color: rgb(0 255 0 / 50%);
      border: none;

      &:hover {
        background-color: rgb(0 255 0 / 75%);
      }
    }
  }

  & svg {
    display: block;
    width: 16px;
  }
}
</style>
