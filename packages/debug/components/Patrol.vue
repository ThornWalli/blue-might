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
import Faction from '@blue-might/app/lib/classes/Faction';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';

import { BlueMight, Soldat_1, Tank_1, Tree_1 } from '@blue-might/units';
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

const blueFaction = new Faction({
  id: 'blue-faction',
  name: 'Blue Faction',
  colors: [0x0055aa, 0xcccccc]
});
const enemyFaction = new Faction({
  id: 'enemy-faction',
  name: 'Enemy Faction',
  colors: [0x205010, 0xa0b0a0]
});

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  units: [
    new Tree_1({
      id: 'tree-1',
      position: new Vector3(-0.17, 0, 2.83),
      rotation: new Euler(0, 0, 0)
    }),

    new BlueMight({
      id: 'blue-might-1',
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      position: new Vector3(2, 0, 0),
      moduleOptions: {
        patrol: {
          path: [
            // [2.83, 4.5],
            // [-2.83, 4.5]

            [4.83, 5.17],
            [-4.5, 5.17],
            [-4.17, -1.5],
            [3.5, -1.83]
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
      position: new Vector3(0, 0, 0),
      rotation: new Euler(0, 0, 0),
      moduleDebug: {
        pathfinding: true,
        patrol: true
      },
      moduleOptions: {
        patrol: {
          path: [
            [2.83, 2.83],
            [-2.83, 2.83],
            [-2.83, 1.5],
            [2.83, 1.5]
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
                [2.83, 0.5],
                [-2.83, 0.5]
              ]
            }
          },
          moduleStates: {
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
                [-2.83, 0.5],
                [2.83, 0.5]
              ]
            }
          },
          moduleStates: {
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
