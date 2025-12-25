<template>
  <bm-details class="bm-debug-move" label="Move Unit">
    <bm-button
      :disabled="
        (isVehicle && !unitActive) || !unit || !(unit instanceof MovableUnit)
      "
      @click="onClickMoveUnit">
      Move Unit
    </bm-button>
    <bm-button
      :disabled="!isVehicle || !unit || !(unit instanceof MovableUnit)"
      @click="onClickUnitActive">
      {{ unitActive ? 'Vehicle Off' : 'Vehicle On' }}
    </bm-button>
  </bm-details>
</template>

<script lang="ts" setup>
import type { PositionMarker } from '@blue-might/app/lib/classes/appModule/Debug';
import type App from '../../lib/classes/App';
import { computed, markRaw, onMounted, ref } from 'vue';
import { EMPTY, filter, merge, of, Subscription, switchMap } from 'rxjs';

import BmButton from '../Button.vue';
import BmDetails from '../Details.vue';

import VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';
import type Unit from '@blue-might/app/lib/classes/Unit';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import MovableUnit from '@blue-might/app/lib/classes/unit/Movable';

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

onMounted(() => {
  const app = $props.app;

  subscription.add(
    app.modules.debug.observables.positionMarkers$.subscribe(positions => {
      positionMarkers.value = positions;
    })
  );
  subscription.add(
    merge(
      app.modules.debug.observables.abortAddMarker$,
      app.modules.debug.observables.endAddMarker$
    ).subscribe(() => {
      startAddMarker.value = false;
    })
  );
  subscription.add(
    app.modules.debug.observables.startAddMarker$.subscribe(() => {
      startAddMarker.value = true;
    })
  );
  const vehicle$ = app.modules.selection.observables.selectUnit$;

  const vehicleModule$ = vehicle$.pipe(
    filter(vehicle => vehicle?.hasModuleType(MovableUnitModule) ?? false),
    switchMap(
      vehicle =>
        of((vehicle as MovableUnit)?.getModuleByType(MovableUnitModule)) ??
        EMPTY
    ),
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
  const app = $props.app;
  app.modules.debug.startMove();
}
function onClickUnitActive(e: Event) {
  (e.target as HTMLButtonElement).blur();
  const unit = $props.app.modules.selection.getSelectedUnit() as MovableUnit;
  if (!unit) return;
  const vehicleModule = unit.getModuleByType(MovableUnitModule);

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
