import { projectiles } from '@blue-might/weapon';

import type { WEAPON_SHOOT_TYPE, WeaponDescription } from '../types/weapon';

import type Projectile from './Projectile';

export default class Weapon implements WeaponDescription<Projectile> {
  id: string;
  readonly projectile: Projectile;
  spreadAmount: number;
  perSeconds: number;
  shootType: WEAPON_SHOOT_TYPE;

  constructor(options: WeaponDescription) {
    this.id = options.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.projectile = new (projectiles[options.projectile]! as any)();
    this.spreadAmount = options.spreadAmount;
    this.perSeconds = options.perSeconds;
    this.shootType = options.shootType;
  }
}
