import type Weapon from './Weapon';

export interface WeaponSlotDescription {
  active?: boolean;
  weapon: Weapon;
  ammunition?: number;
  maxAmmunition?: number;
}

export class WeaponSlot implements WeaponSlotDescription {
  active?: boolean;
  index: number;
  weapon: Weapon;
  ammunition: number;
  maxAmmunition: number;
  constructor({
    active,
    index,
    weapon,
    ammunition,
    maxAmmunition
  }: WeaponSlotDescription & { index: number }) {
    this.active = active ?? true;
    this.index = index;
    this.weapon = weapon;
    this.ammunition = ammunition ?? 100;
    this.maxAmmunition = maxAmmunition ?? 100;
  }
}
