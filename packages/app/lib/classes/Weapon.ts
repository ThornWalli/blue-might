import { projectiles } from '@blue-might/weapon';

import type { WeaponDescription } from '../types/weapon';

import type Projectile from './Projectile';

export default class Weapon implements WeaponDescription<Projectile> {
  id: string;
  readonly projectile: Projectile;
  spreadAmount: number;
  speed: number;
  perSeconds: number;

  constructor(options: WeaponDescription) {
    this.id = options.id;
    this.projectile = new projectiles[options.projectile]!();
    this.spreadAmount = options.spreadAmount;
    this.speed = options.speed;
    this.perSeconds = options.perSeconds;
  }
}
