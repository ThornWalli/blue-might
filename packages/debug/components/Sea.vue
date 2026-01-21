<template>
  <div>
    <debug-app-component map-type="sea" :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import factions, { FACTION } from '@blue-might/app/lib/utils/factions';
import type { UnitDescriptions } from '@blue-might/units';
import { Subscription } from 'rxjs';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const map: Partial<MapDescription> = {
  factions: [factions[FACTION.BLUE], factions[FACTION.ENEMY]],
  playerOptions: {
    position: [-2, 0, 0],
    faction: FACTION.BLUE,
    unit: {
      key: 'combat_ship_1',
      options: {
        moduleDebug: {
          pathfinding: false,
          attack: false
        }
      }
    }
  },
  debug: {
    pathfinding: false
  },
  units: [
    ...([
      [
        [7.86, -10.3],
        [10.59, 9.39]
      ],
      [
        [13.67, -2.9],
        [3.88, -12.44]
      ],
      [
        [13.2, 12.43],
        [-2.35, 13.66]
      ]
    ].map((path, index) => ({
      key: 'combat_ship_1',
      debug: false,
      id: 'combat-ship-' + index,
      moduleDebug: {
        attack: true,
        pathfinding: true,
        patrol: true
      },
      position: [path[0]![0], 0, path[0]![1]],
      moduleOptions: {
        faction: {
          faction: FACTION.ENEMY
        },
        patrol: {
          active: true,
          path: path as [number, number][]
        }
      }
    })) as UnitDescriptions[]),

    {
      key: 'sea_landing_port_supply_station_1',
      id: 'sea-landing-port-1',
      position: [0, 0, 0],
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        }
      }
    },

    {
      key: 'sea_supply_station_1',
      position: [-2.5, 0, -3.5],
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        }
      }
    },

    {
      key: 'combat_helicopter_1',
      position: [0, 0, 0],
      moduleDebug: {
        collision: false
      },
      // position: new Vector3(-9.5, 0, -10.5),
      // position: new Vector3(0, 1.05, 0),
      // position: new Vector3(-7.51, 0, 1.48),
      moduleOptions: {
        damage: {
          maxDamage: Infinity
        },
        movable: {
          active: true
        },
        faction: {
          faction: FACTION.BLUE
        }
      }
    },
    {
      key: 'soldat_1',
      position: [0.5, 0, 0.5],
      moduleDebug: {
        pathfinding: false,
        attack: false,
        patrol: false
      },
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        },
        patrol: {
          active: true,
          path: [
            [0.5, 0.5],
            [-0.5, 0.5],
            [-0.5, -0.5],
            [0.5, -0.5]
          ]
        }
      }
    }
  ]
};
</script>
