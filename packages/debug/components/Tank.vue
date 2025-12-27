<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: false } } }"
      :on-setup="onSetup"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import Faction from '@blue-might/app/lib/classes/Faction';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { Tank_1 } from '@blue-might/units';
import { Subscription } from 'rxjs';
import { Vector3 } from 'three';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'tank-1';

const blueFaction = new Faction({
  id: 'blue-faction',
  name: 'Blue Faction',
  colors: [0x0055aa]
});
const map: Partial<MapDescription> = {
  factions: [blueFaction],
  units: [
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(0, 0, 0),
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      moduleOptions: {
        patrol: {
          path: [
            // [2.83, 4.5],
            // [-2.83, 4.5]

            [4.83, 5.17],
            [-4.5, 5.17],
            [-4.17, -1.5],
            [3.5, -1.83]
          ]
        }
      },
      moduleStates: {
        faction: {
          faction: blueFaction
        },
        patrol: {
          active: false
        },
        movable: {
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
