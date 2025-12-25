<template>
  <div>
    <debug-app-component
      :on-setup="onSetup"
      :player-unit="playerUnitId"
      :map="map" />
  </div>
</template>

<script setup lang="ts">
import type App from '@blue-might/app/lib/classes/App';
import Faction from '@blue-might/app/lib/classes/Faction';
import type Map from '@blue-might/app/lib/classes/Map';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import type Weapon from '@blue-might/app/lib/classes/Weapon';

import {
  BlueMight,
  LandingPort_1,
  StationaryGun_1,
  StationaryGun_2,
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

const unitWeapons: Weapon[] = [new weapons.default(), new weapons.default()];

const unitA = new StationaryGun_1({
  id: 'stationary-gun-1',
  position: new Vector3(0, 0, 0),
  moduleDebug: {
    collision: true
  },
  moduleOptions: {
    gun: {
      weapons: unitWeapons.slice(0, 1),
      enableAutoAim: true,
      enableShootInterval: false,
      shootInterval: 200
    }
  },
  moduleStates: {
    faction: {
      faction: blueFaction
    }
  }
});

const unitB = new StationaryGun_2({
  id: 'stationary-gun-2',
  position: new Vector3(1, 0, 1),
  moduleDebug: {
    collision: true
  },
  moduleOptions: {
    gun: {
      weapons: unitWeapons.slice(),
      enableAutoAim: true,
      enableShootInterval: false,
      shootInterval: 200
    }
  },
  moduleStates: {
    faction: {
      faction: blueFaction
    }
  }
});

const playerUnitId = 'stationary-gun-1';

const map: Partial<MapDescription> = {
  factions: [blueFaction, enemyFaction],
  units: [
    unitA,
    unitB,

    new LandingPort_1({
      position: new Vector3(0, 0, 2)
    }),
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(-2, 0, 0),
      rotation: new Euler(0, Math.PI / 4, 0)
    }),
    new BlueMight({
      id: 'blue-might-1',
      position: new Vector3(2, 0, 0)
    })
  ]
};

async function onSetup({ app, map }: { app: App; map: Map }) {
  setupGUI({ app, map, weapons: unitWeapons });
}

function setupGUI({
  app: _app,
  map,
  weapons
}: {
  app: App;
  map: Map;
  weapons: Weapon[];
}) {
  const weapon = unitA.modules.gun.getWeapon(0)!;

  gui = new GUI();
  gui.add(unitA.modules.gun.options, 'enableAutoAim').name('Enable Auto Aim');

  // gui.add(weapon, 'enableShootInterval').name('Enable Shoot Interval');
  // gui.add(unit.modules.gun.options, 'shootInterval', 0, 2000, 1);

  const dustConeOptions = map.modules.shoot.getDustConeOptions();
  const dustConeDir = gui.addFolder('Dust Cone');
  dustConeDir.add(dustConeOptions, 'scale', 0.01, 1, 0.005).name('Scale');
  dustConeDir
    .add(dustConeOptions, 'scaleSpeed', 0.01, 1, 0.005)
    .name('Scale Speed');
  dustConeDir
    .add(dustConeOptions, 'ditherThreshold', 0.01, 10, 0.01)
    .name('Dither Threshold');
  dustConeDir.add(dustConeOptions.size, 'x', 0.01, 2, 0.01).name('Cone Width');
  dustConeDir.add(dustConeOptions.size, 'y', 0.01, 6, 0.1).name('Cone Height');
  dustConeDir
    .add(dustConeOptions, 'circleOpacity', 0, 1, 0.1)
    .name('Circle Opacity');

  const weaponDir = gui.addFolder('Weapon');
  weaponDir.add(weapon, 'spreadAmount', 0, 0.5, 0.01).name('Spread Amount (%)');
  weaponDir.add(weapon, 'perSeconds', 1, 60, 1).name('Shots Per Second');
  const projectileDir = weaponDir.addFolder('Projectile');
  projectileDir
    .add(weapons[0]!.projectile, 'speed', 0, 1, 0.01)
    .name('Speed (%)')
    .onChange(() => {
      weapons[1]!.projectile.speed = weapons[0]!.projectile.speed;
    });
}
</script>
