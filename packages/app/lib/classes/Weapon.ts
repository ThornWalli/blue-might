import { projectiles } from '@blue-might/weapon';

import { WEAPON_SHOOT_TYPE, type WeaponDescription } from '../types/weapon';

import type Projectile from './Projectile';

export default class Weapon implements WeaponDescription<Projectile> {
  id: string;
  name: string;
  description?: string | null;
  readonly projectile: Projectile;
  /**
   * The amount of spread for the weapon's projectiles.
   * @default 0
   */
  spreadAmount: number = 0;
  /**
   * The number of projectiles fired per second.
   * @default 1
   */
  perSeconds: number = 1;
  /**
   * The type of shooting for the weapon.
   * @default WEAPON_SHOOT_TYPE.SINGLE
   */
  shootType: WEAPON_SHOOT_TYPE = WEAPON_SHOOT_TYPE.SINGLE;

  constructor(options: WeaponDescription) {
    this.id = options.id;
    this.name = options.name;
    this.description = options.description;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.projectile = new (projectiles[options.projectile]! as any)();
    this.spreadAmount = options.spreadAmount;
    this.perSeconds = options.perSeconds;
    this.shootType = options.shootType;
  }
}
