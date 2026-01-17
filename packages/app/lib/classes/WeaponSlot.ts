import type Weapon from './Weapon';

export interface WeaponSlotDescription {
  active?: boolean;
  weapon: Weapon;
  ammunition?: number;
  maxAmmunition?: number;
  parallel?: boolean;
  revert?: boolean;
}

export class WeaponSlot implements WeaponSlotDescription {
  active?: boolean;
  index: number;
  weapon: Weapon;
  ammunition: number;
  maxAmmunition: number;
  parallel?: boolean;
  revert?: boolean;
  constructor({
    active,
    index,
    weapon,
    ammunition,
    maxAmmunition,
    parallel,
    revert
  }: WeaponSlotDescription & { index: number }) {
    this.active = active ?? true;
    this.index = index;
    this.weapon = weapon;
    this.ammunition = ammunition ?? 100;
    this.maxAmmunition = maxAmmunition ?? 100;
    this.parallel = parallel ?? false;
    this.revert = revert ?? false;
  }
}
