<template>
  <bm-panel
    v-if="unit && ready"
    class="bm-panel-player-unit"
    :title="panelTitle">
    <div>
      <!-- fuel -->
      <div
        v-if="fuelInfo"
        class="graph fuel"
        :class="{ warning: hasFuelWarning }"
        :style="{
          '--value': fuelInfo.fuel / fuelInfo.fuelMax,
          '--min': fuelWarningMinValue
        }">
        <div class="label" title="Fuel">F</div>
        <div>
          <div class="value"></div>
          <div class="min"></div>
        </div>
      </div>
      <!-- ammunition -->
      <div
        v-for="(slot, index) in weaponSlots"
        :key="index"
        class="graph ammunition"
        :class="{ active: slot.active }"
        :style="{
          '--value': slot.ammunition / slot.maxAmmunition
        }">
        <div class="label" title="Ammunition">{{ `A-${index + 1}` }}</div>
        <div>
          <div class="value"></div>
        </div>
      </div>

      <!-- altitude -->
      <div
        class="graph altitude"
        :class="{
          'has-min': heightValue >= seaLevel,
          ready: powerInfo.currentPower > powerInfo.minPower
        }"
        :style="{
          '--value': heightValue / MAX_AIR_VEHICLE_ALTITUDE,
          '--min': seaLevel / MAX_AIR_VEHICLE_ALTITUDE
        }">
        <div class="label" title="Altitude">A</div>
        <div>
          <div class="value"></div>
          <div class="min"></div>
        </div>
      </div>
      <!-- power -->
      <div
        class="graph power"
        :class="{ ready: powerInfo.currentPower > powerInfo.minPower }"
        :style="{
          '--value': powerInfo.currentPower / powerInfo.maxPower,
          '--min': powerInfo.minPower / powerInfo.maxPower,
          '--idle': powerInfo.idlePower / powerInfo.maxPower
        }">
        <div class="label">P</div>
        <div>
          <div class="value"></div>
          <div class="min"></div>
          <div class="idle"></div>
        </div>
      </div>
      <!-- speed -->
      <div
        class="graph speed"
        :style="{
          '--value': unitSpeed
        }">
        <div class="label">S</div>
        <div>
          <div class="value"></div>
          <div class="min"></div>
        </div>
      </div>
      <div>
        <div class="compass">{{ compassValue }}</div>
        <div :key="unit.key" class="preview">
          <div class="preview-inner">
            <bm-object-preview-unit
              v-if="previewOptions"
              :app="app"
              :ratio="1"
              :size="null"
              :model-value="previewOptions" />
          </div>
          <base-button
            v-if="unitGears.has"
            :disabled="isDestroyed"
            class="gears-button"
            :class="{ active: unitGears.active, opened: unitGears.opened }"
            @click="onClickGears">
            Gears
          </base-button>
          <div v-if="isDestroyed" class="warning destroyed">
            <span>Destroyed!</span>
          </div>
          <div v-else-if="hasFuelWarning" class="warning fuel">
            <span>WARNING: Low Fuel!</span>
          </div>
        </div>
      </div>

      <!-- damage -->
      <div
        class="graph damage"
        :class="{
          destroyed: isDestroyed,
          damaged: unitDamage.value >= DAMAGE_LEVEL.DAMAGED / 2
        }"
        :style="{
          '--value': 1 - unitDamage.value
        }">
        <div class="label">D</div>
        <div>
          <div></div>
        </div>
      </div>
    </div>

    <div class="controls">
      <bm-button
        :class="{ active: autoAimActive }"
        :disabled="!isVehicle"
        @click="onClickAimActive">
        AIM
      </bm-button>
      <bm-button
        :class="{ active: unitActive }"
        :disabled="!isVehicle"
        @click="onClickUnitActive">
        Power
      </bm-button>
    </div>
    <bm-button
      :icon="unitFocused ? ICON.UNLOCKED : ICON.LOCKED"
      @click="onClickFocusUnit">
      {{ unitFocused ? 'Unlock' : 'Lock' }}
    </bm-button>
  </bm-panel>
</template>

<script lang="ts" setup>
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import {
  combineLatest,
  concatMap,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  of,
  Subscription,
  switchMap,
  timer
} from 'rxjs';
import { Euler, MathUtils, Vector3 } from 'three';
import { ICON } from '@blue-might/app/utils/icons';
import PlayerUnitModule from '@blue-might/app/lib/classes/unitModule/Player';
import type { FLIGHT_STATUS } from '@blue-might/app/lib/classes/unitModule/movable/airVehicle/Helicopter';
import type { PowerInfo } from '@blue-might/app/lib/classes/unitModule/Movable';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import HelicopterUnitModule from '@blue-might/app/lib/classes/unitModule/movable/airVehicle/Helicopter';
import VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';
import AirVehicleUnit from '@blue-might/app/lib/classes/unit/AirVehicle';
import WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import { DAMAGE_LEVEL } from '@blue-might/app/lib/classes/unitModule/Damage';
import { MAX_AIR_VEHICLE_ALTITUDE } from '@blue-might/app/lib/classes/unitModule/movable/AirVehicle';
import type { WeaponSlot } from '@blue-might/app/lib/classes/WeaponSlot';

import BaseButton from '../base/Button.vue';
import type App from '../../lib/classes/App';
import BmButton from '../Button.vue';
import BmPanel from '../Panel.vue';
import BmObjectPreviewUnit from '../objectPreview/Unit.vue';
import type Unit from '../../lib/classes/Unit';

const $props = defineProps<{
  app: App;
}>();

const unitDamage = ref<{
  value: number;
  level: number;
}>({
  value: 0,
  level: 0
});
const isDestroyed = computed(
  () => unitDamage.value.value >= DAMAGE_LEVEL.DESTROYED / 2
);

const unitGears = ref<{
  has: boolean;
  active: boolean;
  opened: boolean;
}>({
  has: false,
  active: false,
  opened: false
});

const unitSpeed = ref<string>('0');
const unitRotation = ref<Euler>(new Euler(0, 0, 0));

const tilt = ref<Vector3>(new Vector3(0, 0, 0));
const maxTilt = ref<Vector3>(new Vector3(0, 0, 0));

const unit = ref<Raw<Unit> | null>(null);
const unitFocused = ref<Raw<Unit> | null>(null);

const player = computed(() =>
  unit.value?.getModuleByType(PlayerUnitModule)?.getPlayer()
);
const panelTitle = computed(
  () => player.value?.name || unit.value?.name || 'n/a'
);

const compassValue = computed(() => {
  const deg =
    (-MathUtils.radToDeg(-Math.PI / 2 + unitRotation.value.y) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return 'N';
  if (deg < 67.5) return 'NE';
  if (deg < 112.5) return 'E';
  if (deg < 157.5) return 'SE';
  if (deg < 202.5) return 'S';
  if (deg < 247.5) return 'SW';
  if (deg < 292.5) return 'W';
  return 'NW';
});

const seaLevel = computed(() =>
  $props.app.modules.map.getMap().modules.ground.getSeaLevel()
);
const heightValue = computed(() => {
  return seaLevel.value + ((position.value?.y ?? 0) - seaLevel.value);
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
const autoAimActive = ref<boolean>(false);
const unitActive = ref<boolean>(false);

const fuelWarningMinValue = ref<number>(0.4);
const hasFuelWarning = computed(() => {
  if (!fuelInfo.value) return false;
  return (
    fuelInfo.value.fuel / fuelInfo.value.fuelMax <= fuelWarningMinValue.value
  );
});
const fuelInfo = ref<{
  fuel: number;
  fuelMax: number;
}>();
const weaponSlots = ref<WeaponSlot[]>([]);

async function setup() {
  const app = $props.app;

  const vehicle$ = app.modules.player.observables.currentPlayer$.pipe(
    switchMap(player => player.modules.vehicle.observables.vehicle$),
    map(({ current }) => current)
  );

  const followedUnit$ = app.modules.unitFocus.observables.followedUnit$;

  const vehicleModule$ = vehicle$.pipe(
    filter(vehicle => vehicle?.hasModuleType(MovableUnitModule) ?? false),
    switchMap(
      vehicle =>
        of(vehicle?.getModuleByType<MovableUnitModule>(MovableUnitModule)) ??
        EMPTY
    ),
    filter(Boolean)
  );
  const weaponModule$ = vehicle$.pipe(
    filter(vehicle => vehicle?.hasModuleType(WeaponUnitModule) ?? false),
    switchMap(
      vehicle => of(vehicle?.getModuleByType(WeaponUnitModule)) ?? EMPTY
    ),
    filter(Boolean)
  );

  const helicopterModule$ = vehicle$.pipe(
    map(vehicle => vehicle?.getModuleByType(HelicopterUnitModule))
  );

  //#region unit

  subscription.add(
    followedUnit$.subscribe(focusedUnit => (unitFocused.value = focusedUnit))
  );

  //#endregion

  //#region vehicle

  subscription.add(
    vehicle$
      .pipe(
        map(
          vehicle =>
            vehicle?.getModuleByType(WeaponUnitModule)?.getSlots() ?? []
        )
      )
      .subscribe(slots => (weaponSlots.value = slots))
  );
  subscription.add(
    vehicle$
      .pipe(
        switchMap(vehicle => {
          const movableModule = vehicle?.getModuleByType(MovableUnitModule);
          return (
            movableModule?.observables.fuel$.pipe(
              distinctUntilChanged(),
              map(fuel => ({
                fuel: fuel ?? 0,
                fuelMax: movableModule?.getMaxFuel() ?? 0
              }))
            ) ?? EMPTY
          );
        })
      )
      .subscribe(info => (fuelInfo.value = info))
  );

  subscription.add(
    vehicle$.subscribe(
      vehicle => (unit.value = vehicle ? markRaw(vehicle) : null)
    )
  );

  subscription.add(
    vehicle$
      .pipe(switchMap(vehicle => vehicle?.observables.position$ ?? EMPTY))
      .subscribe(p => (position.value = p.clone()))
  );

  subscription.add(
    vehicleModule$
      .pipe(switchMap(({ observables }) => observables.active$))
      .subscribe(v => (unitActive.value = v))
  );

  //#endregion

  //#region weapon

  subscription.add(
    weaponModule$
      .pipe(
        switchMap(weaponModule =>
          weaponModule.observables.shoot$.pipe(
            map(() => weaponModule.getSlots())
          )
        )
      )
      .subscribe(slots => (weaponSlots.value = slots))
  );

  subscription.add(
    weaponModule$
      .pipe(switchMap(({ observables }) => observables.autoAimActive$))
      .subscribe(v => (autoAimActive.value = v))
  );

  subscription.add(
    vehicleModule$
      .pipe(switchMap(({ observables }) => observables.powerInfo$))
      .subscribe(v => (powerInfo.value = v))
  );

  subscription.add(
    vehicleModule$
      .pipe(
        switchMap(vehicleModule => timer(0, 100).pipe(map(() => vehicleModule)))
      )
      .subscribe(
        vehicleModule =>
          (unitSpeed.value = Math.min(
            vehicleModule.state.velocity.length(),
            1
          ).toFixed(2))
      )
  );
  subscription.add(
    vehicle$
      .pipe(
        switchMap(vehicle =>
          vehicle
            ? timer(0, 100).pipe(concatMap(() => vehicle.observables.rotation$))
            : EMPTY
        )
      )
      .subscribe(rotation => (unitRotation.value = rotation))
  );

  subscription.add(
    vehicle$
      .pipe(
        switchMap(
          vehicle =>
            vehicle?.modules.damage.observables.damage$.pipe(
              map(() => ({
                value: vehicle?.modules.damage.getDamageValue(),
                level: vehicle?.modules.damage.getDamageLevel()
              }))
            ) ?? EMPTY
        )
      )
      .subscribe(value => (unitDamage.value = value))
  );

  //#endregion

  //#region helicopter

  subscription.add(
    helicopterModule$
      .pipe(
        filter(Boolean),
        switchMap(({ observables }) => observables.flightStatus$ ?? EMPTY)
      )
      .subscribe(s => (status.value = s))
  );
  subscription.add(
    helicopterModule$
      .pipe(
        switchMap(module => {
          if (!module) {
            unitGears.value = {
              has: false,
              active: false,
              opened: false
            };
            return EMPTY;
          }
          return combineLatest([
            module.observables.gearsActive$,
            module.observables.gearsOpened$
          ]);
        })
      )
      .subscribe(
        ([active, opened]) =>
          (unitGears.value = {
            has: true,
            active,
            opened
          })
      )
  );

  subscription.add(
    helicopterModule$
      .pipe(
        filter(Boolean),
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

  //#endregion

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

function onClickAimActive(e: Event) {
  (e.target as HTMLButtonElement).blur();
  autoAimActive.value = !autoAimActive.value;
  const vehicle = player.value?.modules.vehicle;
  if (!vehicle) return;
  const gunModule = vehicle.getVehicle()!.getModuleByType(WeaponUnitModule);

  if (gunModule) {
    gunModule.setAutoAimActive(autoAimActive.value);
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
  const vehicleUnit =
    player.value?.modules.vehicle.getVehicle() as AirVehicleUnit;
  if (!(vehicleUnit instanceof AirVehicleUnit)) return;

  const airVehicleModule = vehicleUnit.modules.airVehicle;
  if (!airVehicleModule) return;

  airVehicleModule.toggleGears();
}
</script>

<style lang="postcss" scoped>
.bm-panel-player-unit {
  & .graph {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 16px;

    & .label {
      display: flex;
      align-items: center;
      justify-content: center;
      padding-bottom: 4px;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
    }

    & .label + div {
      position: relative;
      flex: 1;
      background: #222;
    }
  }

  & .fuel {
    & .value {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(var(--value) * 100%);
      background: green;
    }

    &.warning {
      & .value {
        background: red;
      }
    }

    & .min {
      position: absolute;
      top: calc(100% - (50% + (-50% + var(--min) * 100%)));
      left: 0;
      width: 100%;
      border-top: dashed 2px white;
      opacity: 0.4;
      transform: translateY(-50%);
    }
  }

  & .ammunition {
    & .value {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(var(--value) * 100%);
      background: green;
    }

    opacity: 0.4;

    &.active {
      opacity: 1;
    }
  }

  & .preview {
    position: relative;
    width: 128px;
    padding: var(--bm-spacing-medium) var(--bm-spacing-large);
    background-color: #000;

    & > .preview-inner {
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

  & .altitude {
    & .min {
      position: absolute;
      top: calc(100% - (50% + (-50% + var(--min) * 100%)));
      left: 0;
      width: 100%;
      border-top: dashed 2px white;
      opacity: 0.4;
      transform: translateY(-50%);
    }

    & .value {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(var(--value) * 100%);
      background: red;
    }

    &.has-min {
      & .value {
        background: green;
      }
    }
  }

  & .power {
    & .min,
    & .idle {
      position: absolute;
      top: calc(100% - (50% + (-50% + var(--min) * 100%)));
      left: 0;
      width: 100%;
      border-top: solid 2px white;
      transform: translateY(-50%);
    }

    & .idle {
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
    & .value {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: calc(var(--value) * 100%);
      background: green;
      transition: height 0.2s linear;
    }

    &.ready {
      & .value {
        background: green;
      }
    }

    /* position: relative;
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
    } */
  }

  & .gears-button {
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

    &[disabled] {
      opacity: 0.4;
    }
  }

  & .damage {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 16px;

    --color: green;

    &.damaged {
      --color: yellow;
    }

    &.destroyed {
      --color: red;
    }

    & .label + div {
      position: relative;
      flex: 1;

      & > div {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: calc(100% * var(--value));
        background-color: var(--color);
      }
    }
  }
}

:deep(.content) {
  & > div:first-child {
    display: flex;
    gap: var(--bm-spacing-small);
  }
}

.controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);

  & > * {
    opacity: 0.6;
    transition: opacity var(--bm-easing-duration-short) var(--bm-easing-base);

    &.active {
      opacity: 1;
    }
  }
}

.compass {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
}

.warning {
  position: absolute;
  bottom: 0;
  left: 0;
  box-sizing: border-box;
  width: 100%;
  font-size: 10px;

  /* font-family: var(--font-bit-font); */
  font-weight: bold;

  & span {
    padding: var(--bm-spacing-small) var(--bm-spacing-medium);
    line-height: 1;
    color: black;
    background: #f00;
  }

  text-align: center;
  text-transform: uppercase;

  &.fuel {
    animation: blink 1s infinite steps(1);
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
</style>
