<template>
  <bm-panel
    v-if="unit && ready"
    class="bm-panel-player-unit"
    :title="panelTitle">
    <div>
      <div
        class="power"
        :class="{ ready: powerInfo.currentPower > powerInfo.minPower }"
        :style="{
          '--value': powerInfo.currentPower / powerInfo.maxPower,
          '--min': powerInfo.minPower / powerInfo.maxPower,
          '--idle': powerInfo.idlePower / powerInfo.maxPower
        }">
        <div class="value"></div>
        <div class="helper-min"></div>
        <div class="helper-idle"></div>
      </div>
      <div
        class="speed"
        :style="{
          '--tilt-x': tilt.x,
          '--tilt-z': tilt.z,
          '--max-tilt-x': maxTilt.x,
          '--max-tilt-z': maxTilt.z,
          '--value': powerInfo.currentPower / powerInfo.maxPower,
          '--min': powerInfo.minPower / powerInfo.maxPower,
          '--idle': powerInfo.idlePower / powerInfo.maxPower
        }">
        <div class="value"></div>
        <div class="helper-min"></div>
        <div class="helper-idle"></div>
      </div>

      <div :key="unit.key" class="preview">
        <div>
          <bm-object-preview-unit
            v-if="previewOptions"
            :app="app"
            :ratio="1"
            :size="null"
            :model-value="previewOptions" />
        </div>
        <base-button
          class="gears"
          :class="{ active: gearsActive, opened: gearsOpened }"
          @click="onClickGears">
          Gears
        </base-button>
      </div>
      <div
        class="damage"
        :class="{
          demolished: unitDamageValue >= 1,
          damaged: unitDamageValue >= 0.5
        }"
        :style="{
          '--value': 1 - unitDamageValue
        }">
        <div></div>
      </div>
    </div>
    <bm-button :disabled="!isVehicle" @click="onClickUnitActive">
      {{ unitActive ? 'Vehicle Off' : 'Vehicle On' }}
    </bm-button>
    <bm-button
      :icon="unitFocused ? ICON.UNLOCKED : ICON.LOCKED"
      @click="onClickFocusUnit">
      {{ unitFocused ? 'Unlock' : 'Lock' }}
    </bm-button>
    <p>
      <strong>Height:</strong> {{ seaLevelDiff.toFixed(2) }} m /
      {{ (minGroundHeight ?? 0).toFixed(2) }} m (<span
        :style="{
          color: heightDiff! > 0 ? 'green' : 'red'
        }">
        {{ heightDiff.toFixed(2) }}
      </span>
      m)<br />
      {{ status }}
    </p>
  </bm-panel>
</template>

<script lang="ts" setup>
import type Unit from '../../lib/classes/Unit';
import BmObjectPreviewUnit from '../objectPreview/Unit.vue';
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import type App from '../../lib/classes/App';
import {
  combineLatest,
  EMPTY,
  filter,
  map,
  of,
  Subscription,
  switchMap,
  timer
} from 'rxjs';
import { Vector3 } from 'three';
import { ICON } from '@blue-might/app/utils/icons';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import type { FLIGHT_STATUS } from '@blue-might/app/lib/classes/unitModule/movable/Helicopter';
import HelicopterUnit from '@blue-might/app/lib/classes/unit/vehicle/Helicopter';
import type { PowerInfo } from '@blue-might/app/lib/classes/unitModule/Movable';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import BaseButton from '../base/Button.vue';

import HelicopterUnitModule from '@blue-might/app/lib/classes/unitModule/movable/Helicopter';
import VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';

const $props = defineProps<{
  app: App;
}>();

const unitDamageValue = ref<number>(0);
const tilt = ref<Vector3>(new Vector3(0, 0, 0));
const maxTilt = ref<Vector3>(new Vector3(0, 0, 0));
const gearsActive = ref(false);
const gearsOpened = ref(false);
const unit = ref<Raw<Unit> | null>(null);
const unitFocused = ref<Raw<Unit> | null>(null);

const player = computed(() =>
  unit.value?.getModuleByType(PlayerUnitModule)?.getPlayer()
);
const panelTitle = computed(
  () => player.value?.name || unit.value?.name || 'n/a'
);

const minGroundHeight = computed(
  () =>
    position.value &&
    $props.app.modules.map
      .getMap()
      .modules.ground.getSurfaceHeightAt(
        position.value.x,
        position.value.z,
        [unit.value].filter(Boolean) as Unit[]
      )
);
const seaLevelDiff = computed(() => {
  if (position.value) {
    return position.value.y;
  }
  return 0;
});
const heightDiff = computed(() => {
  if (position.value && minGroundHeight.value != null) {
    return position.value.y - minGroundHeight.value;
  }
  return 0;
});

const isVehicle = computed(() => {
  return unit.value instanceof VehicleUnit;
});

const ready = ref(false);
const subscription = new Subscription();
const position = ref<Vector3 | null>(null);
const status = ref<FLIGHT_STATUS | null>(null);
const powerInfo = ref<PowerInfo>({
  flightPower: 0,
  currentPower: 0,
  maxPower: 0,
  minPower: 0,
  idlePower: 0
});
const unitActive = ref<boolean>(false);

async function setup() {
  const app = $props.app;

  const vehicle$ = app.modules.player.observables.currentPlayer$.pipe(
    switchMap(player => player.modules.vehicle.observables.vehicle$)
  );

  const vehicleModule$ = vehicle$.pipe(
    filter(({ current }) => current?.hasModuleType(MovableUnitModule) ?? false),
    switchMap(
      ({ current }) =>
        of(current?.getModuleByType<MovableUnitModule>(MovableUnitModule)) ??
        EMPTY
    ),
    filter(Boolean)
  );

  const helicopterModule$ = vehicle$.pipe(
    filter(({ current }) => current instanceof HelicopterUnit),
    switchMap(
      ({ current }) =>
        of(current?.getModuleByType(HelicopterUnitModule)) ?? EMPTY
    ),
    filter(Boolean)
  );

  subscription.add(
    vehicle$.subscribe(({ current }) => {
      unit.value = current ? markRaw(current) : null;
    })
  );

  subscription.add(
    vehicle$
      .pipe(switchMap(({ current }) => current?.observables.position$ ?? EMPTY))
      .subscribe(p => {
        position.value = p.clone();
      })
  );

  subscription.add(
    vehicleModule$
      .pipe(switchMap(({ observables }) => observables.active$))
      .subscribe(v => {
        unitActive.value = v;
      })
  );

  subscription.add(
    helicopterModule$
      .pipe(switchMap(({ observables }) => observables.flightStatus$ ?? EMPTY))
      .subscribe(s => {
        status.value = s;
      })
  );
  subscription.add(
    helicopterModule$
      .pipe(
        switchMap(({ observables }) =>
          combineLatest([observables.gearsActive$, observables.gearsOpened$])
        )
      )
      .subscribe(([active, opened]) => {
        gearsActive.value = active;
        gearsOpened.value = opened;
      })
  );

  subscription.add(
    vehicleModule$
      .pipe(switchMap(({ observables }) => observables.powerInfo$))
      .subscribe(v => {
        powerInfo.value = v;
      })
  );

  subscription.add(
    app.modules.unitFocus.observables.followedUnit$.subscribe(focusedUnit => {
      unitFocused.value = focusedUnit;
    })
  );

  subscription.add(
    helicopterModule$
      .pipe(
        switchMap(helicopterModule =>
          timer(0, 100).pipe(map(() => helicopterModule))
        )
      )
      .subscribe(helicopterModule => {
        tilt.value
          .copy(helicopterModule.getTilt())
          .multiplyScalar(100)
          .round()
          .divideScalar(100);
        maxTilt.value.set(
          helicopterModule.getMaxPitch(),
          0,
          helicopterModule.getMaxRoll()
        );
      })
  );

  subscription.add(
    vehicle$
      .pipe(
        switchMap(
          ({ current }) => current?.modules.damage.observables.damage$ ?? EMPTY
        )
      )
      .subscribe(v => {
        unitDamageValue.value = v;
      })
  );

  ready.value = true;
}

onMounted(() => {
  setup();
});

onUnmounted(() => {
  subscription.unsubscribe();
});

const previewOptions = computed(() => {
  if (!unit.value) return null;
  return {
    type: unit.value.key,
    faction: unit.value.modules.faction.getFaction(),
    action: 'idle'
  };
});

function onClickUnitActive(e: Event) {
  (e.target as HTMLButtonElement).blur();
  const vehicle = player.value?.modules.vehicle;
  if (!vehicle) return;
  const vehicleModule = vehicle
    .getVehicle()!
    .getModuleByType(MovableUnitModule);

  if (vehicleModule.isTurnOn()) {
    vehicleModule.turnOff();
  } else {
    vehicleModule.turnOn();
  }
}

function onClickFocusUnit() {
  const app = $props.app;
  if (unitFocused.value) {
    app.modules.unitFocus.unfocus();
  } else {
    app.modules.unitFocus.followFocus(unit.value!);
  }
}

function onClickGears() {
  const vehicleUnit = player.value?.modules.vehicle.getVehicle();
  if (!(vehicleUnit instanceof HelicopterUnit)) return;

  const helicopterModule = vehicleUnit.modules.vehicle;
  if (!helicopterModule) return;

  helicopterModule.toggleGears();
}
</script>

<style lang="postcss" scoped>
.bm-panel-player-unit {
  & .preview {
    position: relative;
    width: 128px;
    padding: var(--bm-spacing-medium) var(--bm-spacing-large);
    background-color: #000;

    & > div:first-child {
      position: relative;

      &::before {
        display: block;
        width: 100%;
        padding-top: calc(100% * 1);
        content: '';
      }

      & > * {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
      }
    }
  }

  p {
    font-size: 12px;

    & span {
      font-weight: bold;
    }
  }

  & .actions {
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: center;
  }

  & .power {
    position: relative;
    width: 16px;
    background: #111;

    & .helper-min,
    & .helper-idle {
      position: absolute;
      top: calc(100% - (50% + (-50% + var(--min) * 100%)));
      left: 0;
      width: 100%;
      border-top: solid 2px white;
      transform: translateY(-50%);
    }

    & .helper-idle {
      top: calc(100% - (50% + (-50% + var(--idle) * 100%)));
      border-top-style: dashed;
      opacity: 0.4;
    }

    & .value {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(var(--value) * 100%);
      background: red;
    }

    &.ready {
      & .value {
        background: green;
      }
    }
  }

  & .speed {
    position: relative;
    width: 16px;
    background: #111;

    & .value {
      --abs-tilt-x: max(var(--tilt-x), calc(var(--tilt-x) * -1));
      --abs-tilt-z: max(var(--tilt-z), calc(var(--tilt-z) * -1));

      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(
        max(
            var(--abs-tilt-x) / var(--max-tilt-x),
            var(--abs-tilt-z) / var(--max-tilt-z)
          ) *
          100%
      );
      height: var(--test);
      background: green;
    }
  }

  & .gears {
    position: absolute;
    top: 0;
    left: 0;
    padding: 1px 4px;
    font-size: 11px;
    font-weight: bold;
    color: var(--color-gray-mid);
    text-transform: uppercase;

    &.opened {
      color: var(--color-black);
      background-color: red;
    }

    &.active {
      color: var(--color-black);
      background-color: yellow;
    }
  }

  & .damage {
    position: relative;
    width: 16px;
    background-color: red;

    &.damaged {
      & div {
        background-color: yellow;
      }
    }

    & div {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(100% * var(--value));
      background-color: green;
    }
  }
}

:deep(.content) {
  & > div:first-child {
    display: flex;
    gap: var(--bm-spacing-small);
  }
}
</style>
