<template>
  <bm-panel
    v-if="unit"
    hide-title
    style-type="transparent"
    class="bm-panel-player-unit"
    :title="panelTitle">
    <div class="frames grid-row grid-row-start">
      <div class="secondary">
        <div v-if="isAirVehicle">
          <bm-details label="Air Control" :open="weaponSlots.length < 1">
            <div class="grid-row">
              <div class="grid-col grid-col-full grid-col-v">
                <div class="attitude-indicator">
                  <bm-attitude-indicator :app="app" />
                </div>
              </div>
              <div class="grid-col grid-col-vertical">
                <bm-control-item
                  indicator
                  label="Altitude"
                  :indicator-status="
                    currentHeight > seaHeight
                      ? CONTROL_ITEM_STATUS.NORMAL
                      : currentHeight < seaHeight
                        ? CONTROL_ITEM_STATUS.DANGER
                        : CONTROL_ITEM_STATUS.WARNING
                  "
                  :value="
                    currentHeight.toFixed(2).padStart(padLength, '\u00A0')
                  " />
                <bm-control-item
                  indicator
                  label="Min.Alti."
                  :indicator-status="CONTROL_ITEM_STATUS.NORMAL"
                  :value="
                    groundAltitude.toFixed(2).padStart(padLength, '\u00A0')
                  " />
                <bm-control-item
                  indicator
                  label="Max.Alti."
                  :indicator-status="CONTROL_ITEM_STATUS.NORMAL"
                  :value="
                    maxAltitude.toFixed(2).padStart(padLength, '\u00A0')
                  " />
                <bm-control-item
                  indicator
                  label="Status"
                  :indicator-status="
                    flightStatus === FLIGHT_STATUS.FLYING
                      ? CONTROL_ITEM_STATUS.NORMAL
                      : CONTROL_ITEM_STATUS.WARNING
                  "
                  :value="
                    (flightStatus ? flightStatus : 'Unknown').padStart(
                      padLength,
                      '\u00A0'
                    )
                  " />
              </div>
            </div>
          </bm-details>
        </div>
        <div v-if="weaponSlots.length > 0 && currentWeaponSlot">
          <bm-details label="Weapons" open>
            <div class="grid-row">
              <div class="grid-col grid-col-vertical-end grid-col-full">
                <bm-control-item
                  button
                  indicator
                  label="AIM"
                  hide-value
                  :value="
                    (weaponAutopilot.aim ? 'On' : 'Off').padStart(
                      padLength,
                      '\u00A0'
                    )
                  "
                  :indicator-status="
                    weaponAutopilot.aim
                      ? CONTROL_ITEM_STATUS.NORMAL
                      : CONTROL_ITEM_STATUS.INACTIVE
                  "
                  @click="
                    onClickWeaponAutopilot($event, {
                      aim: !weaponAutopilot.aim
                    })
                  " />
                <bm-control-item
                  button
                  indicator
                  label="Auto"
                  hide-value
                  :value="
                    (weaponAutopilot.shoot ? 'On' : 'Off').padStart(
                      padLength,
                      '\u00A0'
                    )
                  "
                  :indicator-status="
                    weaponAutopilot.shoot
                      ? CONTROL_ITEM_STATUS.NORMAL
                      : CONTROL_ITEM_STATUS.INACTIVE
                  "
                  @click="
                    onClickWeaponAutopilot($event, {
                      shoot: !weaponAutopilot.shoot
                    })
                  " />
                <bm-control-item
                  button
                  indicator
                  label="Helper"
                  hide-value
                  :value="
                    (projectileHelper ? 'On' : 'Off').padStart(
                      padLength,
                      '\u00A0'
                    )
                  "
                  :indicator-status="
                    projectileHelper
                      ? CONTROL_ITEM_STATUS.NORMAL
                      : CONTROL_ITEM_STATUS.INACTIVE
                  "
                  @click="onClickProjectileHelper($event, !projectileHelper)" />

                <bm-control-item
                  indicator
                  :label="currentWeaponSlot.slot.weapon.name"
                  hide-label
                  :value="
                    currentWeaponSlot.slot.ammunition === Infinity &&
                    currentWeaponSlot.slot.ammunition === Infinity
                      ? `x`.padStart(6, '\u00A0')
                      : `${currentWeaponSlot.slot.ammunition}`
                          .toString()
                          .padStart(7, '\u00A0')
                  "
                  :indicator-status="
                    currentWeaponSlot.slot.ammunition /
                      currentWeaponSlot.slot.maxAmmunition <
                    0.5
                      ? currentWeaponSlot.slot.ammunition <= 0
                        ? CONTROL_ITEM_STATUS.DANGER
                        : CONTROL_ITEM_STATUS.WARNING
                      : CONTROL_ITEM_STATUS.NORMAL
                  " />
              </div>
              <div class="current-weapon">
                <div
                  class="name"
                  :title="
                    currentWeaponSlot.slot.weapon.projectile.shortName ?? ''
                  ">
                  <span>
                    {{ currentWeaponSlot.slot.weapon.projectile.shortName }}
                  </span>
                </div>
                <div class="thumb">
                  <img
                    :src="currentWeaponSlot.thumb"
                    :alt="`Weapon Thumb`"
                    :title="
                      currentWeaponSlot.slot.weapon.projectile.shortName ?? ''
                    " />
                  <bm-button
                    label="Change Weapon"
                    mode="icon"
                    :icon="ICON.ARROW_PATH_ROUNDED_SQUARE"
                    hide-label
                    @click="onClickChangeWeapon" />
                </div>
              </div>
            </div>
          </bm-details>
        </div>
      </div>
      <div class="primary">
        <bm-details label="General" open>
          <bm-control-item
            label="Compass"
            :value="compassValue.toString().padStart(padLength, '\u00A0')" />

          <bm-control-item
            indicator
            label="Lives"
            :indicator-status="
              playerLifes > 1
                ? CONTROL_ITEM_STATUS.NORMAL
                : CONTROL_ITEM_STATUS.DANGER
            "
            :value="playerLifes.toString().padStart(padLength, '\u00A0')">
            <template #indicator>
              <svg-icon-heart class="heart" />
            </template>
          </bm-control-item>
          <bm-control-item
            indicator
            label="Damage"
            :indicator-status="
              unitDamage.level >= DAMAGE_LEVEL.DESTROYED
                ? CONTROL_ITEM_STATUS.DANGER
                : unitDamage.level >= DAMAGE_LEVEL.DAMAGED
                  ? CONTROL_ITEM_STATUS.WARNING
                  : CONTROL_ITEM_STATUS.NORMAL
            "
            :value="
              Math.round(unitDamage.value * 100)
                .toString()
                .padStart(padLength - 1, '\u00A0') + '%'
            " />

          <bm-control-item
            button
            :disabled="!isVehicle"
            indicator
            label="Power"
            :indicator-status="
              unitActive
                ? powerInfo.currentPower >= powerInfo.idlePower
                  ? powerInfo.currentPower >= powerInfo.minPower
                    ? CONTROL_ITEM_STATUS.NORMAL
                    : CONTROL_ITEM_STATUS.WARNING
                  : CONTROL_ITEM_STATUS.DANGER
                : CONTROL_ITEM_STATUS.INACTIVE
            "
            :value="
              Math.floor((powerInfo.currentPower / powerInfo.maxPower) * 100)
                .toString()
                .padStart(padLength - 1, '\u00A0') + '%'
            "
            @click="onClickUnitActive" />

          <bm-control-item
            indicator
            label="Fuel"
            :indicator-status="
              fuelInfo.fuel <= 0
                ? CONTROL_ITEM_STATUS.DANGER
                : hasFuelWarning
                  ? CONTROL_ITEM_STATUS.WARNING
                  : CONTROL_ITEM_STATUS.NORMAL
            "
            :value="
              `${Math.floor(fuelInfo.fuel)}/${Math.floor(fuelInfo.fuelMax)}`
                .toString()
                .padStart(padLength, '\u00A0')
            " />

          <bm-control-item
            v-if="unitGears.has"
            :button="unitGears.canUse"
            indicator
            label="Gears"
            :indicator-status="
              unitGears.active
                ? CONTROL_ITEM_STATUS.WARNING
                : unitGears.opened
                  ? CONTROL_ITEM_STATUS.NORMAL
                  : CONTROL_ITEM_STATUS.DANGER
            "
            :value="
              (unitGears.active
                ? 'Opening'
                : unitGears.opened
                  ? 'Opened'
                  : 'Closed'
              ).padStart(padLength, '\u00A0')
            "
            @click="onClickGears" />

          <bm-button
            v-if="canCustomize"
            label="Customize Unit"
            @click="onClickCustomizeUnit" />
        </bm-details>
        <div v-if="hasTransport && transportSlotInfo.slots.length">
          <bm-details label="Transport" open>
            <bm-control-item
              v-for="item in transportSlotInfo.slots"
              :key="item.key"
              button
              indicator
              :value="item.name.padStart(10, '\u00A0')"
              label="Unload"
              :label-pad="6"
              @click="onClickUnload(item)">
              <template #indicator>
                <img v-if="item.thumb" :src="item.thumb" :alt="item.name" />
              </template>
            </bm-control-item>
          </bm-details>
        </div>
      </div>
    </div>
    <teleport to="body">
      <bm-dialog ref="customizeUnitDialog">
        <template #header>Customize Unit</template>
        <template #default>
          <bm-dialog-customize-unit :app="$props.app" :unit="unit" />
        </template>
      </bm-dialog>
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import AirVehicleUnit from '@blue-might/app/lib/classes/unit/vehicle/AirVehicle';
import type { WeaponAutopilotOptions } from '@blue-might/app/lib/classes/unitModule/Weapon';
import { DAMAGE_LEVEL } from '@blue-might/app/lib/classes/unitModule/Damage';
import usePlayerUnitInterface, {
  type TransportSlotInfoSlot
} from '@blue-might/app/composables/usePlayerUnitInterface';
import type { App } from '@blue-might/app/lib/types';
import { FLIGHT_STATUS } from '@blue-might/app/lib/classes/unitModule/movable/airVehicle/Helicopter';
import { ICON } from '@blue-might/app/utils/icons';

import BmControlItem, { CONTROL_ITEM_STATUS } from '../element/ControlItem.vue';
import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';
import BmAttitudeIndicator from '../AttitudeIndicator.vue';
import BmDialogCustomizeUnit from '../dialog/CustomizeUnit.vue';
import BmDialog from '../Dialog.vue';
import SvgIconHeart from '../../assets/icons/heart.svg?component';

const padLength = 10;

const $props = defineProps<{
  app: App;
}>();

const {
  unit,
  unitDamage,
  unitGears,
  compassValue,
  powerInfo,
  weaponAutopilot,
  unitActive,
  weaponSlots,
  fuelInfo,
  isVehicle,
  isAirVehicle,
  hasFuelWarning,
  currentHeight,
  seaHeight,
  groundAltitude,
  maxAltitude,
  playerLifes,
  transportSlotInfo,
  flightStatus,
  projectileHelper,
  canCustomize,
  weaponModule
} = usePlayerUnitInterface($props.app);

const currentWeaponSlot = computed(() =>
  weaponSlots.value.find(({ slot }) => slot.active)
);

const customizeUnitDialog = ref<InstanceType<typeof BmDialog> | null>(null);

const hasTransport = computed(() => {
  if (!unit.value) return false;
  return 'transport' in unit.value.modules;
});

const player = computed(() => unit.value?.modules.player?.getPlayer());
const panelTitle = computed(
  () => player.value?.name || unit.value?.name || 'n/a'
);

//#region events
function onClickUnitActive(e: Event) {
  blur(e);
  const vehicle = player.value?.modules.vehicle;
  if (!vehicle) return;
  const currentUnit = vehicle.getCurrentUnit();
  if (currentUnit && 'movable' in currentUnit.modules) {
    const movableModule = currentUnit.modules.movable;
    if (movableModule.isTurnOn()) {
      movableModule.turnOff();
    } else {
      movableModule.turnOn();
    }
  }
}
function blur(e: Event) {
  ((e.target as HTMLElement)?.closest('button') as HTMLButtonElement).blur();
}

function onClickChangeWeapon(e: Event) {
  blur(e);
  const vehicle = player.value?.modules.vehicle;
  if (!vehicle) return;
  if (weaponModule.value) {
    weaponModule.value.switchSlot();
  }
}

function onClickWeaponAutopilot(
  e: Event,
  options: Partial<WeaponAutopilotOptions>
) {
  blur(e);
  weaponAutopilot.value = {
    ...weaponAutopilot.value,
    ...options
  };
  const vehicle = player.value?.modules.vehicle;
  if (!vehicle) return;
  if (weaponModule.value) {
    weaponModule.value.setAutopilot(weaponAutopilot.value);
  }
}

function onClickProjectileHelper(e: Event, value: boolean) {
  blur(e);
  projectileHelper.value = value;
  if (weaponModule.value) {
    weaponModule.value.setProjectileHelper(projectileHelper.value);
  }
}

function onClickGears(e: Event) {
  blur(e);
  const vehicleUnit =
    player.value?.modules.vehicle.getCurrentUnit() as AirVehicleUnit;
  if (!(vehicleUnit instanceof AirVehicleUnit)) return;

  const airVehicleModule = vehicleUnit.modules.airVehicle;
  if (!airVehicleModule) return;

  airVehicleModule.toggleGears();
}

async function onClickUnload(item: TransportSlotInfoSlot) {
  if (unit.value && 'transport' in unit.value.modules) {
    await unit.value.modules.transport.unloadById(item.id);
  }
}

function onClickCustomizeUnit() {
  customizeUnitDialog.value?.context?.open();
}
//#endregion
</script>

<style lang="postcss" scoped>
.bm-panel-player-unit {
  color: white;
  pointer-events: none;

  & :deep(.content) {
    align-items: flex-end;
  }

  & .frames {
    display: flex;
    gap: var(--bm-spacing-small);

    & > div {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--bm-spacing-small);
      padding: var(--bm-spacing-medium);
      pointer-events: auto;
      background: #000;

      &.primary {
        width: 220px;
      }

      &.secondary {
        /* width: 300px; */
      }

      & .bm-control-item {
        width: 100%;
      }
    }
  }

  & .info {
    box-sizing: border-box;
    padding: var(--bm-spacing-medium);
    pointer-events: auto;
    background: #000;

    & > div {
      display: flex;
      gap: var(--bm-spacing-small);
    }

    &.air {
      width: 100%;

      & > div {
        align-items: center;
        justify-content: flex-end;
        padding: var(--bm-spacing-medium) var(--bm-spacing-small);
        background: rgb(255 255 255 / 8%);

        & > * {
          flex: 1;
        }
      }
    }
  }

  & button {
    padding: 0;
    color: currentColor;
    appearance: none;
    background: none;
    border: none;
  }

  & .toggle {
    display: flex;
    gap: var(--bm-spacing-medium);
    align-items: center;
  }

  & .separator {
    border-top: solid white 2px;
  }
}

.bm-attitude-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.attitude-indicator {
  position: relative;
  width: 72px;

  &::before {
    display: block;
    padding-top: 100%;
    content: '';
  }
}

.heart {
  width: 12px;
  color: red;
}

.current-weapon {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 96px;

  &,
  & button {
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
  }

  & .name,
  & .value {
    box-sizing: border-box;
    padding: var(--bm-spacing-small);
    text-align: center;
  }

  & .name {
    width: 100%;

    & span {
      display: block;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  & .value {
    box-sizing: border-box;
    width: 100%;
    background: #333;
  }

  & .thumb {
    position: relative;
    width: 100%;
    padding-top: 100%;
    background: #333;

    & img {
      position: absolute;
      top: 50%;
      left: 50%;
      display: block;
      width: 80px;
      image-rendering: pixelated;

      --contour: #444;

      /* filter: drop-shadow(2px 0 0 var(--contour))
        drop-shadow(-2px 0 0 var(--contour)) drop-shadow(0 2px 0 var(--contour))
        drop-shadow(0 -2px 0 var(--contour)); */
      transform: translate(-50%, -50%);
    }

    & button {
      position: absolute;
      right: 0;
      bottom: 0;
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
</style>
