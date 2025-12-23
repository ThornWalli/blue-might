import { PROJECTILE_TYPE, WEAPON } from './../app/lib/types/weapon';
import { projectiles } from './projectile';
import Weapon from '@blue-might/app/lib/classes/Weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface Weapon {
    DEFAULT: 'default';
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

const weapons = {
  default: Default
};

export { weapons };
