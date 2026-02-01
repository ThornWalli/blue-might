<template>
  <bm-panel class="bm-panel-editor-general" title="Editor General">
    <div class="controls">
      <bm-button
        v-if="isPlaying"
        :icon="ICON.PAUSE"
        hide-label
        label="Pause"
        @click="onClickPause" />
      <bm-button
        v-else
        :icon="ICON.PLAY"
        hide-label
        label="Play"
        @click="onClickPlay" />
      <span v-html="time"></span>
      <bm-button
        :disabled="!isPlayed"
        :icon="ICON.ARROW_UTURN_LEFT"
        hide-label
        label="Revert"
        @click="onClickRevert" />
    </div>
    <hr />
    <bm-button
      :disabled="played"
      label="Settings"
      @click="onClickMapSettings" />
    <bm-button label="Missions" disabled />
    <bm-button :disabled="played" label="Player" @click="onClickPlayer" />
    <bm-button :disabled="played" label="Surface" @click="onClickSurface" />
    <bm-button :disabled="played" label="Units" @click="onClickUnits" />
    <bm-button :disabled="played" label="Factions" @click="onClickFactions" />
    <bm-button :disabled="played" label="Export" @click="onClickExport" />
    <bm-button :disabled="played" label="New" @click="onClickNew" />
    <teleport to="body">
      <bm-dialog ref="mapSettingsDialog">
        <template #header>Map Settings</template>
        <template #default>
          <bm-dialog-editor-map-settings :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="surfaceDialog">
        <template #header>Surface Settings</template>
        <template #default>
          <bm-dialog-editor-surface-settings :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="factionsDialog">
        <template #header>Faction Settings</template>
        <template #default>
          <bm-dialog-editor-faction-settings :app="$props.app" />
        </template>
      </bm-dialog>
      <bm-dialog ref="newDialog">
        <template #header>New Map</template>
        <template #default>
          <bm-dialog-editor-new :app="$props.app" />
        </template>
      </bm-dialog>
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { createExport } from '@blue-might/app/utils/export';
import { onMounted, onUnmounted, ref } from 'vue';
import { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';
import { ICON } from '@blue-might/app/utils/icons';
import { Subscription } from 'rxjs';

import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmDialog from '../Dialog.vue';
import BmDialogEditorMapSettings from '../dialog/EditorMapSettings.vue';
import BmDialogEditorFactionSettings from '../dialog/EditorFactionSettings.vue';
import BmDialogEditorSurfaceSettings from '../dialog/EditorSurfaceSettings.vue';
import BmDialogEditorNew from '../dialog/EditorNew.vue';

const isPlaying = ref(false);
const isPlayed = ref(false);
const time = ref('000');

defineOptions({
  inheritAttrs: false
});

const $props = defineProps<{
  app: AppEditor;
}>();

const subscription = new Subscription();
onMounted(() => {
  subscription.add(
    $props.app.modules.map.observables.map$.subscribe(() => {
      reset();
    })
  );
  subscription.add(
    $props.app.modules.time.observables.mapTime$.subscribe(t => {
      time.value = String(Math.round(t)).padStart(3, '0');
    })
  );
  subscription.add(
    $props.app.observables.updateActive$.subscribe(v => {
      isPlaying.value = v;
      isPlayed.value = v || isPlayed.value;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

const mapSettingsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const factionsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const surfaceDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const newDialog = ref<InstanceType<typeof BmDialog> | null>(null);

async function onClickUnits() {
  await reset();
  $props.app.setMode(EDITOR_MODE.UNITS);
}

async function onClickMapSettings() {
  await reset();
  mapSettingsDialog.value?.context?.open();
}

async function onClickSurface() {
  await reset();
  surfaceDialog.value?.context?.open();
}

async function onClickFactions() {
  await reset();
  factionsDialog.value?.context?.open();
}

async function onClickPlayer() {
  await reset();
  $props.app.setMode(EDITOR_MODE.PLAYER);
}

async function onClickExport() {
  await reset();
  const app = $props.app;
  const description = await app.modules.map.getMap()?.toDescription();
  if (description) {
    console.log(description);
    createExport(description);
  }
}

async function onClickNew() {
  await reset();
  newDialog.value?.context?.open();
}

const played = ref(false);
async function onClickPlay() {
  played.value = true;
  await $props.app.modules.map.stashDescription();
  $props.app.setUpdateActive(true);
}
function onClickPause() {
  $props.app.setUpdateActive(false);
}

async function reset() {
  if (!played.value) return;
  $props.app.setUpdateActive(false);
  await $props.app.modules.map.unstashDescription();
  $props.app.modules.time.reset();
  played.value = false;
}
function onClickRevert() {
  reset();
}
</script>

<style lang="postcss" scoped>
.bm-panel-editor-general {
  & .controls {
    display: flex;
    gap: var(--bm-spacing-small);
    align-items: center;
    width: 160px;

    & > :first-child {
      flex: 1;
    }

    & span {
      font-family: var(--font-family-base);
      font-size: 12px;
      font-weight: bold;
    }
  }
}
</style>
