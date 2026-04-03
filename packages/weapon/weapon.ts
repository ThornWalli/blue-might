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
    GUN_35MM: 'gun_35mm';
    GATLING_GUN_35MM: 'gatling_gun_35mm';
    RAPID_FIRE_GUN_35MM: 'rapid_fire_gun_35mm';
    GUN_120MM: 'gun_120mm';
    GUN_155MM: 'gun_155mm';
    BASE_MISSILE_LAUNCHER: 'base_missile_launcher';
  }
}

//#region missile

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

//#endregion

//#region gun

WEAPON.GUN_35MM = 'gun_35mm';
export class Gun35mm extends Weapon {
  constructor(options?: Partial<ConstructorParameters<typeof Weapon>[0]>) {
    super({
      projectileType: PROJECTILE_TYPE.P35,
      id: options?.id ?? WEAPON.GUN_35MM,
      name: options?.name ?? 'Gun 35mm',
      description: options?.description ?? 'A powerful 35mm gun.',
      spreadAmount: options?.spreadAmount ?? 0.1,
      perSeconds: options?.perSeconds ?? 1,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_35_MM_HE,
      shootType: options?.shootType ?? WEAPON_SHOOT_TYPE.AUTO,
      shootStrength: options?.shootStrength ?? 0.5
    });
  }
}

WEAPON.GATLING_GUN_35MM = 'gatling_gun_35mm';
export class GatlingGun35mm extends Weapon {
  constructor(options?: Partial<ConstructorParameters<typeof Weapon>[0]>) {
    super({
      projectileType: PROJECTILE_TYPE.P35,
      id: options?.id ?? WEAPON.GATLING_GUN_35MM,
      name: options?.name ?? 'Gatling Gun',
      description: options?.description ?? 'A gatling gun.',
      spreadAmount: options?.spreadAmount ?? 0.2,
      perSeconds: options?.perSeconds ?? 15,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_35_MM_HE,
      shootType: options?.shootType ?? WEAPON_SHOOT_TYPE.AUTO,
      shootStrength: options?.shootStrength ?? 0.5
    });
  }
}

WEAPON.RAPID_FIRE_GUN_35MM = 'rapid_fire_gun_35mm';
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
      id: WEAPON.RAPID_FIRE_GUN_35MM,
      name: 'Rapid Fire Gun 35mm',
      description: 'A rapid-fire gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 5,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_35_MM_HE,
      shootType: WEAPON_SHOOT_TYPE.AUTO,
      shootStrength: 1
    });
  }
}

WEAPON.GUN_120MM = 'gun_120mm';
export class Gun120mm extends Weapon {
  constructor(options?: Partial<ConstructorParameters<typeof Weapon>[0]>) {
    super({
      projectileType: PROJECTILE_TYPE.P120,
      id: WEAPON.GUN_120MM,
      name: 'Gun 120mm',
      description: 'A powerful 120mm gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 1,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_120_MM_HE,
      shootType: options?.shootType ?? WEAPON_SHOOT_TYPE.SINGLE,
      shootStrength: options?.shootStrength ?? 1.2
    });
  }
}

WEAPON.GUN_155MM = 'gun_155mm';
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
      id: WEAPON.GUN_155MM,
      name: 'Gun 155mm',
      description: 'A powerful 155mm gun.',
      spreadAmount: options?.spreadAmount ?? 0,
      perSeconds: options?.perSeconds ?? 0.25,
      projectile: options?.projectile ?? PROJECTILE_KEY.CALIBER_155_MM_HE,
      shootType: WEAPON_SHOOT_TYPE.SINGLE,
      shootStrength: 20
    });
  }
}

//#endregion

const weapons = {
  [WEAPON.BASE_MISSILE_LAUNCHER]: BaseMissileLauncher,
  [WEAPON.GUN_35MM]: Gun35mm,
  [WEAPON.GATLING_GUN_35MM]: GatlingGun35mm,
  [WEAPON.RAPID_FIRE_GUN_35MM]: RapidFireGun35mm,
  [WEAPON.GUN_120MM]: Gun120mm,
  [WEAPON.GUN_155MM]: Gun155mm
};

export { weapons };

export type Weapons =
  | BaseMissileLauncher
  | Gun35mm
  | GatlingGun35mm
  | RapidFireGun35mm
  | Gun120mm
  | Gun155mm;
