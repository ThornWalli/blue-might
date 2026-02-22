<template>
  <div>
    <debug-app-component
      :config="{
        debug: {
          map: {
            pathfinding: false
          }
        }
      }"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type { MapDescription } from '@blue-might/app/lib/types/map';
import { WeaponSlot } from '@blue-might/app/lib/classes/WeaponSlot';
import factions, { FACTION } from '@blue-might/app/lib/utils/factions';
import { weapons } from '@blue-might/weapon';
import { defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const unitWeapons: WeaponSlot[] = [
  new WeaponSlot({ index: 0, weapon: new weapons.default() }),
  new WeaponSlot({ index: 1, weapon: new weapons.default() })
];

// const unitB = new StationaryGun_2({
//   id: 'stationary-gun-2',
//   position: new Vector3(1, 0, 1),
//   moduleOptions: {
//     weapon: {
//       weapons: unitWeapons.slice(),
//       enableAutoAim: true,
//       enableShootInterval: false,
//       shootInterval: 200
//     }
//   },
//   moduleStates: {
//     faction: {
//       faction: blueFaction
//     }
//   }
// });

const map: Partial<MapDescription> = {
  playerOptions: {
    position: [0, 0, 0],
    faction: FACTION.BLUE,
    unit: {
      key: 'turret_1',
      options: {
        moduleDebug: {
          attack: false,
          weapon: false
        },
        moduleOptions: {
          faction: {
            faction: FACTION.BLUE
          },
          weapon: {
            autoAimActive: true,
            slots: unitWeapons.slice(0, 1)
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
          key: 'tank_1',
          id: 'tank-1',
          position: [-2, 0, 0],
          rotation: [0, Math.PI / 4, 0],
          moduleOptions: {
            faction: {
              faction: FACTION.BLUE
            }
          }
        },
        {
          key: 'combat_helicopter_1',
          id: 'combat-helicopter-1',
          position: [5.5, 0, 5.5],
          moduleOptions: {
            damage: {
              maxDamage: 500
            },
            faction: {
              faction: FACTION.ENEMY
            },
            patrol: {
              active: true,
              path: [
                [1.6, 2.4],
                [-1.6, 2.4]
              ]
            }
          }
        },
        {
          key: 'combat_tank_1',
          id: 'combat-tank-1',
          position: [2, 0, 0],
          moduleOptions: {
            faction: {
              faction: FACTION.BLUE
            }
          }
        }
      ]
    }
  }
};
</script>
