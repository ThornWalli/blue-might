<template>
  <div>
    <debug-app-component
      :config="{ debug: { map: { pathfinding: false } } }"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { MapDescription } from '@blue-might/app/lib/types/map';
import factions, { FACTION } from '@blue-might/app/lib/utils/factions';
import { Subscription } from 'rxjs';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

onUnmounted(() => {
  subscription.unsubscribe();
});

const map: Partial<MapDescription> = {
  playerOptions: {
    position: [0, 0, 0],
    faction: FACTION.BLUE,
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
  moduleOptions: {
    faction: {
      factions: [factions[FACTION.BLUE], factions[FACTION.ENEMY]]
    },
    units: {
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
              faction: FACTION.BLUE
            }
          }
        },
        {
          key: 'missile_launcher_1',
          position: [-2.83, 0, 2.5],
          moduleOptions: {
            faction: {
              faction: FACTION.BLUE
            }
          }
        },
        {
          key: 'turret_1',
          position: [2.83, 0, 2.5],
          moduleOptions: {
            faction: {
              faction: FACTION.BLUE
            }
          }
        },
        {
          key: 'turret_1',
          position: [2.83, 0, 2.5],
          moduleOptions: {
            faction: {
              faction: FACTION.BLUE
            }
          }
        },
        {
          key: 'missile_launcher_1',
          position: [-2.83, 0, 14.83],
          moduleOptions: {
            faction: {
              faction: FACTION.ENEMY
            }
          }
        },
        {
          key: 'turret_1',
          position: [2.83, 0, 14.83],
          moduleOptions: {
            faction: {
              faction: FACTION.ENEMY
            }
          }
        }
      ]
    }
  }
};
</script>
