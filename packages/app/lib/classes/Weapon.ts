import { projectiles } from '@blue-might/weapon';

import type { WEAPON_SHOOT_TYPE, WeaponDescription } from '../types/weapon';

import type Projectile from './Projectile';

export default class Weapon implements WeaponDescription<Projectile> {
  id: string;
  readonly projectile: Projectile;
  spreadAmount: number;
  speed: number;
  perSeconds: number;
  shootType: WEAPON_SHOOT_TYPE;

  constructor(options: WeaponDescription) {
    this.id = options.id;
    this.projectile = new projectiles[options.projectile]!();
    this.spreadAmount = options.spreadAmount;
    this.speed = options.speed;
    this.perSeconds = options.perSeconds;
    this.shootType = options.shootType;
  }
}
