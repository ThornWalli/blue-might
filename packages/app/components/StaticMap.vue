<template>
  <div
    class="bm-static-map"
    :style="{
      '--ratio': ratio
    }">
    <div class="map-container">
      <div ref="mapEl" class="map">
        <canvas ref="canvasEl"> </canvas>
        <canvas ref="unitCanvasEl"> </canvas>
      </div>
    </div>
    <pre v-if="debugData" class="debug">{{ debugData }}</pre>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { filter, Subscription } from 'rxjs';
import { Vector2 } from 'three';

import type { App } from '../lib/types';
import type Map from '../lib/classes/Map';

const $props = defineProps<{
  app: App;
  debug?: boolean;
}>();

const debugData = computed(() => {
  if (!$props.debug) return null;
  return {};
});

const subscription = new Subscription();

const dimension = ref<Vector2>(new Vector2());
const mapDimension = ref<Vector2>(new Vector2());
const map = ref<Map | null>(null);
const mapEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const unitCanvasEl = ref<HTMLCanvasElement | null>(null);

const ratio = computed(() => {
  return mapDimension.value.y / mapDimension.value.x;
});

onMounted(() => {
  const map$ = $props.app.modules.map.observables.map$.pipe(filter(Boolean));

  subscription.add(
    map$.subscribe(m => {
      const { backgroundTexture } = m.modules.surface.getTextures();

      map.value = m;
      mapDimension.value = new Vector2(
        backgroundTexture!.image.width,
        backgroundTexture!.image.height
      );

      dimension.value.set(
        mapEl.value?.clientWidth || 0,
        mapEl.value?.clientHeight || 0
      );
      renderBackground();
    })
  );
});

const orientation = computed<'landscape' | 'portrait' | 'square'>(() => {
  if (!mapDimension.value) return 'square';
  if (mapDimension.value.x === mapDimension.value.y) return 'square';
  return mapDimension.value.x >= mapDimension.value.y
    ? 'landscape'
    : 'portrait';
});

function renderBackground() {
  const canvas = canvasEl.value;
  if (!canvas || !map.value) return;

  const { backgroundTexture, heightMap, foregroundTexture } =
    map.value.modules.surface.getTextures();

  if (!backgroundTexture || !foregroundTexture) return;

  canvas.width = dimension.value.x;
  canvas.height = dimension.value.y;

  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = false;

  const layerDescriptions: {
    image: ImageBitmap;
    globalCompositeOperation: GlobalCompositeOperation;
    globalAlpha: number;
  }[] = [
    {
      image: backgroundTexture.image,
      globalCompositeOperation: 'source-over',
      globalAlpha: 1
    },
    {
      image: heightMap.image,
      globalCompositeOperation: 'multiply',
      globalAlpha: 1
    },
    {
      image: foregroundTexture.image,
      globalCompositeOperation: 'source-over',
      globalAlpha: 0.2
    }
  ];
  layerDescriptions.forEach(layer => {
    ctx.globalCompositeOperation = layer.globalCompositeOperation;
    ctx.globalAlpha = layer.globalAlpha;

    const position = new Vector2(0, 0);
    const localDimension = new Vector2(layer.image.width, layer.image.height);
    if (orientation.value === 'landscape') {
      // landscape;
      const scale = canvas.width / localDimension.x;
      localDimension.setX(localDimension.x * scale);
      localDimension.setY(localDimension.y * scale);

      position.setY((canvas.height - localDimension.y) / 2);
    } else if (orientation.value === 'portrait') {
      // portrait;
      const scale = canvas.width / localDimension.x;
      localDimension.setX(localDimension.x * scale);
      localDimension.setY(localDimension.y * scale);
    } else {
      localDimension.multiplyScalar(canvas.width / localDimension.x);
    }

    console.log('rendering layer', layer, localDimension);
    ctx.drawImage(
      layer.image,
      0,
      0,
      layer.image.width,
      layer.image.height,
      position.x,
      position.y,
      localDimension.x,
      localDimension.y
    );
  });

  ctx.globalAlpha = 1;
}

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<style lang="postcss" scoped>
.bm-static-map {
  position: relative;

  & .map-container {
    position: relative;
  }

  & .map {
    position: relative;
    display: block;
    width: 100%;

    /* background-color: var(--bm-color-background); */
    background: #111;

    &::before {
      display: block;
      padding-top: 100%;
      content: '';
    }

    & canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
  }
}

pre.debug {
  padding: 0;
  margin: 10px 0;
  font-size: 10px;
}
</style>
