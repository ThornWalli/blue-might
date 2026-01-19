<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: false } } }"
      :on-setup="onSetup"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
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
    position: [0, 0, 0],
    unit: {
      key: 'combat_tank_1',
      options: {
        moduleDebug: {
          collision: true,
          pathfinding: false,
          patrol: false
        },
        moduleOptions: {
          damage: {
            maxDamage: 1000
          },
          movable: {
            active: true
          }
        }
      }
    }
  },
  units: [
    {
      key: 'control_tower_1',
      moduleDebug: {
        collision: true
      },
      position: [0.0, 0, 1.25]
    },

    // new CombatTank_1({
    //   position: new Vector3(-1.83, 0, 0.17),
    //   rotation: new Euler(0, Math.PI / 4, 0),
    //   moduleOptions: {
    //     patrol: {
    //       path: [
    //         // [2.83, 4.5],
    //         // [-2.83, 4.5]

    //         [4.83, 5.17],
    //         [-4.5, 5.17],
    //         [-4.17, -1.5],
    //         [3.5, -1.83]
    //       ]
    //     }
    //   },
    //   moduleStates: {
    //     faction: {
    //       faction: blueFaction
    //     },
    //     patrol: {
    //       active: true
    //     }
    //   }
    // }),
    {
      key: 'supply_station_1',
      position: [2, 0, 2],
      rotation: [0, Math.PI, 0],
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    },
    {
      key: 'landing_port_supply_station_1',
      position: [2, 0, 2],
      rotation: [0, Math.PI, 0],
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    }
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
