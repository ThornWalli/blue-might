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
import { computed, markRaw, onMounted, onUnmounted, ref } from 'vue';
import { EMPTY, filter, of, Subscription, switchMap } from 'rxjs';
import VehicleUnit from '@blue-might/app/lib/classes/unit/Vehicle';
import type Unit from '@blue-might/app/lib/classes/Unit';
import MovableUnitModule from '@blue-might/app/lib/classes/unitModule/Movable';
import MovableUnit from '@blue-might/app/lib/classes/unit/Movable';
import type { App } from '@blue-might/app/lib/types';
import type DebugAppModule from '@blue-might/app/lib/classes/appModule/Debug';

import BmDetails from '../Details.vue';
import BmButton from '../Button.vue';

const subscription = new Subscription();

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

onUnmounted(() => {
  subscription.unsubscribe();
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
