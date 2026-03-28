import {
  PROJECTILE_KEY,
  PROJECTILE_TYPE
} from '@blue-might/app/lib/types/weapon';

import { Default, getObjectFromProjectiles } from '../abstract';

PROJECTILE_KEY.CALIBER_120_MM_HE = 'caliber_120_mm_he';
export class Caliber120MmHeProjectile extends Default {
  static override KEY = PROJECTILE_KEY.CALIBER_120_MM_HE;
  constructor() {
    super({
      type: PROJECTILE_TYPE.P120,
      id: PROJECTILE_KEY.CALIBER_120_MM_HE,
      name: 'Caliber 120mm HE Projectile',
      shortName: '120mm HE',
      description: 'A 120mm high-explosive projectile.',
      maxLifetime: 3,
      speed: 10,
      strength: 0.8,
      weight: 0.5,
      radius: 0
    });
  }

  override async getCaseObject() {
    return getObjectFromProjectiles('120_case');
  }

  override async getProjectileObject() {
    return getObjectFromProjectiles('120_he');
  }
}

PROJECTILE_KEY.CALIBER_120_MM_HEAT_MP = 'caliber_120_mm_heat_mp';
export class Caliber120MmHeatMpProjectile extends Default {
  static override KEY = PROJECTILE_KEY.CALIBER_120_MM_HEAT_MP;
  constructor() {
    super({
      type: PROJECTILE_TYPE.P120,
      id: PROJECTILE_KEY.CALIBER_120_MM_HEAT_MP,
      name: 'Caliber 120mm HEAT MP Projectile',
      shortName: '120mm HEAT MP',
      description: 'A 120mm high-explosive anti-tank multi-purpose projectile.',
      maxLifetime: 3,
      speed: 10,
      strength: 1,
      weight: 0.8,
      radius: 0
    });
  }

  override async getCaseObject() {
    return getObjectFromProjectiles('120_case');
  }

  override async getProjectileObject() {
    return getObjectFromProjectiles('120_heat_mp');
  }
}

PROJECTILE_KEY.CALIBER_120_MM_APFSDS = 'caliber_120_mm_apfsds';
export class Caliber120MmApfsdsProjectile extends Default {
  static override KEY = PROJECTILE_KEY.CALIBER_120_MM_APFSDS;
  constructor() {
    super({
      type: PROJECTILE_TYPE.P120,
      id: PROJECTILE_KEY.CALIBER_120_MM_APFSDS,
      name: 'Caliber 120mm APFSDS Projectile',
      shortName: '120mm APFSDS',
      description:
        'A 120mm armor-piercing fin-stabilized discarding sabot projectile.',
      maxLifetime: 3,
      speed: 10,
      strength: 1.2,
      weight: 1,
      radius: 0
    });
  }

  override async getCaseObject() {
    return getObjectFromProjectiles('120_case');
  }

  override async getProjectileObject() {
    return getObjectFromProjectiles('120_apfsds');
  }
}
