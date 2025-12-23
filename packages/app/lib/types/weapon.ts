import type { Values } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProjectileTypes {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Weapon {}

export const PROJECTILE_TYPE: ProjectileTypes = {} as ProjectileTypes;
export const WEAPON: Weapon = {} as Weapon;

export type ProjectileType = Values<ProjectileTypes>;
export type ProjectileIdentifier = string;

export interface ProjectileDescription {
  id: ProjectileIdentifier;
  speed: number;
  strength: number;
}

export type WeaponId = Values<Weapon>;
export type WeaponIdentifier = string;
export interface WeaponDescription {
  id: WeaponIdentifier;
  projectile: ProjectileDescription;
  spreadAmount: number;
  speed: number;
  perSeconds: number;
}
