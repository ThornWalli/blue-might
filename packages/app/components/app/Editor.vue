<template>
  <bm-app-layout class="bm-app-editor">
    <template #background>
      <div v-if="!isMode(EDITOR_MODE.DEFAULT)" class="mode">
        {{ mode }} Mode
      </div>
    </template>
    <template #[PANEL.BOTTOM_LEFT]>
      <div class="panel-column">
        <div class="panel-row panel-row-end">
          <bm-panel-editor-units key="editor-units" :mode="mode" :app="app" />
          <bm-panel-editor-units-controls
            key="editor-units-controls"
            :mode="mode"
            :app="app" />
        </div>
        <bm-panel-editor-player
          v-if="isMode(EDITOR_MODE.PLAYER)"
          key="editor-player"
          :mode="mode"
          :app="app"
          @close="setMode(EDITOR_MODE.DEFAULT)" />
        <bm-panel-editor-general
          v-if="isMode(EDITOR_MODE.DEFAULT)"
          key="editor-general"
          :app="app" />
        <bm-panel-general
          v-if="isMode(EDITOR_MODE.DEFAULT)"
          key="general"
          show-import
          :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_LEFT]>
      <div class="panel-row">
        <bm-panel-map key="map" :app="app" :shadow="false" />
        <bm-panel-editor-grid key="editor-grid" :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_RIGHT]>
      <bm-panel-editor-mission
        v-if="isMode(EDITOR_MODE.DEFAULT)"
        key="editor-mission"
        :app="app" />
    </template>
    <template #[PANEL.BOTTOM_RIGHT]>
      <bm-panel-editor-unit-patrol
        v-if="isMode(EDITOR_MODE.PATROL)"
        key="editor-unit-patrol"
        :app="app"
        @close="setMode(EDITOR_MODE.DEFAULT)" />
      <bm-panel-editor-unit-info
        v-if="isMode(EDITOR_MODE.DEFAULT)"
        key="editor-unit-info"
        :app="app"
        :mode="mode"
        @mode="setMode($event)" />
      <bm-panel-editor-unit-settings
        v-if="isMode(EDITOR_MODE.DEFAULT)"
        key="editor-unit-settings"
        :app="app"
        :mode="mode"
        @mode="setMode($event)" />
    </template>
  </bm-app-layout>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Subscription } from 'rxjs';
import type AppEditor from '@blue-might/app/lib/classes/app/AppEditor';
import { EDITOR_MODE } from '@blue-might/app/lib/classes/app/AppEditor';

import BmAppLayout, { PANEL } from '../AppLayout.vue';
import BmPanelMap from '../panel/NavigatorMap.vue';
import BmPanelGeneral from '../panel/General.vue';
import BmPanelEditorGrid from '../panel/EditorGrid.vue';
import BmPanelEditorUnits from '../panel/EditorUnits.vue';
import BmPanelEditorUnitsControls from '../panel/EditorUnitsControls.vue';
import BmPanelEditorGeneral from '../panel/EditorGeneral.vue';
import BmPanelEditorUnitPatrol from '../panel/EditorUnitPatrol.vue';
import BmPanelEditorPlayer from '../panel/EditorPlayer.vue';
import BmPanelEditorUnitInfo from '../panel/EditorUnitInfo.vue';
import BmPanelEditorUnitSettings from '../panel/EditorUnitSettings.vue';
import BmPanelEditorMission from '../panel/EditorMission.vue';

const mode = ref<EDITOR_MODE>(EDITOR_MODE.DEFAULT);

const $props = defineProps<{
  app: AppEditor;
}>();

const subscription = new Subscription();

onMounted(() => {
  subscription.add(
    $props.app.observables.mode$.subscribe(m => {
      mode.value = m;
    })
  );
});

onUnmounted(() => {
  subscription.unsubscribe();
});

function isMode(m: EDITOR_MODE) {
  return mode.value === m;
}
function setMode(m: EDITOR_MODE) {
  $props.app.setMode(m);
}
</script>

<style lang="postcss" scoped>
.bm-app-editor {
  --panel-offset: 1em;

  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  pointer-events: none;

  & .bm-renderer {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
  }

  & .mode {
    position: absolute;
    top: var(--bm-spacing-medium);
    left: 50%;
    padding: var(--bm-spacing-medium);
    font-family: var(--font-family-bit-font);
    font-size: var(--font-size-bit-font);
    line-height: var(--line-height-bit-font);
    color: #fd2;
    text-transform: uppercase;
    background: #000;
    transform: translateX(-50%);
  }
}
</style>
