import Weapon from '@blue-might/app/lib/classes/Weapon';
import type { Values } from '@blue-might/app/types';

import {
  PROJECTILE_TYPE,
  WEAPON,
  WEAPON_SHOOT_TYPE,
  type ProjectileTypes
} from './../app/lib/types/weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface Weapon {
    DEFAULT: 'default';
    AIR_SURFACE_MISSILE_1: 'air_surface_missile_1';
  }
}

WEAPON.DEFAULT = 'default';
export class Default extends Weapon {
  constructor(
    projectile:
      | typeof PROJECTILE_TYPE.DEFAULT
      | typeof PROJECTILE_TYPE.LIGHT_PROJECTILE
      | typeof PROJECTILE_TYPE.MEDIUM_PROJECTILE
      | typeof PROJECTILE_TYPE.HEAVY_PROJECTILE = PROJECTILE_TYPE.DEFAULT
  ) {
    super({
      id: WEAPON.DEFAULT,
      spreadAmount: 0.1,
      perSeconds: getSecondsByType(projectile),
      projectile: projectile,
      shootType: WEAPON_SHOOT_TYPE.AUTO
    });
  }
}

function getSecondsByType(type: Values<ProjectileTypes>): number {
  switch (type) {
    case PROJECTILE_TYPE.LIGHT_PROJECTILE:
      return 3;
    case PROJECTILE_TYPE.MEDIUM_PROJECTILE:
      return 2;
    case PROJECTILE_TYPE.HEAVY_PROJECTILE:
      return 5;
    default:
      return 4;
  }
}

WEAPON.AIR_SURFACE_MISSILE_1 = 'air_surface_missile_1';
export class AirSurfaceMissile_1 extends Weapon {
  constructor() {
    super({
      id: WEAPON.AIR_SURFACE_MISSILE_1,
      spreadAmount: 0,
      perSeconds: 0.5,
      projectile: PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1,
      shootType: WEAPON_SHOOT_TYPE.SINGLE
    });
  }
}

const weapons = {
  default: Default,
  air_surface_missile_1: AirSurfaceMissile_1
};

export { weapons };
