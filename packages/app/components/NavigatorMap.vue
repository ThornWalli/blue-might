<template>
  <div class="bm-navigator-map">
    <div class="map-container">
      <div ref="mapEl" class="map">
        <canvas ref="canvasEl"> </canvas>
        <canvas ref="unitCanvasEl"> </canvas>
      </div>
    </div>
    <div v-if="controls" class="controls">
      <bm-button
        mode="icon"
        class="button-focus"
        label="Focus Player"
        hide-label
        :icon="icons[ICON.MAP_PIN]"
        @click="onClickFocusPlayer()" />
      <bm-button
        class="button-left"
        mode="icon"
        label="←"
        hide-label
        :icon="icons[ICON.ARROW_LEFT]"
        :disabled="pan.x >= minMax.x"
        @click="onClickMove(0.1, 0)" />
      <bm-button
        class="button-right"
        mode="icon"
        label="→"
        hide-label
        :icon="icons[ICON.ARROW_RIGHT]"
        :disabled="pan.x <= -minMax.x"
        @click="onClickMove(-0.1, 0)" />
      <bm-button
        class="button-up"
        mode="icon"
        label="↑"
        hide-label
        :icon="icons[ICON.ARROW_UP]"
        :disabled="localPosition.y >= minMax.y"
        @click="onClickMove(0, 0.1)" />
      <bm-button
        class="button-down"
        mode="icon"
        label="↓"
        hide-label
        :icon="icons[ICON.ARROW_DOWN]"
        :disabled="localPosition.y <= -minMax.y"
        @click="onClickMove(0, -0.1)" />
      <span class="spacer"></span>
      <bm-button
        mode="icon"
        hide-label
        :disabled="localScale >= maxLocalScale"
        :icon="icons[ICON.PLUS]"
        @click="onClickZoom(true)" />
      <bm-button
        mode="icon"
        hide-label
        :disabled="localScale < maxLocalScale && localScale <= 1"
        :icon="icons[ICON.MINUS]"
        @click="onClickZoom(false)" />
    </div>
    <pre v-if="debugData" class="debug">{{ debugData }}</pre>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';
import { EMPTY, merge, of, Subscription, switchMap } from 'rxjs';
import { Color, Vector2, Vector3 } from 'three';

import type Map from '../lib/classes/Map';
import type Player from '../lib/classes/Player';
import type Unit from '../lib/classes/Unit';
import type { App } from '../lib/types';
import icons, { ICON } from '../utils/icons';
import { isPlant } from '../lib/utils/unit';

import BmButton from './Button.vue';

const $props = defineProps<{
  app: App;
  scale?: number;
  center?: Vector2;
  controls?: boolean;
  debug?: boolean;
}>();

const subscription = new Subscription();

const mapEl = ref<HTMLDivElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const unitCanvasEl = ref<HTMLCanvasElement | null>(null);

const map = ref<Map>();
const currentPlayer = ref<Player>();

/**
 * Gibt an, ob die Karte auf den Spieler zentriert ist oder ob der Spieler manuell verschoben hat.
 */
const playerCentered = ref(true);

// positions
const playerPosition = ref<Vector3>(new Vector3());
const localPosition = ref<Vector2>(new Vector2());
const pan = ref<Vector2>(new Vector2());

// scale
const scaleFactor = ref<number>($props.scale ?? 0.1);
const defaultScale = ref<number>(1);
const localScale = ref<number>($props.scale ?? 3);
const minMapSize = 4;

// sizes
const mapDimension = ref<Vector2>(new Vector2(0, 0));
const mapSize = ref<Vector2>(new Vector2());
const scaledMapSize = ref<Vector2>(new Vector2());

let units: Unit[] = [];

const destroyed = ref(false);

watchEffect(() => {
  const _scale = localScale.value;
  const _pos = localPosition.value;

  if (!map.value) return;

  updateFrameState();
  renderBackground();
});

type Format = 'landscape' | 'portrait' | 'square';

const ratio = computed(() => {
  const x = mapDimension.value.x;
  const y = mapDimension.value.y;
  const r = x / y;
  if (orientation.value === 'landscape') {
    return new Vector2((y * r) / y, y / y);
  } else if (orientation.value === 'portrait') {
    return new Vector2(x / x, x / r / x);
  } else {
    return new Vector2(1, 1);
  }
});

const ratioRotate = computed(() => {
  return new Vector2(ratio.value.y, ratio.value.x);
});

const orientation = computed<Format>(() => {
  if (!mapDimension.value) return 'square';
  if (mapDimension.value.x === mapDimension.value.y) return 'square';
  return mapDimension.value.x >= mapDimension.value.y
    ? 'landscape'
    : 'portrait';
});

const minMax = computed(() => {
  return ratio.value
    .clone()
    .multiplyScalar(localScale.value)
    .subScalar(1)
    .divide(ratio.value)
    .divideScalar(2)
    .multiplyScalar(1 / localScale.value);
});

const maxLocalScale = computed(() => {
  return Math.max(mapDimension.value.x, mapDimension.value.y) / minMapSize;
});

const localScaleProgress = computed(() => {
  return (localScale.value - 1) / (maxLocalScale.value - 1);
});

const debugData = computed(() => {
  if (!$props.debug) return null;
  return {
    ratio: ratio.value,
    ratioRotate: ratioRotate.value,
    mapSize,
    mapDimension,
    scaledMapSize,
    localScaleProgress,
    orientation,
    defaultScale,
    localScale,
    maxLocalScale: maxLocalScale.value,
    scaleFactor,
    localPosition: localPosition.value.toArray(),
    pan: pan.value.toArray(),
    minMax: minMax.value.toArray()
  };
});

//#region general

onMounted(() => {
  const map$ = $props.app.modules.map.observables.map$.pipe(
    switchMap(map => (map ? of(map) : EMPTY))
  );

  const app = $props.app;

  if ('player' in app.modules) {
    const position$ = app.modules.player.observables.currentPlayer$.pipe(
      switchMap(player => player.modules.vehicle.observables.unit$ ?? EMPTY),
      switchMap(unit => (unit ? unit.observables.position$ : EMPTY))
    );
    subscription.add(
      position$.subscribe(position => {
        playerPosition.value.copy(position);
      })
    );
    subscription.add(
      app.modules.player.observables.currentPlayer$.subscribe(player => {
        currentPlayer.value = player;
      })
    );
  }

  subscription.add(
    map$
      .pipe(
        switchMap(map =>
          merge(
            map.modules.units.observables.addUnit$,
            map.modules.units.observables.removeUnit$
          )
        )
      )
      .subscribe(() => {
        units = $props.app.modules.map.getMap()?.modules.units.getUnits() ?? [];
      })
  );

  subscription.add(
    map$.subscribe(m => {
      const { backgroundTexture } = m.modules.surface.getTextures();
      map.value = m;
      units = m.modules.units.getUnits();
      mapDimension.value = new Vector2(
        backgroundTexture!.image.width,
        backgroundTexture!.image.height
      );

      // define default scale from minMapSize
      defaultScale.value =
        Math.min(mapDimension.value.x, mapDimension.value.y) / minMapSize;
      localScale.value = defaultScale.value;

      mapSize.value = new Vector2(mapDimension.value.x, mapDimension.value.y);
      scaledMapSize.value = new Vector2(
        mapSize.value.x / localScale.value,
        mapSize.value.y / localScale.value
      );

      renderBackground();
    })
  );

  loop();
});

let animationFrameId: number;
onUnmounted(() => {
  subscription.unsubscribe();
  cancelAnimationFrame(animationFrameId);
});

//#endregion

const dimension = new Vector2(
  mapEl.value?.clientWidth || 0,
  mapEl.value?.clientHeight || 0
);
function loop() {
  if (destroyed.value) return;
  dimension.set(mapEl.value?.clientWidth || 0, mapEl.value?.clientHeight || 0);
  // updateFrameState();
  renderUnits();
  animationFrameId = requestAnimationFrame(loop);
}

function updateFrameState() {
  if (!mapSize.value) return;
  scaledMapSize.value.copy(mapSize.value).divideScalar(localScale.value);

  if (playerCentered.value) {
    centerPlayer();
  } else {
    pan.value = localPosition.value;
  }
}

function centerPlayer() {
  const playerPos = new Vector2(playerPosition.value.x, playerPosition.value.z);
  localPosition.value = clamp(
    playerPos.clone().divide(mapSize.value).multiplyScalar(-1)
  );
  pan.value = localPosition.value;
}

function clamp(position: Vector2) {
  return new Vector2(
    Math.max(-minMax.value.x, Math.min(minMax.value.x, position.x)),
    Math.max(-minMax.value.y, Math.min(minMax.value.y, position.y))
  );
}

function renderBackground() {
  const canvas = canvasEl.value;
  if (!canvas || !map.value) return;

  const { backgroundTexture, heightMap, foregroundTexture } =
    map.value.modules.surface.getTextures();

  if (!backgroundTexture || !foregroundTexture) return;

  canvas.width = dimension.x;
  canvas.height = dimension.y;

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

    const dimension = new Vector2(layer.image.width, layer.image.height);
    if (orientation.value === 'landscape') {
      // landscape;
      const scale = canvas.height / dimension.y;
      dimension.setX(dimension.x * scale);
      dimension.setY(dimension.y * scale);
    } else if (orientation.value === 'portrait') {
      // portrait;
      const scale = canvas.width / dimension.x;
      dimension.setX(dimension.x * scale);
      dimension.setY(dimension.y * scale);
    } else {
      dimension.multiplyScalar(canvas.width / dimension.x);
    }

    const position = new Vector2(0, 0);
    position
      .sub(dimension.clone().divideScalar(2).multiplyScalar(localScale.value))
      .add(new Vector2(canvas.width / 2, canvas.height / 2))
      .add(
        pan.value
          .clone()
          .multiply(dimension.clone().multiplyScalar(localScale.value))
      );

    ctx.drawImage(
      layer.image,
      0,
      0,
      layer.image.width,
      layer.image.height,
      position.x,
      position.y,
      dimension.x * localScale.value,
      dimension.y * localScale.value
    );
  });

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
    const visible =
      (localScaleProgress.value >= 0.1 && isPlant(unit)) || !isPlant(unit);

    if (
      !visible ||
      unit.modules.damage.isDestroyed() ||
      currentPlayer.value?.modules.vehicle.getCurrentUnit() === unit
    ) {
      return;
    }
    const pos = unit.getPosition();
    const faction = unit.modules.faction.getFaction();
    drawIndicator(ctx, new Vector2(pos.x, pos.z), {
      color: faction?.mapColor ?? 'gray'
    });
  });

  const playerPos = new Vector2(playerPosition.value.x, playerPosition.value.z);
  drawIndicator(ctx, playerPos, {
    color: `rgb(${[
      Math.round(255 * indicatorInterval),
      Math.round(255 * indicatorInterval),
      Math.round(255 * indicatorInterval)
    ].join(',')})`
  });
}

function drawIndicator(
  ctx: CanvasRenderingContext2D,
  position: Vector2,
  {
    color
  }: {
    color: Color | number | string;
  }
) {
  const canvas = canvasEl.value!;
  const dimension = new Vector2(
    canvas.offsetWidth,
    canvas.offsetHeight
  ).multiply(ratio.value);

  const dimension_ = new Vector2(canvas.offsetWidth, canvas.offsetHeight)
    .clone()
    .divide(ratioRotate.value);

  const targetPosition = mapSize.value
    .clone()
    .divideScalar(2)
    .divide(mapSize.value);

  targetPosition.add(
    dimension_.clone().divideScalar(2).multiply(ratioRotate.value)
  );

  targetPosition.add(
    position.clone().divide(scaledMapSize.value).multiply(dimension.clone())
  );

  const t = pan.value
    .clone()
    .multiply(dimension.clone().multiplyScalar(localScale.value));

  targetPosition.add(t);

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
  ctx.fillRect(
    targetPosition.x - size / 2,
    targetPosition.y - size / 2,
    size,
    size
  );
}

function onClickMove(dx: number, dy: number) {
  if (!map.value) return;

  playerCentered.value = false;

  const newX = localPosition.value.x + dx / localScale.value;
  const newY = localPosition.value.y + dy / localScale.value;

  localPosition.value = clamp(new Vector2(newX, newY));
}

function onClickZoom(zoomIn: boolean) {
  if (!map.value) return;

  const factor = zoomIn ? -scaleFactor.value : scaleFactor.value;

  const newScale = localScale.value * (1 - factor);
  localScale.value = Math.max(1, Math.min(maxLocalScale.value, newScale));

  if (playerCentered.value) {
    centerPlayer();
  } else {
    onClickMove(0, 0);
  }
}

function onClickFocusPlayer() {
  if (!map.value) return;

  localScale.value = defaultScale.value;

  playerCentered.value = true;

  centerPlayer();
}
</script>

<style lang="postcss" scoped>
.bm-navigator-map {
  position: relative;

  & .map-container {
    position: relative;
  }

  & .map {
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
    inset: 0;

    & .button-focus {
      position: absolute;
      top: 0;
      right: 0;
    }

    & .button-left {
      position: absolute;
      bottom: 0;
      left: 0;
    }

    & .button-right {
      position: absolute;
      right: 0;
      bottom: 0;
    }

    & .button-up {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
    }

    & .button-down {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
    }
  }
}

pre.debug {
  padding: 0;
  margin: 10px 0;
  font-size: 10px;
}
</style>
