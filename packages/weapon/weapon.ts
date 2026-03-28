/* eslint-disable complexity */
import Weapon from '@blue-might/app/lib/classes/Weapon';

import {
  PROJECTILE_KEY,
  PROJECTILE_TYPE,
  WEAPON,
  WEAPON_SHOOT_TYPE
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
    projectile: typeof PROJECTILE_KEY.CALIBER_35_MM_HE = PROJECTILE_KEY.CALIBER_35_MM_HE
  ) {
    super({
      projectileType: PROJECTILE_TYPE.P35,
      id: WEAPON.DEFAULT,
      name: 'Default Weapon',
      description: 'The default weapon.',
      spreadAmount: 0.1,
      perSeconds: 1,
      projectile: projectile,
      shootType: WEAPON_SHOOT_TYPE.AUTO,
      shootStrength: 1
    });
  }
}

WEAPON.BASE_MISSILE_LAUNCHER = 'base_missile_launcher';
export class BaseMissileLauncher extends Weapon {
  constructor(options?: Partial<ConstructorParameters<typeof Weapon>[0]>) {
    super({
      projectileType: PROJECTILE_TYPE.MISSILE,
      id: options?.id ?? WEAPON.BASE_MISSILE_LAUNCHER,
      name: options?.name ?? 'Base Missile Launcher',
      description: options?.description ?? 'A missile launcher.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 0.25,
      projectile: options?.projectile ?? PROJECTILE_KEY.AIR_MISSILE_1,
      shootType: options?.shootType ?? WEAPON_SHOOT_TYPE.SINGLE,
      shootStrength: options?.shootStrength ?? 1
    });
  }
}

export class GatlingGun35mm extends Weapon {
  constructor(options?: Partial<ConstructorParameters<typeof Weapon>[0]>) {
    super({
      projectileType: PROJECTILE_TYPE.P35,
      id: options?.id ?? 'gatling_gun',
      name: options?.name ?? 'Gatling Gun',
      description: options?.description ?? 'A rapid-fire gun.',
      spreadAmount: options?.spreadAmount ?? 0.2,
      perSeconds: options?.perSeconds ?? 15,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_35_MM_HE,
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
      projectileType: PROJECTILE_TYPE.P35,
      id: 'gun_35mm',
      name: 'Gun 35mm',
      description: 'A powerful 35mm gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 5,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_35_MM_HE,
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
      projectileType: PROJECTILE_TYPE.P120,
      id: 'gun_120mm',
      name: 'Gun 120mm',
      description: 'A powerful 120mm gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 1,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_120_MM_HE,
      shootType: WEAPON_SHOOT_TYPE.SINGLE,
      shootStrength: 1.2
    });
  }
}

export class Gun155mm extends Weapon {
  constructor(
    options?: Partial<
      Pick<
        ConstructorParameters<typeof Weapon>[0],
        'spreadAmount' | 'perSeconds' | 'projectile'
      >
    >
  ) {
    super({
      projectileType: PROJECTILE_TYPE.P155,
      id: 'gun_155mm',
      name: 'Gun 155mm',
      description: 'A powerful 155mm gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 1,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_155_MM_HE,
      shootType: WEAPON_SHOOT_TYPE.SINGLE,
      shootStrength: 5
    });
  }
}

const weapons = {
  default: Default,
  base_missile_launcher: BaseMissileLauncher,
  gatling_gun_35mm: GatlingGun35mm,
  rapid_fire_gun_35mm: RapidFireGun35mm,
  gun_120mm: Gun120mm,
  gun_155mm: Gun155mm
};

export { weapons };

export type Weapons =
  | Default
  | BaseMissileLauncher
  | GatlingGun35mm
  | RapidFireGun35mm
  | Gun120mm
  | Gun155mm;
