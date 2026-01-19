<template>
  <div>
    <debug-app-component map-type="sea" :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import { Subscription } from 'rxjs';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  playerOptions: {
    position: [4, 0, 0],
    unit: {
      key: 'combat_fregatte_1',
      options: {
        moduleDebug: {
          collision: true
        }
      }
    }
  },
  debug: {
    pathfinding: false
  },
  units: [
    {
      key: 'combat_ship_1',
      position: [0, 0, 0],
      debug: false,
      moduleDebug: {
        pathfinding: false,
        attack: false
      },

      moduleOptions: {
        damage: {
          maxDamage: 1000
        },
        faction: {
          faction: blueFaction
        }
      }
    },

    {
      key: 'lighthouse_1',
      position: [2.67, 0, 9.19],
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    },

    {
      key: 'combat_submarine_1',
      position: [2, 0, 0],
      moduleDebug: {
        collision: true
      },
      moduleOptions: {
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
    }
  ]
};
</script>
