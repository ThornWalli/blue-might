<template>
  <div>
    <debug-app-component
      :config="config"
      :on-setup="onSetup"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { AppConfig } from '@blue-might/app/lib/classes/App';
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import {
  CombatHelicopter_1,
  Soldat_1,
  Tank_1,
  Tree_1
} from '@blue-might/units';
import { Subscription } from 'rxjs';
import { Euler, Vector3 } from 'three';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'tank-1';

const config: Partial<AppConfig> = {
  debug: {
    map: { pathfinding: true }
  }
};

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  units: [
    new Tree_1({
      id: 'tree-1',
      position: new Vector3(-0.17, 0, 2.5),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        collision: true
      }
    }),
    new Tree_1({
      id: 'tree-2',
      position: new Vector3(-0.17, 0, -2.5),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        collision: true
      }
    }),
    new Tree_1({
      id: 'tree-3',
      position: new Vector3(2.83, 0, 2.5),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        collision: true
      }
    }),
    new Tree_1({
      id: 'tree-4',
      position: new Vector3(-2.83, 0, 2.5),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        collision: true
      }
    }),
    new Tree_1({
      id: 'tree-5',
      position: new Vector3(2.83, 0, -2.5),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        collision: true
      }
    }),
    new Tree_1({
      id: 'tree-6',
      position: new Vector3(-2.83, 0, -2.5),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        collision: true
      }
    }),

    new CombatHelicopter_1({
      id: 'combat-helicopter-1',
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      position: new Vector3(2, 0, 0),
      moduleOptions: {
        patrol: {
          path: [
            [4.17, -4.17],
            [4.17, 4.17],
            [-4.17, 4.17],
            [-4.17, -4.17]
          ]
        }
      },
      moduleStates: {
        faction: {
          faction: blueFaction
        },
        movable: {
          active: true
        },
        patrol: {
          active: true
        }
      }
    }),

    new Tank_1({
      id: 'tank-1',
      position: new Vector3(0.5, 0, -0.17),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      moduleOptions: {
        patrol: {
          path: [
            [3.83, 1.17],
            [3.83, 3.83],
            [-3.83, 3.83],
            [-3.83, 1.17]
          ]
        }
      },
      moduleStates: {
        faction: {
          faction: blueFaction
        },
        movable: {
          active: false
        },
        patrol: {
          active: true
        }
      }
    }),
    new Tank_1({
      id: 'tank-2',
      position: new Vector3(-0.5, 0, -0.17),
      rotation: new Euler(0, Math.PI, 0),
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      moduleOptions: {
        patrol: {
          path: [
            [-3.83, -1.17],
            [-3.83, -3.83],
            [3.83, -3.83],
            [3.83, -1.17]
          ]
        }
      },
      moduleStates: {
        faction: {
          faction: blueFaction
        },
        movable: {
          active: false
        },
        patrol: {
          active: true
        }
      }
    }),
    ...Array(5)
      .fill(null)
      .map((_, i) => {
        return new Soldat_1({
          id: `soldat-${i + 1}`,
          position: new Vector3(1 + i * 0.2, 0, 1),
          rotation: new Euler(0, 0, 0),

          moduleDebug: {
            pathfinding: true
          },
          moduleOptions: {
            patrol: {
              path: [
                [3.17, 1.17],
                [3.17, -1.17],
                [-3.17, -1.17],
                [-3.17, 1.17]
              ]
            }
          },
          moduleStates: {
            faction: {
              faction: blueFaction
            },
            patrol: {
              active: true
            }
          }
        });
      }),
    ...Array(5)
      .fill(null)
      .map((_, i) => {
        return new Soldat_1({
          id: `soldat-${i + 1}`,
          position: new Vector3(-1 + i * -0.2, 0, 1),
          rotation: new Euler(0, 0, 0),

          moduleOptions: {
            patrol: {
              path: [
                [-3.17, 1.17],
                [-3.17, -1.17],
                [3.17, -1.17],
                [3.17, 1.17]
              ]
            }
          },
          moduleStates: {
            faction: {
              faction: blueFaction
            },
            patrol: {
              active: true
            }
          }
        });
      })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
