<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: false } } }"
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

const map: Partial<MapDescription> = {
  playerOptions: {
    position: [0, 0, 0],
    faction: FACTION.BLUE,
    unit: {
      key: 'combat_helicopter_1'
    }
  },
  factions: [factions[FACTION.BLUE], factions[FACTION.ENEMY]],
  units: [
    {
      key: 'tank_1',
      id: 'tank-1',
      position: [1, 0, 2],
      rotation: undefined,
      moduleOptions: {
        faction: {
          faction: FACTION.ENEMY
        }
      }
    },
    {
      key: 'landing_port_supply_station_1',
      moduleDebug: {
        collision: false,
        supply: false
      },
      position: [0, 0, 0],
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        }
      }
    },
    {
      key: 'missile_launcher_1',
      position: [-2.83, 0, 2.5],
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        }
      }
    },
    // {
    //   key: 'turret_1',
    //   position: [-0.17, 0, 9.17],
    //   moduleOptions: {
    //     faction: {
    //       faction: FACTION.BLUE
    //     }
    //   }
    // }

    {
      key: 'combat_helicopter_1',
      position: [9.83, 0, 11.5],
      moduleDebug: {
        attack: false,
        pathfinding: false,
        patrol: false
      },
      moduleOptions: {
        faction: {
          faction: FACTION.ENEMY
        },
        weapon: {
          autoAimActive: true
        },
        patrol: {
          active: true,
          path: [
            [10.83, 11.5],
            [-9.83, 10.17]
          ]
        }
      }
    }
  ]
};
</script>
