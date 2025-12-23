<template>
  <div
    ref="rootEl"
    class="bm-app"
    :style="{
      '--cursor': currentCursor?.src
        ? `url(${currentCursor?.src}) 0 0, auto`
        : currentCursor?.type
    }">
    <bm-renderer ref="rendererEl" debug :options="config.rendererOptions" />
    <transition name="fade-short">
      <component :is="currentComponent" v-if="ready" :app="app!" />
    </transition>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  nextTick,
  onMounted,
  onUnmounted,
  defineAsyncComponent,
  markRaw,
  computed
} from 'vue';
import App, { APP_MODE, type AppConfig } from '../lib/classes/App';
import BmRenderer from './Renderer.vue';

import setupFonts from './../utils/fonts';
import { fromEvent, Subscription } from 'rxjs';
import { Vector2 } from 'three';
import type Renderer from '../lib/classes/Renderer';
import type { Cursor } from '../lib/classes/appModule/Cursor';

import type { MapDescription } from '../lib/classes/Map';

setupFonts();
const $props = defineProps<{
  config: AppConfig;
  map: MapDescription;
  onSetup?: (app: App) => Promise<void>;
}>();

const rendererEl = ref<InstanceType<typeof BmRenderer> | null>(null);

const rootEl = ref<HTMLElement>();
const dimension = ref<Vector2>();
const subscription = new Subscription();
const app = ref<App>();
const ready = ref(false);

const currentComponent = computed(() => {
  switch ($props.config.mode) {
    case APP_MODE.DEBUG:
      return defineAsyncComponent(() => import('./app/Debug.vue'));
    default:
      return defineAsyncComponent(() => import('./app/Playground.vue'));
  }
});

onMounted(() => {
  nextTick(async () => {
    await setup();
  });
});

onUnmounted(() => {
  // app.value?.destroy();
  subscription.unsubscribe();
});

async function setup() {
  const { renderer } = rendererEl.value!;

  if (!renderer) {
    throw new Error('Renderer not ready');
  }

  onResize();

  await setupApp(renderer);
  if (app.value) {
    await $props.onSetup?.(app.value);
    await app.value.enterMap($props.map);
  } else {
    throw new Error('App not initialized');
  }
}

const currentCursor = ref<Cursor>();

async function setupApp(renderer: Renderer) {
  app.value = markRaw(new App($props.config, renderer));

  await app.value.setup();
  ready.value = true;
  subscription.add(
    fromEvent(window, 'resize', {
      passive: true
    }).subscribe(() => {
      onResize();
    })
  );

  return app.value;
}

function onResize() {
  const { width, height } = rootEl.value!.getBoundingClientRect();
  dimension.value = new Vector2(width, height);
  rendererEl.value?.renderer?.resize(dimension.value);
}
</script>
<style lang="postcss" scoped>
.bm-app {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  & .bm-renderer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: var(--cursor);
  }
}
</style>
