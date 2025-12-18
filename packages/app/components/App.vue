<template>
  <div
    ref="rootEl"
    class="bm-app"
    :style="{
      '--cursor': currentCursor?.src
        ? `url(${currentCursor?.src}) 0 0, auto`
        : currentCursor?.type
    }">
    <bm-renderer ref="rendererEl" debug :options="rendererOptions" />
    <transition name="fade-short">
      <component :is="currentComponent" v-if="ready && hasPlayer" :app="app!" />
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
import App, { type AppConfig } from '../lib/classes/App';
import BmRenderer from './Renderer.vue';

import setupFonts from './../utils/fonts';
import type { RendererOptions } from '../types';
import { filter, fromEvent, map, Subscription } from 'rxjs';
import { Vector2 } from 'three';
import type Renderer from '../lib/classes/Renderer';
import type { Cursor } from '../lib/classes/appModule/Cursor';

import { defaultMap } from '@blue-might/maps';
import { HumanPlayer } from '../lib/classes/player/Human';
import type MovableUnit from '../lib/classes/unit/Movable';

setupFonts();
const $props = defineProps<{
  config: AppConfig;
  rendererOptions?: RendererOptions;
}>();

const rendererEl = ref<InstanceType<typeof BmRenderer> | null>(null);

const rootEl = ref<HTMLElement>();
const dimension = ref<Vector2>();
const subscription = new Subscription();
const app = ref<App>();
const ready = ref(false);

const currentComponent = computed(() =>
  defineAsyncComponent(() => import('./app/Playground.vue'))
);

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
    if (app.value.modules.player) {
      await setupPlayer(app.value);
    }
    await app.value.enterMap(defaultMap);
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

const hasPlayer = ref(false);
async function setupPlayer(app: App) {
  const player = await app.modules.player.addPlayer(
    markRaw(
      new HumanPlayer({
        name: 'Player'
      })
    )
  );

  app.modules.map.observables.map$
    .pipe(
      map(map => map?.modules.units.getById<MovableUnit>('blue-might-1')),
      filter(Boolean)
    )
    .subscribe(vehicle => {
      player.modules.vehicle.setVehicle(vehicle);
    });

  hasPlayer.value = true;
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
