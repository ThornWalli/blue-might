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
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import PathfindingModule from '@blue-might/app/lib/classes/mapModule/Pathfinding';
import GroundVehicleUnitModule from '@blue-might/app/lib/classes/unitModule/movable/GroundVehicle';
import PathfindingUnitModule from '@blue-might/app/lib/classes/unitModule/Pathfinding';
import PatrolUnitModule from '@blue-might/app/lib/classes/unitModule/Patrol';
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

const config = {
  debug: {
    map: { [PathfindingModule.TYPE]: true }
  }
};
const map: Partial<MapDescription> = {
  units: [
    new Tree_1({
      id: 'tree-1',
      position: new Vector3(-0.17, 0, 2.83),
      rotation: new Euler(0, 0, 0)
    }),

    new BlueMight({
      id: 'blue-might-1',
      debug: {
        [PathfindingUnitModule.TYPE]: true,
        [PatrolUnitModule.TYPE]: true
      },
      position: new Vector3(2, 0, 0),
      moduleOptions: {
        [PatrolUnitModule.TYPE]: {
          path: [
            [2.83, 4.5],
            [-2.83, 4.5]
          ]
        }
      },
      moduleStates: {
        [GroundVehicleUnitModule.TYPE]: {
          active: false
        },
        [PatrolUnitModule.TYPE]: {
          active: true
        }
      }
    }),
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(0, 0, 0),
      rotation: new Euler(0, 0, 0),
      debug: {
        [PathfindingUnitModule.TYPE]: true,
        [PatrolUnitModule.TYPE]: true
      },
      moduleOptions: {
        [PatrolUnitModule.TYPE]: {
          path: [
            [2.83, 2.83],
            [-2.83, 2.83],
            [-2.83, 1.5],
            [2.83, 1.5]
          ]
        }
      },
      moduleStates: {
        [GroundVehicleUnitModule.TYPE]: {
          active: false
        },
        [PatrolUnitModule.TYPE]: {
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

          debug: {
            [PathfindingUnitModule.TYPE]: true
          },
          moduleOptions: {
            [PatrolUnitModule.TYPE]: {
              path: [
                [2.83, 0.5],
                [-2.83, 0.5]
              ]
            }
          },
          moduleStates: {
            [PatrolUnitModule.TYPE]: {
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
            [PatrolUnitModule.TYPE]: {
              path: [
                [-2.83, 0.5],
                [2.83, 0.5]
              ]
            }
          },
          moduleStates: {
            [PatrolUnitModule.TYPE]: {
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
