<template>
  <div
    ref="rootEl"
    class="bm-gun-screen"
    :class="{ fullscreen }"
    :style="{
      '--dimension-x': dimension.x,
      '--dimension-y': dimension.y,
      '--progress': cameraAngleProgress,
      '--test-scale-count': 16
    }">
    <div ref="screenEl" class="screen">
      <canvas ref="canvasEl"></canvas>
      <div class="effect"></div>
      <div class="target"></div>
      <bm-head-up-indicator
        v-if="fullscreen && indicators"
        :app="$props.app"
        :camera="camera" />
    </div>
    <div class="bottom">
      <div class="angle">
        X: {{ cameraAngles.x }}° | Y: {{ cameraAngles.y }}°
      </div>
      <div class="controls">
        <button @click="onClickZoomIn">
          <icon-plus />
        </button>
        <button @click="onClickZoomOut">
          <icon-minus />
        </button>
        <button @click="onClickFullscreen">
          <icon-arrows-pointing-in v-if="fullscreen" />
          <icon-arrows-pointing-out v-else />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type { WebGLRenderer } from 'three';
import { MathUtils, PerspectiveCamera, Vector2, Vector3 } from 'three';
import {
  createComposer,
  createRenderer,
  DEFAULT_SHADOW_QUALITY,
  setRendererShadow
} from '@blue-might/app/lib/classes/Renderer';
import type WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { Subscription } from 'rxjs';

import type Unit from '../lib/classes/Unit';
import type { UnitModules } from '../lib/classes/Unit';
import icons, { ICON } from '../utils/icons';
import type AppPlayground from '../lib/classes/app/AppPlayground';

import BmHeadUpIndicator from './HeadUpIndicator.vue';

const IconPlus = await icons[ICON.PLUS];
const IconMinus = await icons[ICON.MINUS];
const IconArrowsPointingIn = await icons[ICON.ARROWS_POINTING_IN];
const IconArrowsPointingOut = await icons[ICON.ARROWS_POINTING_OUT];

const rootEl = ref<HTMLDivElement | null>(null);
const screenEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);

const cameraAngles = ref({
  x: 0,
  y: 0
});
const cameraAngleProgress = ref(0);

const fullscreen = ref(false);

const subscription = new Subscription();

const $props = defineProps<{
  indicators?: boolean;
  app: AppPlayground;
  unit: Unit<UnitModules & { weapon: WeaponUnitModule }>;
}>();

const $emit = defineEmits<{
  (e: 'fullscreen', value: boolean): void;
}>();

const zoom = ref(1);
const zoomFactor = ref(1.25);

let renderer: WebGLRenderer;
let composer: EffectComposer;
const camera = ref<Raw<PerspectiveCamera>>();
const resizeObserver = new ResizeObserver(() => {
  refresh();
});

const dimension = ref(new Vector2());
function refresh() {
  if (renderer && composer) {
    dimension.value = new Vector2(
      rootEl.value!.offsetWidth,
      rootEl.value!.offsetHeight
    );
    console.log('dimension', dimension);
    renderer.setSize(dimension.value.x, dimension.value.y);
    composer.setSize(dimension.value.x, dimension.value.y);
    camera.value!.aspect = dimension.value.x / dimension.value.y;
    camera.value!.updateProjectionMatrix();
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

  camera.value = markRaw(
    new PerspectiveCamera(60, dimension.x / dimension.y, 0.1, 2000)
  );

  function onUpdateCamera() {
    if (camera.value) {
      const dir = new Vector3();
      camera.value.getWorldDirection(dir);

      const unitDir = new Vector3();
      $props.unit.root.getWorldDirection(unitDir);

      const pitch = Math.asin(dir.y); // rad
      const deg = MathUtils.radToDeg(pitch);

      const yaw = Math.atan2(dir.x, dir.z); // rad
      const degY = MathUtils.radToDeg(yaw);

      const unitYaw = Math.atan2(unitDir.x, unitDir.z); // rad
      const unitDegYaw = MathUtils.radToDeg(unitYaw);

      // kurze, signierte Winkeldifferenz in Grad im Bereich [-180, 180]
      const angleDiffDeg = (a: number, b: number) =>
        ((a - b + 540) % 360) - 180;

      const yawDiff = angleDiffDeg(degY, unitDegYaw);

      cameraAngles.value = {
        x: Math.abs(Math.round(deg)),
        y: Math.round(yawDiff)
      };
      cameraAngleProgress.value = yawDiff / 180;
    }
  }

  renderer = createRenderer(canvasEl.value!, dimension, {
    pixelated: appRenderer.getPixelated()
  });

  setRendererShadow(renderer, DEFAULT_SHADOW_QUALITY);

  const c = camera.value!;
  composer = createComposer(renderer, scene, c, dimension);

  const target = new Vector3();
  renderer.setAnimationLoop(() => {
    const unit = $props.unit;
    renderer.render($props.app.getScene(), c);
    const weaponModule = unit?.modules.weapon;
    if (weaponModule) {
      const index = weaponModule.getSlotIndex();
      const sourceDirection = weaponModule.getSourceDirections()[index];
      const sourcePosition = weaponModule.getSourcePositions()[index];
      const barrelTarget = weaponModule.getBarrelTargets()[index];
      if (unit && sourceDirection && sourcePosition && barrelTarget) {
        barrelTarget.getWorldPosition(target);
        c.position.copy(target);
        c.lookAt(
          c.position.x + sourceDirection.x,
          c.position.y + sourceDirection.y,
          c.position.z + sourceDirection.z
        );

        c.fov = 60 / zoom.value; // Basis-FOV geteilt durch Zoom-Faktor
        c.updateProjectionMatrix(); // NEU: Projektionsmatrix aktualisieren
        onUpdateCamera();
      }
    }
  });
}
onMounted(() => {
  setup();
  resizeObserver.observe(rootEl.value!);
});

onUnmounted(() => {
  subscription.unsubscribe();
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
  color: lime;
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
    overflow: hidden;

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

  & .bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
    width: 100%;
  }

  & .controls {
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

  & .angle {
    width: 100%;
    font-size: 12px;
    text-align: center;
  }
}
</style>
