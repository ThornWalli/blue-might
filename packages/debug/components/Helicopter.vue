<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: false } } }"
      :on-setup="onSetup"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import {
  CombatHelicopter_1,
  LandingPortSupplyStation,
  RocketLauncher_1,
  Tank_1
} from '@blue-might/units';
import { Subscription } from 'rxjs';
import { Vector3 } from 'three';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const playerUnitId = 'combat-helicopter-1';

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  units: [
    new LandingPortSupplyStation({
      moduleDebug: {
        collision: false,
        supply: false
      },
      position: new Vector3(0, 0, 0),
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    }),

    new CombatHelicopter_1({
      position: new Vector3(9.83, 0, 11.5),
      moduleDebug: {
        attack: false,
        pathfinding: false,
        patrol: false
      },
      moduleOptions: {
        faction: {
          faction: enemyFaction
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
    }),

    new CombatHelicopter_1({
      id: playerUnitId,
      debug: false,
      position: new Vector3(0, 0, 0),
      moduleDebug: {
        attack: false,
        pathfinding: false,
        patrol: false
      },
      moduleOptions: {
        faction: {
          faction: blueFaction
        },
        movable: {
          active: true
        },
        patrol: {
          path: [
            [4.83, 5.17],
            [-4.5, 5.17],
            [-4.17, -1.5],
            [3.5, -1.83]
          ]
        }
      }
    }),

    new Tank_1({
      id: 'tank-1',
      position: new Vector3(1, 0, 2),
      rotation: undefined,
      moduleOptions: {
        faction: {
          faction: enemyFaction
        }
      }
    }),

    new RocketLauncher_1({
      position: new Vector3(-2.83, 0, 2.5),
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    })
    // new Turret_1({
    //   position: new Vector3(-0.17, 0, 9.17),
    //   moduleOptions: {
    //     faction: {
    //       faction: blueFaction
    //     }
    //   }
    // })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
