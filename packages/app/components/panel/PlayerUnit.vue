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
                    groundHeight.toFixed(2).padStart(padLength, '\u00A0')
                  " />
                <bm-control-item
                  indicator
                  label="Max.Alti."
                  :indicator-status="CONTROL_ITEM_STATUS.NORMAL"
                  :value="
                    MAX_AIR_VEHICLE_ALTITUDE.toFixed(2).padStart(
                      padLength,
                      '\u00A0'
                    )
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
        <div v-if="weaponSlots.length > 0">
          <bm-details label="Weapons" open>
            <div class="grid-row">
              <bm-control-item
                button
                indicator
                label="Auto AIM"
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
                  onClickWeaponAutopilot($event, { aim: !weaponAutopilot.aim })
                " />

              <bm-control-item
                button
                indicator
                label="Auto Shoot"
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
            </div>
            <bm-control-item
              v-for="(slot, index) in weaponSlots"
              :key="index"
              button
              indicator
              :indicator-status="
                slot.active
                  ? slot.ammunition / slot.maxAmmunition < 0.5
                    ? slot.ammunition <= 0
                      ? CONTROL_ITEM_STATUS.DANGER
                      : CONTROL_ITEM_STATUS.WARNING
                    : CONTROL_ITEM_STATUS.NORMAL
                  : CONTROL_ITEM_STATUS.INACTIVE
              "
              :label="
                slot.weapon.projectile.shortName ?? `Weapon #${index + 1}`
              "
              :value="
                slot.ammunition === Infinity && slot.ammunition === Infinity
                  ? `x`.padStart(padLength, '\u00A0')
                  : `${slot.ammunition}/${slot.maxAmmunition}`
                      .toString()
                      .padStart(padLength, '\u00A0')
              "
              @click="onClickWeaponSlot($event, slot)">
              <template #after-indicator>
                <img
                  v-if="slot.thumb"
                  :src="slot.thumb"
                  :alt="
                    slot.weapon.projectile.shortName ?? `Weapon #${index + 1}`
                  " />
              </template>
            </bm-control-item>
            <bm-control-item
              v-if="weaponSlots.length === 1"
              label="(none)"
              :value="'-'.padStart(padLength, '\u00A0')" />
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
  </bm-panel>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import AirVehicleUnit from '@blue-might/app/lib/classes/unit/vehicle/AirVehicle';
import WeaponUnitModule, {
  type WeaponAutopilotOptions
} from '@blue-might/app/lib/classes/unitModule/Weapon';
import { DAMAGE_LEVEL } from '@blue-might/app/lib/classes/unitModule/Damage';
import { MAX_AIR_VEHICLE_ALTITUDE } from '@blue-might/app/lib/classes/unitModule/movable/AirVehicle';
import usePlayerUnitInterface, {
  type TransportSlotInfoSlot
} from '@blue-might/app/composables/usePlayerUnitInterface';
import type { App } from '@blue-might/app/lib/types';
import { FLIGHT_STATUS } from '@blue-might/app/lib/classes/unitModule/movable/airVehicle/Helicopter';
import type { WeaponSlot } from '@blue-might/app/lib/classes/WeaponSlot';

import BmControlItem, { CONTROL_ITEM_STATUS } from '../element/ControlItem.vue';
import BmPanel from '../Panel.vue';
import BmDetails from '../Details.vue';
import BmAttitudeIndicator from '../AttitudeIndicator.vue';
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
  groundHeight,
  playerLifes,
  transportSlotInfo,
  flightStatus
} = usePlayerUnitInterface($props.app);

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
  const weaponModule = vehicle
    .getCurrentUnit()!
    .getModuleByType(WeaponUnitModule);

  if (weaponModule) {
    weaponModule.setAutopilot(weaponAutopilot.value);
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

const weaponModule = computed(() => {
  const vehicle = player.value?.modules.vehicle;
  if (!vehicle) return;
  return vehicle.getCurrentUnit()!.getModuleByType(WeaponUnitModule);
});

function onClickWeaponSlot(e: Event, slot: { thumb: string } & WeaponSlot) {
  blur(e);
  weaponModule.value?.setSlot(slot);
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
        width: 300px;
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
