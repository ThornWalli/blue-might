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
    <bm-button label="Player" @click="onClickPlayer" />
    <bm-button label="Surface" @click="onClickSurface" />
    <bm-button label="Units" @click="onClickUnits" />
    <bm-button label="Factions" @click="onClickFactions" />
    <bm-button label="Export" @click="onClickExport" />
    <bm-button-upload upload label="Import" @files="onFilesChange" />
    <teleport to="body">
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
    </teleport>
  </bm-panel>
</template>

<script lang="ts" setup>
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { createExport, createImport } from '@blue-might/app/utils/export';
import { onMounted, onUnmounted, ref } from 'vue';
import { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';
import { ICON } from '@blue-might/app/utils/icons';
import { Subscription } from 'rxjs';

import BmPanel from '../Panel.vue';
import BmButton from '../Button.vue';
import BmButtonUpload from '../button/Upload.vue';
import BmDialog from '../Dialog.vue';
import BmDialogEditorFactionSettings from '../dialog/EditorFactionSettings.vue';
import BmDialogEditorSurfaceSettings from '../dialog/EditorSurfaceSettings.vue';

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

const factionsDialog = ref<InstanceType<typeof BmDialog> | null>(null);
const surfaceDialog = ref<InstanceType<typeof BmDialog> | null>(null);

function onClickUnits() {
  $props.app.setMode(EDITOR_MODE.UNITS);
}

function onClickSurface() {
  surfaceDialog.value?.context?.open();
}

function onClickFactions() {
  factionsDialog.value?.context?.open();
}

function onClickPlayer() {
  $props.app.setMode(EDITOR_MODE.PLAYER);
}

async function onClickExport() {
  const app = $props.app;
  const description = await app.modules.map.getMap()?.toDescription();
  if (description) {
    console.log(description);
    createExport(description);
  }
}
function onFilesChange(files: FileList) {
  const file = files.item(0);
  if (file) {
    console.log(createImport(file));
  }
}

async function onClickPlay() {
  await $props.app.modules.map.stashDescription();
  $props.app.setUpdateActive(true);
}
function onClickPause() {
  $props.app.setUpdateActive(false);
}
function onClickRevert() {
  $props.app.setUpdateActive(false);
  $props.app.modules.map.unstashDescription();
  $props.app.modules.time.reset();
}
</script>

<style lang="postcss" scoped>
.bm-panel-editor-general {
  & .controls {
    display: flex;
    gap: var(--bm-spacing-small);
    align-items: center;

    & > :first-child {
      flex: 1;
    }

    & span {
      font-family: var(--font-base);
      font-size: 12px;
      font-weight: bold;
    }
  }
}
</style>
