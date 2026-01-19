<template>
  <div class="bm-map">
    <div ref="mapEl" class="map">
      <canvas ref="canvasEl"> </canvas>
      <canvas ref="unitCanvasEl"> </canvas>
    </div>
    <div v-if="controls" class="controls">
      <bm-button @click="onClickMove(-2, 0)">←</bm-button>
      <bm-button @click="onClickMove(2, 0)">→</bm-button>
      <bm-button @click="onClickMove(0, -2)">↑</bm-button>
      <bm-button @click="onClickMove(0, 2)">↓</bm-button>
      <span class="spacer"></span>
      <bm-button @click="onClickZoom(0.1)">+</bm-button>
      <bm-button @click="onClickZoom(-0.1)">-</bm-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { EMPTY, of, Subscription, switchMap } from 'rxjs';
import { Color, Vector2, Vector3 } from 'three';

import type App from '../lib/classes/App';
import type Map from '../lib/classes/Map';
import type Player from '../lib/classes/Player';
import type Unit from '../lib/classes/Unit';

import BmButton from './Button.vue';

const $props = defineProps<{
  app: App;
  scale?: number;
  origin?: Vector2;
  controls?: boolean;
}>();

const mapEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const unitCanvasEl = ref<HTMLCanvasElement | null>(null);

const subscription = new Subscription();
const map = ref<Map>();
const mapDimension = ref<Vector2>(new Vector2(0, 0));

const playerPosition = ref<Vector3>(new Vector3());
const localPosition = ref<Vector2>(new Vector2());
const localScale = ref<number>($props.scale ?? 3.0);
const currentPlayer = ref<Player>();

let units: Unit[] = [];

watchEffect(() => {
  const _scale = localScale.value;
  const _pos = localPosition.value;

  if (!map.value) return;

  updateFrameState();
  renderBackground();
});

onMounted(() => {
  const map$ = $props.app.modules.map.observables.map$.pipe(
    switchMap(map => (map ? of(map) : EMPTY))
  );

  const position$ = $props.app.modules.player.observables.currentPlayer$.pipe(
    switchMap(player => player.modules.vehicle.observables.unit$ ?? EMPTY),
    switchMap(unit => (unit ? unit.observables.position$ : EMPTY))
  );

  subscription.add(
    $props.app.modules.map.observables.map$
      .pipe(
        switchMap(map => (map ? map.modules.units.observables.addUnit$ : EMPTY))
      )
      .subscribe(() => {
        units = $props.app.modules.map.getMap()?.modules.units.getUnits() ?? [];
      })
  );

  subscription.add(
    $props.app.modules.player.observables.currentPlayer$.subscribe(player => {
      currentPlayer.value = player;
    })
  );
  subscription.add(
    map$.subscribe(m => {
      const { backgroundTexture } = m.textures;
      map.value = m;
      units = m.modules.units.getUnits();
      mapDimension.value = new Vector2(
        backgroundTexture!.image.width,
        backgroundTexture!.image.height
      );

      mapSize = new Vector2(mapDimension.value.x, mapDimension.value.y);
      scaledMapSize = new Vector2(
        mapSize.x / localScale.value,
        mapSize.y / localScale.value
      );
      renderBackground();
    })
  );
  subscription.add(
    position$.subscribe(position => {
      playerPosition.value.copy(position);
    })
  );

  loop();
});

let mapSize: Vector2;
let scaledMapSize: Vector2 = new Vector2();
let pan: Vector2 = new Vector2();

let animationFrameId: number;
onUnmounted(() => {
  subscription.unsubscribe();
  cancelAnimationFrame(animationFrameId);
});

const dimension = new Vector2(
  mapEl.value?.clientWidth || 0,
  mapEl.value?.clientHeight || 0
);
function loop() {
  dimension.set(mapEl.value?.clientWidth || 0, mapEl.value?.clientHeight || 0);
  updateFrameState();
  renderUnits();
  animationFrameId = requestAnimationFrame(loop);
}
function updateFrameState() {
  if (!mapSize) return;
  scaledMapSize.set(mapSize.x / localScale.value, mapSize.y / localScale.value);

  const playerPos = new Vector2(playerPosition.value.x, playerPosition.value.z);
  const centeredPlayer = playerPos.clone().add(mapSize.clone().divideScalar(2));

  const viewCenter = centeredPlayer.clone().add(localPosition.value);
  pan = viewCenter.clone().sub(scaledMapSize.clone().divideScalar(2));
  pan.x = Math.max(0, Math.min(mapSize.x - scaledMapSize.x, pan.x));
  pan.y = Math.max(0, Math.min(mapSize.y - scaledMapSize.y, pan.y));
}

function renderBackground() {
  const canvas = canvasEl.value;
  if (!canvas || !map.value) return;

  const { backgroundTexture, foregroundTexture } = map.value.textures;

  if (!backgroundTexture || !foregroundTexture) return;

  canvas.width = dimension.x;
  canvas.height = dimension.y;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = false;

  const backgroundTextureScale = backgroundTexture.image.width / mapSize.x;
  ctx.drawImage(
    backgroundTexture.image,
    pan.x * backgroundTextureScale,
    pan.y * backgroundTextureScale,
    scaledMapSize.x * backgroundTextureScale,
    scaledMapSize.y * backgroundTextureScale,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.globalAlpha = 0.2;
  const foregroundTextureScale = foregroundTexture.image.width / mapSize.x;
  ctx.drawImage(
    foregroundTexture.image,
    pan.x * foregroundTextureScale,
    pan.y * foregroundTextureScale,
    scaledMapSize.x * foregroundTextureScale,
    scaledMapSize.y * foregroundTextureScale,
    0,
    0,
    canvas.width,
    canvas.height
  );
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = 'color';

  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'source-over';
}

let indicatorInterval = 0;
function renderUnits() {
  const canvas = unitCanvasEl.value;
  if (!canvas || !map.value) return;

  if (canvas.width !== dimension.x || canvas.height !== dimension.y) {
    canvas.width = dimension.x;
    canvas.height = dimension.y;
  }

  indicatorInterval += 0.01;
  if (indicatorInterval > 1) {
    indicatorInterval = 0;
  }

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  units.forEach(unit => {
    if (
      unit.modules.damage.isDestroyed() ||
      currentPlayer.value?.modules.vehicle.getUnit() === unit
    ) {
      return;
    }
    const pos = unit.getPosition();
    const faction = unit.modules.faction.getFaction();
    drawIndicator(ctx, new Vector2(pos.x, pos.z), {
      color: faction.mapColor,
      pan,
      scaledMapSize,
      dimension
    });
  });

  const playerPos = new Vector2(playerPosition.value.x, playerPosition.value.z);
  drawIndicator(ctx, playerPos, {
    color: `rgb(${[
      Math.round(255 * indicatorInterval),
      Math.round(255 * indicatorInterval),
      Math.round(255 * indicatorInterval)
    ].join(',')})`,
    pan,
    scaledMapSize,
    dimension
  });
}

function drawIndicator(
  ctx: CanvasRenderingContext2D,
  position: Vector2,
  {
    color,
    pan,
    scaledMapSize,
    dimension
  }: {
    color: Color | number | string;
    pan: Vector2;
    scaledMapSize: Vector2;
    dimension: Vector2;
  }
) {
  const centered = position
    .clone()
    .add(mapDimension.value.clone().divideScalar(2));
  const p = centered.sub(pan).divide(scaledMapSize).multiply(dimension);

  let colorString = 'gray';
  if (typeof color === 'object') {
    colorString = `#${color.getHexString()}`;
  } else if (typeof color === 'number') {
    colorString = `#${new Color(color).getHexString()}`;
  } else if (typeof color === 'string') {
    colorString = color;
  }

  const size = 4;
  ctx.fillStyle = colorString;
  ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
}

function onClickMove(dx: number, dy: number) {
  if (!map.value) return;

  const newX = localPosition.value.x + dx;
  const newY = localPosition.value.y + dy;

  const mapSizeX = mapDimension.value.x;
  const mapSizeY = mapDimension.value.y;

  scaledMapSize = new Vector2(
    mapSize.x / localScale.value,
    mapSize.y / localScale.value
  );

  const centeredPlayerX = playerPosition.value.x + mapSizeX / 2;
  const centeredPlayerZ = playerPosition.value.z + mapSizeY / 2;

  const minLocalX = scaledMapSize.x / 2 - centeredPlayerX;
  const maxLocalX = mapSizeX - scaledMapSize.x / 2 - centeredPlayerX;
  const minLocalY = scaledMapSize.y / 2 - centeredPlayerZ;
  const maxLocalY = mapSizeY - scaledMapSize.y / 2 - centeredPlayerZ;

  localPosition.value.x = Math.max(minLocalX, Math.min(maxLocalX, newX));
  localPosition.value.y = Math.max(minLocalY, Math.min(maxLocalY, newY));
}

function onClickZoom(delta: number) {
  if (!map.value) return;

  const newScale = localScale.value + delta;
  localScale.value = Math.max(1, newScale);

  localPosition.value.x *= 0.9;
  localPosition.value.y *= 0.9;

  onClickMove(0, 0);
}
</script>

<style lang="postcss" scoped>
.bm-map {
  position: relative;

  .map {
    position: relative;
    display: block;
    width: 164px;
    background-color: var(--bm-color-background);

    &::before {
      display: block;
      padding-top: calc(1 * 100%);
      content: '';
    }

    & canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
  }

  & .controls {
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    width: 100%;

    & .spacer {
      flex-grow: 1;
    }
  }
}
</style>
