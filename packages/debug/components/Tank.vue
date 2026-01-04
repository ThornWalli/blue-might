<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: true } } }"
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
  CombatTank_1,
  LandingPortSupplyStation,
  SupplyStation,
  Tank_1
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

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  units: [
    new Tank_1({
      position: new Vector3(-1.83, 0, 0.17),
      rotation: new Euler(0, Math.PI / 4, 0),
      moduleStates: {
        faction: {
          faction: enemyFaction
        }
      }
    }),
    new CombatTank_1({
      id: 'tank-1',
      position: new Vector3(0, 0, 0),
      moduleDebug: {
        pathfinding: false,
        patrol: false
      },
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
        patrol: {
          active: false
        },
        movable: {
          active: true
        }
      }
    }),
    new SupplyStation({
      position: new Vector3(2, 0, 2),
      rotation: new Euler(0, Math.PI, 0),
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new LandingPortSupplyStation({
      position: new Vector3(-2, 0, 2),
      rotation: new Euler(0, Math.PI, 0),
      moduleDebug: {
        collision: false,
        supply: false
      },
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
