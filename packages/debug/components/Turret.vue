<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: false } } }"
      :on-setup="onSetup"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import { Subscription } from 'rxjs';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  playerOptions: {
    position: [0, 0, 0],
    unit: {
      key: 'combat_helicopter_1',
      options: {
        moduleDebug: {
          collision: true,
          pathfinding: false,
          patrol: false
        },
        moduleOptions: {
          damage: {
            maxDamage: 1000
          },
          movable: {
            active: true
          }
        }
      }
    }
  },
  units: [
    {
      key: 'landing_port_supply_station_1',
      moduleDebug: {
        collision: false,
        supply: false
      },
      position: [0, 0, 0],
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    },
    {
      key: 'missile_launcher_1',
      position: [-2.83, 0, 2.5],
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    },
    {
      key: 'turret_1',
      position: [2.83, 0, 2.5],
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    },
    {
      key: 'turret_1',
      position: [2.83, 0, 2.5],
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    },
    {
      key: 'missile_launcher_1',
      position: [-2.83, 0, 14.83],
      moduleOptions: {
        faction: {
          faction: enemyFaction
        }
      }
    },
    {
      key: 'turret_1',
      position: [2.83, 0, 14.83],
      moduleOptions: {
        faction: {
          faction: enemyFaction
        }
      }
    }
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  console.log(app, map);
}
</script>
