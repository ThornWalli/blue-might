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
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import {
  CombatHelicopter_1,
  ControlTower_1,
  FactoryChimney_1,
  LandingPort_1,
  Soldat_1,
  Tank_1,
  Tower_1
} from '@blue-might/units';
import House_1 from '@blue-might/units/building/house_1/House_1';
import { Subscription } from 'rxjs';
import { Euler, Vector3 } from 'three';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'tank-1';

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  units: [
    new CombatHelicopter_1({
      id: playerUnitId,
      position: new Vector3(2.83, 0, 2.17),
      rotation: new Euler(0, Math.PI, 0)
    }),
    new Tank_1({
      position: new Vector3(1, 0, 0.5)
    }),
    new Soldat_1({
      position: new Vector3(0.64, 0, -0.06)
    }),
    new House_1({
      position: new Vector3(0, 0, 0)
    }),
    new Tower_1({
      position: new Vector3(4.17, 0, 0.17)
    }),
    new LandingPort_1({
      position: new Vector3(2.83, 0, 2.17)
    }),
    new ControlTower_1({
      position: new Vector3(1.5, 0, 3.17)
    }),
    new FactoryChimney_1({
      position: new Vector3(2.83, 0, -2.17)
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
