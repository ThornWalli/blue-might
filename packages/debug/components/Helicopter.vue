<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { [PathfindingModule.TYPE]: true } } }"
      :on-setup="onSetup"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import PathfindingModule from '@blue-might/app/lib/classes/mapModule/Pathfinding';
import HelicopterUnitModule from '@blue-might/app/lib/classes/unitModule/movable/Helicopter';

import { BlueMight } from '@blue-might/units';
import { Subscription } from 'rxjs';
import { Vector3 } from 'three';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'blue-might-1';

const map: Partial<MapDescription> = {
  units: [
    new BlueMight({
      id: 'blue-might-1',
      position: new Vector3(0, 0, 0),
      moduleStates: {
        [HelicopterUnitModule.TYPE]: {
          active: true
        }
      }
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
