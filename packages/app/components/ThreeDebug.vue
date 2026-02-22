<template>
  <div ref="root" class="three-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { fromEvent, Subscription } from 'rxjs';
import type { Camera } from 'three';
import {
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Scene,
  AmbientLight,
  DirectionalLight,
  SRGBColorSpace,
  NeutralToneMapping,
  BasicShadowMap,
  Timer
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

//#region Three.js setup

const timer = new Timer();
timer.connect(document);

const root = ref<HTMLDivElement | null>(null);
let scene: Scene;
let renderer: WebGLRenderer;
let controls: OrbitControls;

const subscription = new Subscription();

const $props = defineProps<{
  pixelated?: boolean;
  background?: number;
  setupScene: (scene: Scene) => Promise<void> | void;
  updateAnimation: (ctx: { scene: Scene; time: number; delta: number }) => void;
  destroy?: (ctx: { scene: Scene }) => void;

  cameraZoom?: number;
}>();

let camera: PerspectiveCamera;
function createCamera() {
  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // Initiale Position basierend auf Zoom
  const zoom = $props.cameraZoom ?? 1;
  camera.position.set(2 / zoom, 2 / zoom, 2 / zoom); // Näher für höheren Zoom
  camera.lookAt(0, 0, 0); // Auf Zentrum schauen

  return camera;
}

watch(
  () => $props.cameraZoom,
  newZoom => {
    if (camera && newZoom !== undefined) {
      // Position skalieren für Zoom
      const baseDistance = 2; // Basis-Distanz
      const distance = baseDistance / newZoom;
      camera.position.set(distance, distance, distance);
      camera.lookAt(0, 0, 0);
    }
  }
);

function createControls(renderer: WebGLRenderer, camera: Camera) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  return controls;
}

function createLights() {
  const ambient = new AmbientLight(0xffffff, 0.6);

  const dir = new DirectionalLight(0xffffff, 0.6);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 1024;
  dir.shadow.mapSize.height = 1024;
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 50;

  return [ambient, dir];
}

function createRenderer(pixelated = false) {
  const renderer = new WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.autoUpdate = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = BasicShadowMap;

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  if (pixelated) {
    renderer.setPixelRatio(480 / window.innerWidth);
  }

  return renderer;
}

onMounted(async () => {
  if (!root.value) return;

  scene = new Scene();
  scene.background = new Color($props.background ?? 0x000000);

  renderer = createRenderer($props.pixelated);
  root.value.appendChild(renderer.domElement);

  camera = createCamera();
  controls = createControls(renderer, camera);

  scene.add(...createLights());

  renderer.setAnimationLoop(time => {
    controls.update();
    timer.update(time);

    renderer.render(scene, camera);

    const rawDelta = timer.getDelta();
    const delta = Math.min(rawDelta, 1 / 60);

    $props.updateAnimation({
      scene,
      time,
      delta
    });
  });

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  subscription.add(fromEvent(window, 'resize').subscribe(handleResize));

  await $props.setupScene(scene);
});

onUnmounted(() => {
  timer.disconnect();
  timer.dispose();
  $props.destroy?.({ scene });

  if (renderer) {
    renderer.dispose();
  }
  if (controls) {
    controls.dispose();
  }
  subscription.unsubscribe();
});

//#endregion
</script>

<style scoped>
.three-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
