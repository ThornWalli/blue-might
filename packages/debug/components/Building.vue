<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: false } } }"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import factions, { FACTION } from '@blue-might/app/lib/utils/factions';
import { Subscription } from 'rxjs';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'tank-1';

const map: Partial<MapDescription> = {
  playerOptions: {
    position: [2.83, 0, 2.17],
    rotation: [0, Math.PI, 0],
    faction: FACTION.BLUE,
    unit: {
      key: 'combat_helicopter_1'
    }
  },
  factions: [factions[FACTION.BLUE], factions[FACTION.ENEMY]],
  units: [
    {
      key: 'tank_1',
      position: [1, 0, 0.5]
    },
    {
      key: 'soldat_1',
      position: [0.64, 0, -0.06]
    },
    {
      key: 'house_1',
      position: [0, 0, 0]
    },
    {
      key: 'tower_1',
      position: [4.17, 0, 0.17]
    },
    {
      key: 'sea_landing_port_supply_station_1',
      position: [2.83, 0, 2.17]
    },
    {
      key: 'control_tower_1',
      position: [1.5, 0, 3.17]
    },
    {
      key: 'factory_1',
      position: [7.5, 0, -2.17]
    },
    {
      key: 'factory_chimney_1',
      position: [8.83, 0, -0.17]
    },
    {
      key: 'lighthouse_1',
      position: [-8.83, 0, -0.17]
    }
  ]
};
</script>
