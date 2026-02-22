<template>
  <div
    ref="rootEl"
    class="bm-app"
    :style="{
      '--cursor': currentCursor?.src
        ? `url(${currentCursor?.src}) 0 0, auto`
        : currentCursor?.type
    }">
    <bm-renderer ref="rendererEl" :options="config.rendererOptions" />
    <transition name="fade-short">
      <component :is="currentComponent" v-if="ready" :app="app!" />
    </transition>
    <transition name="fade-short">
      <div v-if="!appReady" class="loading">Loading…</div>
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
import { fromEvent, Subscription } from 'rxjs';
import { Vector2 } from 'three';

import type Renderer from '../lib/classes/Renderer';
import type { Cursor } from '../lib/classes/appModule/Cursor';
import type { MapDescription } from '../lib/types/map';
import AppEditor from '../lib/classes/app/AppEditor';
import AppDebug from '../lib/classes/app/AppDebug';
import AppPlayground from '../lib/classes/app/AppPlayground';
import { APP_MODE, type AppConfig } from '../lib/classes/BaseApp';
import type { App } from '../lib/types';

import setupFonts from './../utils/fonts';
import BmRenderer from './Renderer.vue';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const app = ref<App & any>();
const ready = ref(false);

const currentComponent = computed(() => {
  switch ($props.config.mode) {
    case APP_MODE.DEBUG:
      return defineAsyncComponent(() => import('./app/Debug.vue'));
    case APP_MODE.EDITOR:
      return defineAsyncComponent(() => import('./app/Editor.vue'));
    default:
      return defineAsyncComponent(() => import('./app/Playground.vue'));
  }
});

const appReady = ref(false);

onMounted(() => {
  nextTick(async () => {
    await setup();
  });
});

onUnmounted(() => {
  app.value?.destroy();
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
    await app.value.modules.map.enterMap($props.map);
    appReady.value = true;
  } else {
    throw new Error('App not initialized');
  }
}

const currentCursor = ref<Cursor>();

const appDefinitions = {
  [APP_MODE.PLAYGROUND]: AppPlayground,
  [APP_MODE.EDITOR]: AppEditor,
  [APP_MODE.DEBUG]: AppDebug
};

async function setupApp(renderer: Renderer) {
  app.value = markRaw(
    new appDefinitions[$props.config.mode ?? APP_MODE.PLAYGROUND](
      $props.config,
      renderer,
      {
        updateActive: $props.config.mode !== APP_MODE.EDITOR
      }
    )
  );

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

.loading {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--font-family-bit-font);
  font-size: var(--font-size-bit-font);
  line-height: var(--line-height-bit-font);
  color: white;
  background: #000;
}

.fade-short-enter-active,
.fade-short-leave-active {
  transition: opacity 0.2s ease;
}

.fade-short-enter,
.fade-short-leave-to {
  opacity: 0;
}
</style>
