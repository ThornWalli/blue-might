<template>
  <bm-panel class="bm-panel-navigator-map" title="Map">
    <bm-navigator-map :app="app" controls />
    <bm-button
      :icon="unitFocused ? ICON.UNLOCKED : ICON.LOCKED"
      :label="unitFocused ? 'Unlock' : 'Lock'"
      @click="onClickFocusUnit" />
  </bm-panel>
</template>

<script lang="ts" setup>
import { markRaw, onMounted, onUnmounted, ref, type Raw } from 'vue';
import type Unit from '@blue-might/app/lib/classes/Unit';
import { ICON } from '@blue-might/app/utils/icons';
import { map, Subscription, switchMap } from 'rxjs';
import type VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';
import type { App } from '@blue-might/app/lib/types';

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

  if ('player' in app.modules) {
    const vehicle$ = app.modules.player.observables.currentPlayer$.pipe(
      switchMap(player => player.modules.vehicle.observables.unit$),
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

function onClickFocusUnit() {
  const app = $props.app;
  if (unitFocused.value) {
    app.modules.unitFocus.unfocus();
  } else {
    app.modules.unitFocus.followFocus(unit.value!);
  }
}
</script>
