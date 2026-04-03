<template>
  <bm-panel class="bm-panel-editor-player" title="Editor Player">
    <bm-form-field label-top label="Faction">
      <bm-select
        :model-value="playerFaction"
        :options="factionOptions"
        @update:model-value="onUpdateFaction" />
    </bm-form-field>
    <bm-form-field label-top label="Unit">
      <bm-select
        :model-value="playerOptions.unit?.key"
        :options="unitOptions"
        @update:model-value="onUpdateUnit" />
    </bm-form-field>
    <bm-button label="Unit Debug" @click="onClickUnitDebug" />
    <bm-button label="Set start position" @click="onClickSetStartPosition" />
    <bm-button
      :label="`Set rotation (${getCompassDisplayValue(playerOptions.rotation?.y ?? 0)})`"
      @click="onClickSetRotation" />
    <bm-button
      v-if="tmpUnit && canCustomize"
      label="Customize Unit"
      @click="onClickCustomizeUnit" />
    <bm-button label="Close" @click="onClickClose" />
    <teleport to="body">
      <bm-dialog ref="playerUnitDebugDialog">
        <template #header>Unit Debug</template>
        <template #default>
          <bm-dialog-editor-player-unit-debug
            v-model="playerOptions.unitDebug"
            :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="customizeUnitDialog">
        <template #header>Customize Unit</template>
        <template #default>
          <bm-dialog-customize-unit
            v-if="tmpUnit"
            :app="$props.app"
            :unit="tmpUnit" />
        </template>
      </bm-dialog>
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import {
  computed,
  markRaw,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Raw
} from 'vue';
import type { FactionIdentifier } from '@blue-might/app/lib/classes/Faction';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { PlayerOptions } from '@blue-might/app/lib/types/map';
import { Euler, Vector3 } from 'three';
import * as units from '@blue-might/units';
import type { VehicleUnits } from '@blue-might/units';
import { UNIT_TYPE } from '@blue-might/app/lib/types/unit';
import { getCompassDisplayValue } from '@blue-might/app/lib/utils/compass';
import type Faction from '@blue-might/app/lib/classes/Faction';
import { getUnitMap } from '@blue-might/app/lib/utils/unit';
import type { WeaponSlot } from '@blue-might/app/lib/classes/WeaponSlot';

import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmSelect from '../Select.vue';
import BmFormField from '../FormField.vue';
import BmDialog from '../Dialog.vue';
import BmDialogEditorPlayerUnitDebug from '../dialog/EditorPlayerUnitDebug.vue';
import BmDialogCustomizeUnit from '../dialog/CustomizeUnit.vue';

const playerOptions = ref<Raw<PlayerOptions>>({} as Raw<PlayerOptions>);
const playerUnitDebugDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const customizeUnitDialog = ref<InstanceType<typeof BmDialog> | null>(null);

const unitMap = getUnitMap(units);
const tmpUnit = ref<Raw<VehicleUnits>>();
let tmpUnitSuscription: Subscription | null = null;

const canCustomize = ref(false);
watch(
  () => playerOptions.value.unit?.key,
  newKey => {
    tmpUnitSuscription?.unsubscribe();
    tmpUnitSuscription = new Subscription();
    const UnitClass = unitMap.get(newKey);
    if (UnitClass) {
      tmpUnit.value = markRaw(new UnitClass()) as VehicleUnits;
      if ('weapon' in tmpUnit.value.modules && tmpUnit.value.modules.weapon) {
        tmpUnitSuscription.add(
          tmpUnit.value.modules.weapon.observables.slots$.subscribe(slots => {
            onUpdateUnitWeaponSlots(slots);
          })
        );
      }
      canCustomize.value = 'customize' in (tmpUnit.value?.modules ?? {});
    }
  }
);

const $props = defineProps<{
  app: AppEditor;
}>();

const $emit = defineEmits<{
  (e: 'close'): void;
}>();

const neutralFaction = $props.app.modules.editorFaction.neutralFaction;
const playerFaction = computed(() => {
  return playerOptions.value?.faction ?? neutralFaction.id;
});

//#region factions
const factions = ref<Faction[]>([]);
const factionOptions = computed(() => {
  return factions.value.map(faction => ({
    label: faction.name,
    value: faction.id
  }));
});
//#endregion

const unitOptions = computed(() => {
  return (
    Object.values(units)

      .filter(
        u =>
          u.TYPES.includes(UNIT_TYPE.FIGURE) ||
          u.TYPES.includes(UNIT_TYPE.AIR_VEHICLE) ||
          u.TYPES.includes(UNIT_TYPE.SEA_VEHICLE) ||
          u.TYPES.includes(UNIT_TYPE.GROUND_VEHICLE)
      ) ?? []
  ).map(u => ({
    label: u.KEY,
    value: u.KEY
  }));
});

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    $props.app.modules.map
      .getMap()
      ?.modules.faction.observables.factions$.subscribe(factionList => {
        factions.value = factionList;
      })
  );
  subscription.add(
    $props.app.modules.editorPlayer.observables.playerOptions$.subscribe(o => {
      playerOptions.value = markRaw(o);
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function onUpdateFaction(factionId: FactionIdentifier) {
  if (playerOptions.value) {
    $props.app.modules.editorPlayer.setPlayerOptions({
      ...playerOptions.value,
      faction: factionId
    });
  }
}

function onUpdateUnit(key: string) {
  if (playerOptions.value) {
    $props.app.modules.editorPlayer.setPlayerOptions({
      ...playerOptions.value,
      unit: {
        ...playerOptions.value.unit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        key: key as any
      }
    });
  }
}

function onUpdateUnitWeaponSlots(slots: WeaponSlot[]) {
  if (playerOptions.value) {
    $props.app.modules.editorPlayer.setPlayerOptions({
      ...playerOptions.value,
      unit: {
        ...playerOptions.value.unit,
        moduleOptions: {
          weapon: {
            slots: slots.map(slot => slot.getOptions())
          }
        }
      }
    });
  }
}

function onClickSetStartPosition() {
  if (playerOptions.value) {
    const currentPosition = $props.app.modules.editorGrid.getCurrentPosition();
    $props.app.modules.editorPlayer.setPlayerOptions({
      ...playerOptions.value,
      position: new Vector3(currentPosition.x, 0, currentPosition.y)
    });
  }
}

function onClickSetRotation() {
  if (playerOptions.value) {
    const rotation = playerOptions.value.rotation ?? new Euler();
    $props.app.modules.editorPlayer.setPlayerOptions({
      ...playerOptions.value,
      rotation: new Euler(
        rotation.x,
        (rotation.y + Math.PI / 4) % (2 * Math.PI),
        rotation.z
      )
    });
  }
}

function onClickUnitDebug() {
  playerUnitDebugDialog.value?.context?.open();
}

function onClickClose() {
  $emit('close');
}

function onClickCustomizeUnit() {
  customizeUnitDialog.value?.context?.open();
}
</script>
<style lang="postcss" scoped>
.bm-panel-editor-player {
  /* empty */
}
</style>
