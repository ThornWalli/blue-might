<template>
  <div>
    <debug-app-component
      map-type="sea"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import { CombatShip_1, CombatSubmarine_1 } from '@blue-might/units';
import { Subscription } from 'rxjs';
import { Vector3 } from 'three';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'player-1';

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  debug: {
    pathfinding: false
  },
  units: [
    new CombatShip_1({
      debug: false,
      moduleDebug: {
        pathfinding: false,
        attack: false
      },
      position: new Vector3(0, 0, 0),

      moduleStates: {
        damage: {
          maxDamage: 1000
        },
        faction: {
          faction: blueFaction
        }
      }
    }),

    new CombatSubmarine_1({
      id: playerUnitId,
      position: new Vector3(2, 0, 0),
      moduleStates: {
        damage: {
          maxDamage: 1000
        },
        movable: {
          active: true
        },
        faction: {
          faction: blueFaction
        }
        // patrol: {
        //   active: true
        // }
      }
    })
  ]
};
</script>
