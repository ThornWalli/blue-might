import {
  PROJECTILE_KEY,
  PROJECTILE_TYPE
} from '@blue-might/app/lib/types/weapon';

import { Default, getObjectFromProjectiles } from '../abstract';

PROJECTILE_KEY.CALIBER_155_MM_HE = 'caliber_155_mm_he';
export class Caliber155MmHeProjectile extends Default {
  static override KEY = PROJECTILE_KEY.CALIBER_155_MM_HE;
  constructor() {
    super({
      type: PROJECTILE_TYPE.P155,
      id: PROJECTILE_KEY.CALIBER_155_MM_HE,
      name: 'Caliber 155mm HE Projectile',
      shortName: '155mm HE',
      description: 'A 155mm high-explosive projectile.',
      maxLifetime: 10,
      speed: 1,
      strength: 4,
      weight: 5,
      radius: 1.2
    });
  }

  override async getCaseObject() {
    return getObjectFromProjectiles('155_case');
  }

  override async getProjectileObject() {
    return getObjectFromProjectiles('155_he');
  }
}
