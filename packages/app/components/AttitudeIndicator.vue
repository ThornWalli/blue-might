<template>
  <div ref="rootEl" class="bm-attitude-indicator">
    <div
      :style="{
        ['--gap']: gap,
        ['--tilt-x']: tilt.x,
        ['--tilt-z']: tilt.z,
        ['--max-tilt-x']: Math.PI / 4, // maxTilt.x,
        ['--max-tilt-z']: Math.PI / 4 // maxTilt.z
      }">
      <div class="surface"></div>
      <div class="lines">
        <div
          v-for="(line, index) in lines"
          :key="index"
          :class="{ odd: index % 2 === 1 }"></div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { EMPTY, filter, map, Subscription, switchMap, timer } from 'rxjs';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Vector3 } from 'three';

import type App from '../lib/classes/App';
import { getAirVehicle } from '../lib/utils/unit';

const $props = defineProps<{
  app: App;
}>();

const rootEl = ref<HTMLElement | null>(null);

const lines = computed(() => {
  return Array(11).fill(0);
});

const gap = ref<number>(10);

const tilt = ref<Vector3>(new Vector3(0, 0, 0));
const maxTilt = ref<Vector3>(new Vector3(0, 0, 0));

const subscription = new Subscription();
const dimension = ref<[number, number]>([0, 0]);
onMounted(() => {
  dimension.value = rootEl.value
    ? [rootEl.value.offsetWidth, rootEl.value.offsetHeight]
    : [0, 0];

  gap.value = (dimension.value[1] / lines.value.length) * 2;

  subscription.add(
    $props.app.modules.player.observables.currentPlayer$
      .pipe(
        switchMap(player => player?.modules.vehicle.observables.unit$ || EMPTY),
        map(getAirVehicle),
        filter(Boolean),
        switchMap(unit => timer(0, 100).pipe(map(() => unit)))
      )
      .subscribe(vehicle => {
        const airModule = vehicle.modules.airVehicle;
        tilt.value
          .copy(airModule.getTilt())
          .multiplyScalar(100)
          .round()
          .divideScalar(100);
        maxTilt.value.set(airModule.getMaxPitch(), 0, airModule.getMaxRoll());
      })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<style lang="postcss" scoped>
.bm-attitude-indicator {
  --gap: 10;

  /* colors */
  --color-surface-top: #444;
  --color-surface-bottom: #222;

  position: relative;

  & .lines {
    position: absolute;
    top: calc(50% - calc((var(--tilt-x) / var(--max-tilt-x)) * 50%));
    left: 50%;
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) * 1px) 0;
    width: 100%;
    transform: translate(-50%, -50%)
      rotate(calc((var(--tilt-z) / var(--max-tilt-z)) * 45deg));
    transform-origin: center
      calc(50% + (var(--tilt-x) / var(--max-tilt-x)) * 25%);

    &::before {
      position: absolute;
      top: 0;
      left: 50%;
      width: 200%;
      height: 100%;
      content: '';
      background: linear-gradient(to bottom, #0072bb 50%, #8b4513 50%);
      transform: translateX(-50%);
    }

    & > div {
      position: relative;
      left: 35%;
      width: 30%;
      height: 1px;
      background: white;
      opacity: 0.4;

      &.odd {
        position: relative;
        left: 15%;
        width: 70%;
        opacity: 1;
      }
    }
  }

  &::before {
    display: block;
    padding-top: 100%;
    content: '';
  }

  & > div {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: solid 4px var(--color-gray-dark);
    border-radius: 50%;
  }
}
</style>
