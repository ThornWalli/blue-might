<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: true } } }"
      :on-setup="onSetup"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';

import { BlueMight, Tank_1, Tree_1 } from '@blue-might/units';
import { Subscription } from 'rxjs';
import { Euler, Vector3 } from 'three';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'blue-might-1';

const map: Partial<MapDescription> = {
  units: [
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(0, 0, 0),
      rotation: new Euler(0, 0, 0),
      moduleStates: {
        movable: {
          active: true
        }
      },
      moduleDebug: {
        pathfinding: true
      }
    }),
    new BlueMight({
      id: 'blue-might-1',
      position: new Vector3(2, 0, 0)
    }),
    new Tree_1({
      id: 'tree-1',
      position: new Vector3(-0.17, 0, 2.83),
      rotation: new Euler(0, 0, 0)
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
