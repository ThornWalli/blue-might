<template>
  <bm-details class="bm-debug-move" label="Move Unit">
    <bm-button
      :disabled="
        !debugModule ||
        (isVehicle && !unitActive) ||
        !unit ||
        !(unit instanceof MovableUnit)
      "
      label="Move Unit"
      @click="onClickMoveUnit" />
    <bm-button
      :disabled="!isVehicle || !unit || !(unit instanceof MovableUnit)"
      :label="unitActive ? 'Vehicle Off' : 'Vehicle On'"
      @click="onClickUnitActive">
    </bm-button>
  </bm-details>
</template>

<script lang="ts" setup>
import type { PositionMarker } from '@blue-might/app/lib/classes/appModule/Debug';
import { computed, markRaw, onMounted, ref } from 'vue';
import { EMPTY, filter, merge, of, Subscription, switchMap } from 'rxjs';
import VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';
import type Unit from '@blue-might/app/lib/classes/Unit';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import MovableUnit from '@blue-might/app/lib/classes/unit/Movable';
import type { App } from '@blue-might/app/lib/types';
import type DebugAppModule from '@blue-might/app/lib/classes/appModule/Debug';

import BmDetails from '../Details.vue';
import BmButton from '../Button.vue';

const subscription = new Subscription();

const startAddMarker = ref<boolean>(false);
const positionMarkers = ref<PositionMarker[]>([]);

const unitActive = ref<boolean>(false);
const unit = ref<Unit | null>(null);

const isVehicle = computed(() => {
  return unit.value instanceof VehicleUnit;
});

const $props = defineProps<{
  app: App;
}>();

const debugModule = computed(() => {
  const app = $props.app;
  if ('debug' in app.modules) {
    return app.modules.debug as DebugAppModule;
  }
  return null;
});

onMounted(() => {
  const app = $props.app;

  if (debugModule.value) {
    subscription.add(
      debugModule.value.observables.positionMarkers$.subscribe(positions => {
        positionMarkers.value = positions;
      })
    );
    subscription.add(
      merge(
        debugModule.value.observables.abortAddMarker$,
        debugModule.value.observables.endAddMarker$
      ).subscribe(() => {
        startAddMarker.value = false;
      })
    );
    subscription.add(
      debugModule.value.observables.startAddMarker$.subscribe(() => {
        startAddMarker.value = true;
      })
    );
  }
  const vehicle$ = app.modules.selection.observables.selectUnit$;

  const vehicleModule$ = vehicle$.pipe(
    filter(vehicle => vehicle?.hasModuleType(MovableUnitModule) ?? false),
    switchMap(vehicle => of((vehicle as MovableUnit).modules.movable ?? EMPTY)),
    filter(Boolean)
  );

  app.modules.selection.observables.selectUnit$.subscribe(u => {
    unit.value = u ? markRaw(u) : null;
  });

  subscription.add(
    vehicleModule$
      .pipe(switchMap(({ observables }) => observables.active$))
      .subscribe(v => {
        unitActive.value = v;
      })
  );
});

function onClickMoveUnit() {
  debugModule.value?.startMove();
}
function onClickUnitActive(e: Event) {
  (e.target as HTMLButtonElement).blur();
  const unit = $props.app.modules.selection.getSelectedUnit() as MovableUnit;
  if (!unit) return;
  const vehicleModule = unit.modules.movable;

  if (vehicleModule.isTurnOn()) {
    vehicleModule.turnOff();
  } else {
    vehicleModule.turnOn();
  }
}
</script>

<style lang="postcss" scoped>
.markers + div {
  display: flex;
  flex-direction: column;
}
</style>
