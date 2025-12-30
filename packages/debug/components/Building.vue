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
import { CombatHelicopter_1, Tower_1 } from '@blue-might/units';
import House_1 from '@blue-might/units/building/house_1/House_1';
import { Subscription } from 'rxjs';
import { Vector3 } from 'three';
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
      position: new Vector3(0, 0, 2)
    }),
    new House_1({
      position: new Vector3(0, 0, 0)
    }),
    new Tower_1({
      position: new Vector3(5, 5, 0)
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
