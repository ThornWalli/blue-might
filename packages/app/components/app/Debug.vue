<template>
  <bm-app-layout class="bm-app-debug">
    <template #[PANEL.BOTTOM_LEFT]>
      <div class="panel-column">
        <bm-panel-internals key="internals" :app="app" />
        <bm-panel-debug key="debug" :app="app" />
        <bm-panel-general key="general" :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_LEFT]>
      <div class="panel-row">
        <bm-panel-map key="map" :app="app" />
      </div>
    </template>
    <template #[PANEL.TOP_RIGHT]>
      <bm-panel-player-unit key="unit-preview" :app="app" />
    </template>
    <template #[PANEL.BOTTOM_RIGHT]>
      <bm-panel-unit-preview key="unit-preview" :app="app" />
    </template>
    <template #background>
      <bm-head-up-indicator v-if="!hideIndicators" :app="app" />
    </template>
  </bm-app-layout>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import type AppDebug from '../../lib/classes/app/AppDebug';
import BmAppLayout, { PANEL } from '../AppLayout.vue';
import BmPanelInternals from '../panel/Internals.vue';
import BmPanelDebug from '../panel/Debug.vue';
import BmPanelGeneral from '../panel/General.vue';
import BmPanelUnitPreview from '../panel/UnitPreview.vue';
import BmPanelPlayerUnit from '../panel/PlayerUnit.vue';
import BmPanelMap from '../panel/NavigatorMap.vue';
import BmHeadUpIndicator from '../HeadUpIndicator.vue';

const hideIndicators = ref(false);

defineProps<{
  app: AppDebug;
}>();
</script>

<style lang="postcss" scoped>
.bm-app-debug {
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
