import type Weapon from './Weapon';

export interface WeaponSlotDescription {
  active?: boolean;
  weapon: Weapon;
  ammunition?: number;
  maxAmmunition?: number;
  parallel?: boolean;
  revert?: boolean;
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
  ammunition: number = 100;
  /**
   * The maximum amount of ammunition this slot can hold.
   * @default 100
   */
  maxAmmunition: number = 100;
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

  constructor({
    active,
    index,
    weapon,
    ammunition,
    maxAmmunition,
    parallel,
    revert
  }: WeaponSlotDescription & { index: number }) {
    this.active = active ?? this.active;
    this.index = index;
    this.weapon = weapon;
    this.ammunition = ammunition ?? this.ammunition;
    this.maxAmmunition = maxAmmunition ?? this.maxAmmunition;
    this.parallel = parallel ?? this.parallel;
    this.revert = revert ?? this.revert;
  }

  destroy() {
    // implement destruction logic
  }

  setWeapon(weapon: Weapon) {
    this.weapon = weapon;
  }

  toDescription(): WeaponSlotDescription {
    return {
      active: this.active,
      weapon: this.weapon,
      ammunition: this.ammunition,
      maxAmmunition: this.maxAmmunition,
      parallel: this.parallel,
      revert: this.revert
    };
  }
}

export type WeaponSlotThumb = { slot: WeaponSlot; thumb: string };
