<template>
  <bm-panel class="bm-panel-navigator-map" title="Map">
    <bm-navigator-map
      :app="app"
      controls
      :shadow="app.getAppMode() === APP_MODE.PLAYGROUND" />
    <bm-button
      v-if="app.getAppMode() !== APP_MODE.EDITOR"
      :label="`View (${currentView})`"
      @click="onClickSwitchView()" />
  </bm-panel>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type Unit from '@blue-might/app/lib/classes/Unit';
import { map, Subscription, switchMap } from 'rxjs';
import type VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';
import type { App } from '@blue-might/app/lib/types';
import { APP_MODE } from '@blue-might/app/lib/classes/BaseApp';
import { CAMERA_VIEW } from '@blue-might/app/lib/classes/rendererModule/Camera';

import BmPanel from '../Panel.vue';
import BmNavigatorMap from '../NavigatorMap.vue';
import BmButton from '../Button.vue';

const unit = ref<Raw<Unit> | null>(null);
const unitFocused = ref<Raw<Unit> | null>(null);

const $props = defineProps<{
  app: App;
}>();

const subscription = new Subscription();

onMounted(() => {
  const app = $props.app;
  const followedUnit$ = app.modules.unitFocus.observables.followedUnit$;

  subscription.add(
    app.renderer.modules.camera.observables.view$.subscribe(view => {
      currentView.value = view;
    })
  );

  if ('player' in app.modules) {
    const vehicle$ = app.modules.player.observables.currentPlayer$.pipe(
      switchMap(player => player.modules.vehicle.observables.currentUnit$),
      map(unit => unit as VehicleUnit | null)
    );
    //#region unit

    subscription.add(
      vehicle$.subscribe(
        vehicle => (unit.value = vehicle ? markRaw(vehicle) : null)
      )
    );
    subscription.add(
      followedUnit$.subscribe(focusedUnit => (unitFocused.value = focusedUnit))
    );
    //#endregion
  }
});

onUnmounted(() => {
  subscription.unsubscribe();
});

const currentView = ref<CAMERA_VIEW>(CAMERA_VIEW.FREE);
const views = Object.values(CAMERA_VIEW);
function onClickSwitchView() {
  const app = $props.app;

  const playerModule = 'player' in app.modules ? app.modules.player : null;
  const unit =
    playerModule?.getCurrentPlayer().modules.vehicle.getCurrentUnit() ?? null;
  if (!unit) return;
  app.renderer.modules.camera.setViewByUnit(
    unit,
    views[(views.indexOf(currentView.value) + 1) % views.length]!
  );
}
</script>
