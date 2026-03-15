<template>
  <transition name="fade-very-short">
    <div
      v-if="radarIndicators.length"
      ref="rootEl"
      class="bm-head-up-indicator">
      <base-sticky-wrapper
        v-for="indicator in radarIndicators"
        :key="indicator.id"
        :app="app"
        :camera="camera"
        :target="indicator.object"
        :dimension="dimension"
        class="indicator"
        :class="{
          [`${indicator.type}`]: true,
          'active-attack': indicator.activeAttack,
          'can-attack': indicator.canAttack
        }">
        <span class="arrow arrow-1"></span>
        <span class="arrow arrow-2"></span>
        <span class="arrow arrow-3"></span>
        <span class="distance">{{ indicator.distance.toFixed(2) }}</span>
      </base-sticky-wrapper>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { type Camera, Vector2, type Object3D } from 'three';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { EMPTY, map, Subscription, switchMap } from 'rxjs';

import type AppPlayground from '../lib/classes/app/AppPlayground';

import BaseStickyWrapper, { getStickyBox } from './base/StickyWrapper.vue';

const radarIndicators = ref<Indicator[]>([]);
const dimension = ref<Vector2>(
  new Vector2(window.innerWidth, window.innerHeight)
);
const rootEl = ref<HTMLDivElement | null>(null);

const $props = defineProps<{
  app: AppPlayground;
  camera?: Camera;
}>();

const subscription = new Subscription();
onMounted(() => {
  const unit$ = $props.app.modules.player.observables.currentPlayer$.pipe(
    switchMap(
      player => player?.modules.vehicle.observables.currentUnit$ ?? EMPTY
    )
  );

  subscription.add(
    unit$
      .pipe(
        switchMap(unit =>
          unit && 'radar' in unit.modules
            ? unit.modules.radar.observables.units$.pipe(
                map(units => ({ unit, units }))
              )
            : EMPTY
        )
      )
      .subscribe(({ unit, units }) => {
        const indicators: Indicator[] = [];
        const attackModule =
          'attack' in unit.modules ? unit.modules.attack : null;

        const missionTargets =
          $props.app.modules.map
            .getMap()
            ?.modules.mission.getMission()
            ?.getTargetIds() ?? [];

        const attackRadius = attackModule?.getAttackRadius() ?? 0;
        units.forEach(({ unit: u, distance }) => {
          const { width, height } = getStickyBox(
            $props.camera ?? $props.app.renderer.modules.camera.getCamera(),
            u.position,
            u.getSize(),
            new Vector2(
              $props.app.renderer.el.offsetWidth,
              $props.app.renderer.el.offsetHeight
            )
          );
          const size = new Vector2(width, height);
          const isEnemy = attackModule?.isAttackAllowed(u);
          const isMissionTarget = missionTargets.includes(u.id);
          if (isEnemy) {
            const canAttack = distance <= attackRadius;
            const currentTarget = attackModule?.isCurrentTarget(u) ?? false;
            indicators.push({
              id: u.id,
              type: HUD_INDICATOR_TYPE.ENEMY_TARGET,
              size,
              object: u.getRoot(),
              distance: distance,
              canAttack: canAttack,
              activeAttack: currentTarget
            });
          } else if (isMissionTarget) {
            indicators.push({
              id: u.id,
              type: HUD_INDICATOR_TYPE.MISSION_TARGET,
              size,
              object: u.getRoot(),
              distance: distance
            });
          } else {
            // indicators.push({
            //   id: u.id,
            //   type: HUD_INDICATOR_TYPE.FRIENDLY_TARGET,
            //   size,
            //   object: u.getRoot(),
            //   distance: distance
            // });
          }
        });

        radarIndicators.value = indicators;
      })
  );
});

watch(
  () => rootEl.value,
  v => {
    if (v) {
      dimension.value = new Vector2(v.offsetWidth, v.offsetHeight);
    }
  }
);

onUnmounted(() => {
  subscription.unsubscribe();
});
</script>

<script lang="ts">
export enum HUD_INDICATOR_TYPE {
  ENEMY_TARGET = 'enemy_target',
  FRIENDLY_TARGET = 'friendly_target',
  MISSION_TARGET = 'mission_target'
}

export interface Indicator {
  id: string;
  type: HUD_INDICATOR_TYPE;
  size: Vector2;
  // position: Vector3;
  object: Object3D;
  distance: number;
  canAttack?: boolean;
  activeAttack?: boolean;
}
</script>

<style lang="postcss" scoped>
.bm-head-up-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  --foreground: #fff;
  --background: transparent;

  & .distance {
    position: absolute;
    top: 100%;
    right: 0;
    padding: var(--bm-spacing-small);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    color: var(--foreground);
    white-space: nowrap;
    background-color: var(--background);
  }

  & .indicator {
    width: calc(var(--wrapper-size-x) * 1px);
    height: auto;

    /* pointer-events: auto; */
    border: dotted var(--background) 2px;

    &.empty {
      display: none;
    }

    &::before {
      display: block;
      padding-top: 100%;
      content: '';
    }

    /* stylelint-disable-next-line selector-class-pattern */
    &.mission_target {
      --background: orange;
    }

    /* stylelint-disable-next-line selector-class-pattern */
    &.enemy_target {
      --background: red;
    }

    /* stylelint-disable-next-line selector-class-pattern */
    &.friendly_target {
      --background: blue;
    }

    &.can-attack {
      border-style: solid;
      border-width: 4px;

      &.active-attack {
        border-color: transparent;

        & .arrow {
          display: block;
        }
      }

      /* &:not(.active) {
        &::after {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          content: '';
          border: solid var(--background) 4px;
          border-radius: 50%;
        }
      } */
    }
  }

  & .arrow {
    position: absolute;
    top: 50%;
    left: 50%;
    display: none;

    &::before {
      --size: 32px;
      --factor: calc(var(--wrapper-size-x) / 100);
      --top: calc(var(--factor) * calc(var(--size) * 2 * -1));

      position: relative;
      top: calc(var(--top) * 1.2);
      display: block;
      width: 0;
      height: 0;
      content: '';
      border-top: calc(var(--factor) * var(--size)) solid var(--background);
      border-right: calc(var(--factor) * var(--size) / 2) solid transparent;
      border-left: calc(var(--factor) * var(--size) / 2) solid transparent;
      animation: bounce 1s infinite;

      /* transform: translate(-50%, -50%); */
    }

    &.arrow-1 {
      transform: translate(-50%, -50%) rotate(calc(0 / 3 * 360deg));
    }

    &.arrow-2 {
      transform: translate(-50%, -50%) rotate(calc(1 / 3 * 360deg));
    }

    &.arrow-3 {
      transform: translate(-50%, -50%) rotate(calc(2 / 3 * 360deg));
    }
  }
}

@keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(calc(1 / 3 * 100%));
  }
}
</style>
