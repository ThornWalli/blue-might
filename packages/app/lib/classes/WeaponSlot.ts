import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

import type Weapon from './Weapon';

export interface WeaponSlotDescription {
  active?: boolean;
  projectileTypes?: PROJECTILE_TYPE[];
  weapon: Weapon;
  ammunition?: number;
  maxAmmunition?: number;
  parallel?: boolean;
  revert?: boolean;
}

function getMaxAmmunitionByProjectile(type: PROJECTILE_TYPE) {
  switch (type) {
    case PROJECTILE_TYPE.P155:
      return 20;
    case PROJECTILE_TYPE.P120:
      return 50;
    case PROJECTILE_TYPE.P35:
      return 200;
    case PROJECTILE_TYPE.MISSILE:
      return 4;
    default:
      return 0;
  }
}

export type WeaponSlotIndex = number;
export class WeaponSlot implements WeaponSlotDescription {
  index: WeaponSlotIndex;
  /**
   * Whether this slot is currently active.
   * @default true
   */
  active: boolean = true;
  /**
   * The weapon assigned to this slot.
   */
  weapon: Weapon;
  /**
   * The current amount of ammunition in this slot.
   * @default 100
   */
  ammunition: number;
  /**
   * The maximum amount of ammunition this slot can hold.
   * @default 100
   */
  maxAmmunition: number;
  /**
   * Whether this slot can fire its weapon in parallel with other slots.
   * @default false
   */
  parallel: boolean = false;
  /**
   * Whether this slot should revert to its previous state after firing.
   * @default false
   */
  revert: boolean = false;
  projectileTypes: PROJECTILE_TYPE[];

  constructor({
    active,
    projectileTypes,
    index,
    weapon,
    ammunition,
    maxAmmunition,
    parallel,
    revert
  }: WeaponSlotDescription & { index: number }) {
    this.active = active ?? this.active;
    this.projectileTypes = projectileTypes ?? [];
    this.index = index;
    this.weapon = weapon;
    this.maxAmmunition =
      maxAmmunition ?? getMaxAmmunitionByProjectile(this.weapon.projectileType);
    this.ammunition = ammunition ?? this.maxAmmunition;
    this.parallel = parallel ?? this.parallel;
    this.revert = revert ?? this.revert;
  }

  destroy() {
    // implement destruction logic
  }

  setWeapon(weapon: Weapon) {
    this.weapon = weapon;
    this.maxAmmunition = Math.max(
      this.maxAmmunition,
      getMaxAmmunitionByProjectile(this.weapon.projectileType)
    );
  }

  getProjectileTypes() {
    return Array.from(
      new Set([this.weapon.projectileType].concat(this.projectileTypes))
    );
  }

  toDescription(): WeaponSlotDescription {
    return {
      active: this.active,
      weapon: this.weapon,
      ammunition: this.ammunition,
      maxAmmunition: this.maxAmmunition,
      parallel: this.parallel,
      revert: this.revert,
      projectileTypes: this.projectileTypes
    };
  }
}

export type WeaponSlotThumb = { slot: WeaponSlot; thumb: string };
