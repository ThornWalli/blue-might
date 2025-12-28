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
import { CombatHelicopter_1, LandingPort_1, Tank_1 } from '@blue-might/units';
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
    new LandingPort_1({
      position: new Vector3(0, 0, 0)
    }),
    new CombatHelicopter_1({
      debug: false,
      id: 'combat-helicopter-1',
      position: new Vector3(0, 0, 0),
      moduleDebug: {
        attack: false,
        pathfinding: false,
        patrol: false,
        gun: false
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
        damage: {
          damage: 0.4
        },
        gun: {
          autoAimActive: true,
          autoAimAutoShoot: false
        },
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
