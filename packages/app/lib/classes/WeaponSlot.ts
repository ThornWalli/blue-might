import type Weapon from './Weapon';

export interface WeaponSlotDescription {
  active?: boolean;
  slot: number;
  weapon: Weapon;
  ammunition?: number;
  maxAmmunition?: number;
}

export class WeaponSlot implements WeaponSlotDescription {
  active?: boolean;
  slot: number;
  weapon: Weapon;
  ammunition: number;
  maxAmmunition: number;
  constructor({
    active,
    slot,
    weapon,
    ammunition,
    maxAmmunition
  }: WeaponSlotDescription) {
    this.active = active ?? true;
    this.slot = slot;
    this.weapon = weapon;
    this.ammunition = ammunition ?? 100;
    this.maxAmmunition = maxAmmunition ?? 100;
  }
}
