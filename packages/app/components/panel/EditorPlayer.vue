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
    <bm-button label="Set start position" @click="onClickSetStartPosition" />
    <bm-button
      :label="`Set rotation (${getCompassDisplayValue(playerOptions.rotation?.y ?? 0)})`"
      @click="onClickSetRotation" />
    <bm-button label="Close" @click="onClickClose" />
  </bm-panel>
</template>

<script lang="ts" setup>
import { computed, markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type { FactionIdentifier } from '@blue-might/app/lib/classes/Faction';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import type { PlayerOptions } from '@blue-might/app/lib/classes/Map';
import { Euler, Vector3 } from 'three';
import * as units from '@blue-might/units';
import { UNIT_TYPE } from '@blue-might/app/lib/types/unit';
import { getCompassDisplayValue } from '@blue-might/app/lib/utils/compas';
import type Faction from '@blue-might/app/lib/classes/Faction';

import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmSelect from '../Select.vue';
import BmFormField from '../FormField.vue';

const playerOptions = ref<Raw<PlayerOptions>>({} as Raw<PlayerOptions>);

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

function onClickClose() {
  $emit('close');
}
</script>
<style lang="postcss" scoped>
.bm-panel-editor-player {
  /* empty */
}
</style>
