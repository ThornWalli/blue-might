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
import { CombatShip_1 } from '@blue-might/units';
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
      id: playerUnitId,
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

    new CombatShip_1({
      debug: false,
      id: 'combat-ship-1',
      moduleDebug: {
        attack: true,
        pathfinding: true,
        patrol: true
      },
      position: new Vector3(1, 0, 0),
      moduleOptions: {
        attack: {
          followTarget: true
        },
        patrol: {
          path: [
            [7.86, -10.3],
            [10.59, 9.39]
          ]
        }
      },
      moduleStates: {
        weapon: {
          autoAimActive: true
        },
        movable: {
          active: true
        },
        faction: {
          faction: enemyFaction
        }
        // patrol: {
        //   active: true
        // }
      }
    })
  ]
};
</script>
