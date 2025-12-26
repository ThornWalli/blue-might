import type { WeaponDescription } from '../types/weapon';

import Projectile from './Projectile';

export default class Weapon implements WeaponDescription {
  id: string;
  projectile: Projectile;
  spreadAmount: number;
  speed: number;
  perSeconds: number;

  constructor(options: WeaponDescription) {
    this.id = options.id;
    this.projectile = new Projectile(options.projectile);
    this.spreadAmount = options.spreadAmount;
    this.speed = options.speed;
    this.perSeconds = options.perSeconds;
  }
}
