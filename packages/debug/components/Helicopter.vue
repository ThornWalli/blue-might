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
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),

    new CombatHelicopter_1({
      position: new Vector3(9.83, 0, 11.5),
      moduleDebug: {
        attack: true,
        pathfinding: true,
        patrol: true
      },
      moduleOptions: {
        attack: {
          followTarget: true
        },
        patrol: {
          path: [
            [10.83, 11.5],
            [-9.83, 10.17]
          ]
        }
      },
      moduleStates: {
        weapon: {
          autoAimActive: true
        },
        patrol: {
          active: true
        },
        faction: {
          faction: enemyFaction
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
        patrol: {
          path: [
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
        patrol: {
          active: false
        },
        movable: {
          active: true
        }
      }
    }),

    new Tank_1({
      id: 'tank-1',
      position: new Vector3(1, 0, 2),
      rotation: undefined,
      moduleStates: {
        faction: {
          faction: enemyFaction
        }
      }
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
