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
      :on-setup="onSetup"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { WeaponSlot } from '@blue-might/app/lib/classes/WeaponSlot';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import {
  CombatHelicopter_1,
  CombatTank_1,
  Turret_1,
  Tank_1
} from '@blue-might/units';
import { weapons } from '@blue-might/weapon';
import { Subscription } from 'rxjs';
import { Euler, Vector3 } from 'three';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { onUnmounted, defineAsyncComponent } from 'vue';

const DebugAppComponent = defineAsyncComponent(() => import('./DebugApp.vue'));

const subscription = new Subscription();

let gui: GUI;

onUnmounted(() => {
  subscription.unsubscribe();
  if (gui) gui.destroy();
});

const unitWeapons: WeaponSlot[] = [
  new WeaponSlot({ index: 0, weapon: new weapons.default() }),
  new WeaponSlot({ index: 1, weapon: new weapons.default() })
];

const unitA = new Turret_1({
  id: 'turret-1',
  position: new Vector3(0, 0, 0),
  moduleDebug: {
    attack: false,
    weapon: false
  },
  moduleOptions: {
    faction: {
      faction: blueFaction
    },
    weapon: {
      autoAimActive: true,
      slots: unitWeapons.slice(0, 1)
    }
  }
});

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

const playerUnitId = 'turret-1';

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  units: [
    unitA,
    // unitB,

    // new LandingPort_1({
    //   position: new Vector3(0, 0, 2)
    // }),
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(-2, 0, 0),
      rotation: new Euler(0, Math.PI / 4, 0),
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new CombatHelicopter_1({
      id: 'combat-helicopter-1',
      // position: new Vector3(2, 0, 0),
      position: new Vector3(5.5, 0, 5.5),
      moduleOptions: {
        damage: {
          maxDamage: 500
        },
        faction: {
          faction: enemyFaction
        },
        patrol: {
          active: true,
          path: [
            [1.6, 2.4],
            [-1.6, 2.4]
          ]
        }
      }
    }),
    new CombatTank_1({
      id: 'combat-tank-1',
      position: new Vector3(2, 0, 0),
      moduleOptions: {
        faction: {
          faction: blueFaction
        }
      }
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  setupGUI({ app, map, weapons: unitWeapons });
}

function setupGUI({
  app: _app,
  weapons
}: {
  app: App;
  map: Map;
  weapons: WeaponSlot[];
}) {
  const weaponSlot = unitA.modules.weapon.getSlot(0)!;

  gui = new GUI();

  gui.add(unitA.modules.weapon.state, 'autoAimActive').name('Enable Auto Aim');

  // gui.add(weapon, 'enableShootInterval').name('Enable Shoot Interval');
  // gui.add(unit.modules.weapon.options, 'shootInterval', 0, 2000, 1);
  const weaponDir = gui.addFolder('Weapon');
  weaponDir
    .add(weaponSlot.weapon, 'spreadAmount', 0, 0.5, 0.01)
    .name('Spread Amount (%)');
  weaponDir
    .add(weaponSlot.weapon, 'perSeconds', 1, 60, 1)
    .name('Shots Per Second');
  const projectileDir = weaponDir.addFolder('Projectile');
  projectileDir
    .add(weapons[0]!.weapon.projectile, 'speed', 0, 1, 0.01)
    .name('Speed (%)')
    .onChange(() => {
      weapons[1]!.weapon.projectile.speed = weapons[0]!.weapon.projectile.speed;
    });
}
</script>
