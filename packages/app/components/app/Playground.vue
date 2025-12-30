<template>
  <bm-app-layout class="bm-app-playground">
    <template #[PANEL.BOTTOM_LEFT]>
      <div class="panel-row">
        <bm-panel-debug key="general" :app="app" />
      </div>
      <div class="panel-row">
        <bm-panel-controls key="general" :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_LEFT]>
      <div class="panel-row">
        <bm-panel-map key="map" :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_RIGHT]>
      <div class="panel-row">
        <bm-panel-secondary-screen key="secondary-screen" :app="app" />
        <bm-panel-player-unit key="player-unit" :app="app" />
      </div>
    </template>
    <template #[PANEL.BOTTOM]> </template>
    <template #[PANEL.BOTTOM_RIGHT]>
      <bm-panel-unit-preview key="unit-preview" :app="app" />
    </template>
  </bm-app-layout>
</template>

<script lang="ts" setup>
import type App from '../../lib/classes/App';
import BmAppLayout, { PANEL } from '../AppLayout.vue';
import BmPanelDebug from '../panel/Debug.vue';
import BmPanelControls from '../panel/Controls.vue';
import BmPanelUnitPreview from '../panel/UnitPreview.vue';
import BmPanelPlayerUnit from '../panel/PlayerUnit.vue';
import BmPanelSecondaryScreen from '../panel/GunScreen.vue';
import BmPanelMap from '../panel/Map.vue';

defineProps<{
  app: App;
}>();
</script>

<style lang="postcss" scoped>
.bm-app-playground {
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
}
</style>
