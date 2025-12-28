import Weapon from '@blue-might/app/lib/classes/Weapon';

import { PROJECTILE_TYPE, WEAPON } from './../app/lib/types/weapon';
import { projectiles } from './projectile';

declare module '@blue-might/app/lib/types/weapon' {
  interface Weapon {
    DEFAULT: 'default';
    TANK: 'tank';
  }
}

WEAPON.DEFAULT = 'default';
export class Default extends Weapon {
  constructor() {
    super({
      id: WEAPON.DEFAULT,
      spreadAmount: 0.1,
      speed: 0.3,
      perSeconds: 10,
      projectile: new projectiles[PROJECTILE_TYPE.DEFAULT]()
    });
  }
}

WEAPON.TANK = 'tank';
export class Tank extends Weapon {
  constructor() {
    super({
      id: WEAPON.TANK,
      spreadAmount: 0,
      speed: 0.6,
      perSeconds: 5,
      projectile: new projectiles[PROJECTILE_TYPE.TANK]()
    });
  }
}

const weapons = {
  default: Default,
  tank: Tank
};

export { weapons };
