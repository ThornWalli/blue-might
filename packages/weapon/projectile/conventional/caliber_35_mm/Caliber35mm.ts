import {
  PROJECTILE_KEY,
  PROJECTILE_TYPE
} from '@blue-might/app/lib/types/weapon';

import { Default, getObjectFromProjectiles } from '../abstract';

PROJECTILE_KEY.CALIBER_35_MM_HE = 'caliber_35_mm_he';
export class Caliber35MmHeProjectile extends Default {
  static override KEY = PROJECTILE_KEY.CALIBER_35_MM_HE;
  constructor() {
    super({
      type: PROJECTILE_TYPE.P35,
      id: PROJECTILE_KEY.CALIBER_35_MM_HE,
      name: 'Caliber 35mm HE Projectile',
      shortName: '35mm HE',
      description: 'A 35mm high-explosive projectile.',
      maxLifetime: 1,
      speed: 20,
      strength: 0.1,
      weight: 0.01,
      radius: 0
    });
  }

  override async getCaseObject() {
    return getObjectFromProjectiles('35_case');
  }

  override async getProjectileObject() {
    return getObjectFromProjectiles('35_he');
  }
}
