<template>
  <bm-panel
    v-if="unit"
    hide-title
    style-type="transparent"
    class="bm-panel-player-unit"
    :title="panelTitle">
    <div class="row row-start">
      <div class="info weapon">
        <div>
          <!-- weapons -->
          <fieldset v-if="weaponSlots.length > 0">
            <legend>Weapons</legend>
            <div>
              <bm-control-item
                v-for="(slot, index) in weaponSlots"
                :key="index"
                indicator
                :status="
                  slot.active
                    ? slot.ammunition / slot.maxAmmunition < 0.5
                      ? slot.ammunition <= 0
                        ? CONTROL_ITEM_STATUS.DANGER
                        : CONTROL_ITEM_STATUS.WARNING
                      : CONTROL_ITEM_STATUS.NORMAL
                    : CONTROL_ITEM_STATUS.INACTIVE
                "
                :label="`Weapon #${index + 1}`"
                :value="
                  `${slot.ammunition}/${slot.maxAmmunition}`
                    .toString()
                    .padStart(padLength, '\u00A0')
                " />
              <bm-control-item
                v-if="weaponSlots.length === 1"
                label="(none)"
                :value="'-'.padStart(padLength, '\u00A0')" />
            </div>
          </fieldset>
        </div>
      </div>
      <div class="col col-end col-full">
        <div class="info general">
          <div>
            <div class="row">
              <div class="col">
                <fieldset>
                  <legend>General</legend>
                  <bm-control-item
                    indicator
                    label="Damage"
                    :status="
                      unitDamage.level >= DAMAGE_LEVEL.DESTROYED
                        ? CONTROL_ITEM_STATUS.DANGER
                        : unitDamage.level >= DAMAGE_LEVEL.DAMAGED
                          ? CONTROL_ITEM_STATUS.WARNING
                          : CONTROL_ITEM_STATUS.NORMAL
                    "
                    :value="
                      unitDamage.value
                        .toString()
                        .padStart(padLength - 1, '\u00A0') + '%'
                    " />

                  <bm-control-item
                    button
                    :disabled="!isVehicle"
                    indicator
                    label="Power"
                    :status="
                      unitActive
                        ? powerInfo.currentPower >= powerInfo.idlePower
                          ? powerInfo.currentPower >= powerInfo.minPower
                            ? CONTROL_ITEM_STATUS.NORMAL
                            : CONTROL_ITEM_STATUS.WARNING
                          : CONTROL_ITEM_STATUS.DANGER
                        : CONTROL_ITEM_STATUS.INACTIVE
                    "
                    :value="
                      Math.floor(
                        (powerInfo.currentPower / powerInfo.maxPower) * 100
                      )
                        .toString()
                        .padStart(padLength - 1, '\u00A0') + '%'
                    "
                    @click="onClickUnitActive" />

                  <bm-control-item
                    indicator
                    label="Fuel"
                    :status="
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
                    button
                    indicator
                    label="Gears"
                    :status="
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
                  <bm-control-item
                    button
                    indicator
                    label="AIM"
                    :value="
                      (autoAimActive ? 'On' : 'Off').padStart(
                        padLength,
                        '\u00A0'
                      )
                    "
                    :status="
                      autoAimActive
                        ? CONTROL_ITEM_STATUS.NORMAL
                        : CONTROL_ITEM_STATUS.INACTIVE
                    "
                    @click="onClickAimActive" />
                </fieldset>
              </div>
              <div class="col">
                <div class="compass">{{ compassValue }}</div>
                <div class="preview">
                  <div class="preview-inner">
                    <bm-object-preview-unit
                      v-if="previewOptions"
                      :key="unit.key"
                      :type="unit.key"
                      :app="app"
                      :ratio="1"
                      :size="null"
                      :model-value="previewOptions" />
                  </div>
                  <div v-if="isDestroyed" class="warning destroyed">
                    <span>Destroyed!</span>
                  </div>
                  <div v-else-if="hasFuelWarning" class="warning fuel">
                    <span>WARNING: Low Fuel!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col col-full col-end">
          <div v-if="isAirVehicle" class="info air">
            <fieldset>
              <legend>Air Control</legend>
              <div class="col">
                <div class="col col-full col-v">
                  <bm-attitude-indicator :app="app" />
                </div>
                <div class="col col-v">
                  <bm-control-item
                    indicator
                    label="Altitude"
                    :status="
                      heightValue > seaLevel
                        ? CONTROL_ITEM_STATUS.NORMAL
                        : heightValue < seaLevel
                          ? CONTROL_ITEM_STATUS.DANGER
                          : CONTROL_ITEM_STATUS.WARNING
                    "
                    :value="
                      `${heightValue.toPrecision(2)}/${MAX_AIR_VEHICLE_ALTITUDE}`
                        .toString()
                        .padStart(padLength, '\u00A0')
                    " />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  </bm-panel>
</template>

<script lang="ts" setup>
import type App from '@blue-might/app/lib/classes/App';
import { computed } from 'vue';
import AirVehicleUnit from '@blue-might/app/lib/classes/unit/AirVehicle';
import WeaponUnitModule from '@blue-might/app/lib/classes/unitModule/Weapon';
import { DAMAGE_LEVEL } from '@blue-might/app/lib/classes/unitModule/Damage';
import { MAX_AIR_VEHICLE_ALTITUDE } from '@blue-might/app/lib/classes/unitModule/movable/AirVehicle';
import usePlayerUnitInterface from '@blue-might/app/composables/usePlayerUnitInterface';

import BmControlItem, { CONTROL_ITEM_STATUS } from '../element/ControlItem.vue';
import BmPanel from '../Panel.vue';
import BmAttitudeIndicator from '../AttitudeIndicator.vue';
import BmObjectPreviewUnit from '../objectPreview/Unit.vue';

const padLength = 7;

const $props = defineProps<{
  app: App;
}>();

const {
  unit,
  unitDamage,
  isDestroyed,
  unitGears,
  compassValue,
  // unitSpeed,
  // unitRotation,
  // position,
  // status,
  powerInfo,
  autoAimActive,
  unitActive,
  weaponSlots,
  fuelInfo,
  isVehicle,
  isAirVehicle,
  hasFuelWarning,
  heightValue,
  seaLevel
} = usePlayerUnitInterface($props.app);

const previewOptions = computed(() => {
  if (!unit.value) return null;
  return {
    type: unit.value.key,
    faction: unit.value.modules.faction.getFaction(),
    action: 'idle'
  };
});

const player = computed(() => unit.value?.modules.player?.getPlayer());
const panelTitle = computed(
  () => player.value?.name || unit.value?.name || 'n/a'
);

//#region events
function onClickUnitActive(e: Event) {
  (e.target as HTMLButtonElement).blur();
  const vehicle = player.value?.modules.vehicle;
  if (!vehicle) return;
  const movableModule = vehicle.getVehicle()?.modules.movable;

  if (movableModule) {
    if (movableModule.isTurnOn()) {
      movableModule.turnOff();
    } else {
      movableModule.turnOn();
    }
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

function onClickGears() {
  const vehicleUnit =
    player.value?.modules.vehicle.getVehicle() as AirVehicleUnit;
  if (!(vehicleUnit instanceof AirVehicleUnit)) return;

  const airVehicleModule = vehicleUnit.modules.airVehicle;
  if (!airVehicleModule) return;

  airVehicleModule.toggleGears();
}
//#endregion
</script>

<style lang="postcss" scoped>
.bm-panel-player-unit {
  color: white;

  & .row {
    display: flex;
    flex-direction: row;
    gap: var(--bm-spacing-small);
    width: 100%;

    &.row-start {
      align-items: flex-start;
    }
  }

  & .col {
    display: flex;
    flex-direction: column;
    gap: var(--bm-spacing-small);
    align-items: center;

    &.col-v {
      justify-content: center;
    }

    &.col-full {
      flex: 1;
    }

    &.col-end {
      align-items: flex-end;
    }
  }

  & .info {
    box-sizing: border-box;
    padding: var(--bm-spacing-medium);
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

      & .row {
        padding: var(--bm-spacing-medium) 0;
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

.compass {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-bit-font-family);
  font-size: var(--font-bit-font-size);
  line-height: var(--font-bit-line-height);
}

.preview {
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
</style>
