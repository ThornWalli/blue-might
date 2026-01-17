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
import {
  CombatHelicopter_1,
  CombatShip_1,
  SeaLandingPortSupplyStation,
  SeaSupplyStation,
  Soldat_1
} from '@blue-might/units';
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
      position: new Vector3(-2, 0, -2),

      moduleOptions: {
        damage: {
          maxDamage: 1000
        },
        faction: {
          faction: blueFaction
        }
      }
    }),
    // new CombatShip_1({
    //   debug: false,
    //   moduleDebug: {
    //     pathfinding: true,
    //     attack: false,
    //     patrol: true
    //   },
    //   position: new Vector3(-0, 0, 9.17),

    //   moduleOptions: {
    //     patrol: {
    //       path: [
    //         [-0.17, 9.17],
    //         [-10.83, 11.83],
    //         [-11.83, -3.5],
    //         [-1.83, -1.17]
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
    ...[
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
    ].map(
      (path, index) =>
        new CombatShip_1({
          debug: false,
          id: 'combat-ship-' + index,
          moduleDebug: {
            attack: true,
            pathfinding: true,
            patrol: true
          },
          position: new Vector3(path[0]![0], 0, path[0]![1]),
          moduleOptions: {
            faction: {
              faction: enemyFaction
            },
            patrol: {
              active: true,
              path: path as [number, number][]
            }
          }
        })
    ),

    // new Tank_1({
    //   debug: true,
    //   id: 'tank-2',
    //   moduleDebug: {
    //     pathfinding: false
    //   },
    //   position: new Vector3(2.83, 0, 8.5),
    //   moduleStates: {
    //     faction: {
    //       faction: enemyFaction
    //     }
    //   }
    // }),

    new SeaLandingPortSupplyStation({
      id: 'sea-landing-port-1',
      position: new Vector3(0, 0, 0),
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    }),

    new SeaSupplyStation({
      id: 'sea-supply-station-1',
      position: new Vector3(-2.5, 0, -3.5),
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    }),

    new CombatHelicopter_1({
      moduleDebug: {
        collision: false
      },
      // position: new Vector3(-9.5, 0, -10.5),
      // position: new Vector3(0, 1.05, 0),
      // position: new Vector3(-7.51, 0, 1.48),
      position: new Vector3(0, 0, 0),
      moduleOptions: {
        damage: {
          maxDamage: Infinity
        },
        movable: {
          active: true
        },
        faction: {
          faction: blueFaction
        }
      }
    }),
    new Soldat_1({
      position: new Vector3(0.5, 0, 0.5),
      moduleDebug: {
        pathfinding: false,
        attack: false,
        patrol: false
      },
      moduleOptions: {
        faction: {
          faction: blueFaction
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
    })
  ]
};
</script>
