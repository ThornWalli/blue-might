<template>
  <div>
    <debug-app-component :config="config" :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { AppConfig } from '@blue-might/app/lib/classes/App';
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

const config: Partial<AppConfig> = {
  debug: {
    map: { pathfinding: false }
  }
};

const map: Partial<MapDescription> = {
  playerOptions: {
    position: [0.5, 0, -0.17],
    rotation: [0, 0, 0],
    faction: FACTION.BLUE,
    unit: {
      key: 'tank_1',
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        },
        movable: {
          active: false
        },
        patrol: {
          active: true,
          path: [
            [3.83, 1.17],
            [3.83, 3.83],
            [-3.83, 3.83],
            [-3.83, 1.17]
          ]
        }
      }
    }
  },
  factions: [factions[FACTION.BLUE], factions[FACTION.ENEMY]],
  units: [
    {
      key: 'tree_1',

      position: [-0.17, 0, 2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },
    {
      key: 'tree_1',

      position: [-0.17, 0, -2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },
    {
      key: 'tree_1',

      position: [2.83, 0, 2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },
    {
      key: 'tree_1',

      position: [-2.83, 0, 2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },
    {
      key: 'tree_1',

      position: [-2.83, 0, 2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },
    {
      key: 'tree_1',

      position: [2.83, 0, -2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },
    {
      key: 'tree_1',

      position: [2.83, 0, -2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },
    {
      key: 'tree_1',

      position: [-2.83, 0, -2.5],
      rotation: [0, 0, 0],
      moduleDebug: {
        collision: true
      }
    },

    {
      key: 'combat_helicopter_1',
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      position: [2, 0, 0],
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        },
        movable: {
          active: true
        },
        patrol: {
          active: true,
          path: [
            [4.17, -4.17],
            [4.17, 4.17],
            [-4.17, 4.17],
            [-4.17, -4.17]
          ]
        }
      }
    },
    {
      key: 'tank_1',
      position: [-0.5, 0, -0.17],
      rotation: [0, Math.PI, 0],
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      moduleOptions: {
        faction: {
          faction: FACTION.BLUE
        },
        movable: {
          active: false
        },
        patrol: {
          active: true,
          path: [
            [-3.83, -1.17],
            [-3.83, -3.83],
            [3.83, -3.83],
            [3.83, -1.17]
          ]
        }
      }
    },
    ...(Array(5)
      .fill(null)
      .map((_, i) => {
        return {
          key: 'soldat_1',
          id: `soldat-1-${i + 1}`,
          position: [1 + i * 0.2, 0, 1],
          rotation: [0, 0, 0],

          moduleDebug: {
            pathfinding: true
          },
          moduleOptions: {
            faction: {
              faction: FACTION.BLUE
            },
            patrol: {
              active: true,
              path: [
                [3.17, 1.17],
                [3.17, -1.17],
                [-3.17, -1.17],
                [-3.17, 1.17]
              ]
            }
          }
        };
      }) as UnitDescriptions[]),
    ...(Array(5)
      .fill(null)
      .map((_, i) => {
        return {
          key: 'soldat_1',
          id: `soldat-2-${i + 1}`,
          position: [-1 + i * -0.2, 0, 1],
          rotation: [0, 0, 0],

          moduleOptions: {
            faction: {
              faction: FACTION.BLUE
            },
            patrol: {
              active: true,
              path: [
                [-3.17, 1.17],
                [-3.17, -1.17],
                [3.17, -1.17],
                [3.17, 1.17]
              ]
            }
          }
        };
      }) as UnitDescriptions[])
  ]
};
</script>
