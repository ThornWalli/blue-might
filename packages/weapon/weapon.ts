/* eslint-disable complexity */
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
    BASE_MISSILE_LAUNCHER: 'base_missile_launcher';
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
      name: 'Default Weapon',
      description: 'The default weapon.',
      spreadAmount: 0.1,
      perSeconds: getSecondsByType(projectile),
      projectile: projectile,
      shootType: WEAPON_SHOOT_TYPE.AUTO,
      shootStrength: 1
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

WEAPON.BASE_MISSILE_LAUNCHER = 'base_missile_launcher';
export class BaseMissileLauncher extends Weapon {
  constructor(options?: Partial<ConstructorParameters<typeof Weapon>[0]>) {
    super({
      id: options?.id ?? WEAPON.BASE_MISSILE_LAUNCHER,
      name: options?.name ?? 'Base Missile Launcher',
      description: options?.description ?? 'A missile launcher.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 0.25,
      projectile: options?.projectile ?? PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1,
      shootType: options?.shootType ?? WEAPON_SHOOT_TYPE.SINGLE,
      shootStrength: options?.shootStrength ?? 1
    });
  }
}

export class GatlingGun extends Weapon {
  constructor(options?: Partial<ConstructorParameters<typeof Weapon>[0]>) {
    super({
      id: options?.id ?? 'gatling_gun',
      name: options?.name ?? 'Gatling Gun',
      description: options?.description ?? 'A rapid-fire gun.',
      spreadAmount: options?.spreadAmount ?? 0.2,
      perSeconds: options?.perSeconds ?? 15,
      projectile: options?.projectile ?? PROJECTILE_TYPE.CALIBER_35_MM,
      shootType: options?.shootType ?? WEAPON_SHOOT_TYPE.AUTO,
      shootStrength: options?.shootStrength ?? 0.5
    });
  }
}
export class RapidFireGun35mm extends Weapon {
  constructor(
    options?: Partial<
      Pick<
        ConstructorParameters<typeof Weapon>[0],
        'spreadAmount' | 'perSeconds' | 'projectile'
      >
    >
  ) {
    super({
      id: 'gun_35mm',
      name: 'Gun 35mm',
      description: 'A powerful 35mm gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 5,
      projectile: options?.projectile ?? PROJECTILE_TYPE.CALIBER_35_MM,
      shootType: WEAPON_SHOOT_TYPE.AUTO,
      shootStrength: 1
    });
  }
}

export class Gun120mm extends Weapon {
  constructor(
    options?: Partial<
      Pick<
        ConstructorParameters<typeof Weapon>[0],
        'spreadAmount' | 'perSeconds' | 'projectile'
      >
    >
  ) {
    super({
      id: 'gun_120mm',
      name: 'Gun 120mm',
      description: 'A powerful 120mm gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 1,
      projectile: options?.projectile ?? PROJECTILE_TYPE.CALIBER_120_MM,
      shootType: WEAPON_SHOOT_TYPE.SINGLE,
      shootStrength: 1
    });
  }
}

const weapons = {
  default: Default,
  base_missile_launcher: BaseMissileLauncher,
  gatling_gun: GatlingGun,
  rapid_fire_gun_35mm: RapidFireGun35mm,
  gun_120mm: Gun120mm
};

export { weapons };

export type Weapons =
  | Default
  | BaseMissileLauncher
  | GatlingGun
  | RapidFireGun35mm
  | Gun120mm;
