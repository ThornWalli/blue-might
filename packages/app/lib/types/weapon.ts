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
  maxLifetime: number;
  speed: number;
  strength: number;
  radius: number;
  airResistance: number;
  weight: number;
  features?: {
    smoke?: boolean;
    fire?: boolean;
    explosion?: boolean;
    dust?: boolean;
  };
}

export type WeaponId = Values<Weapon>;
export type WeaponIdentifier = string;
export interface WeaponDescription<P = ProjectileIdentifier> {
  id: WeaponIdentifier;
  projectile: P;
  spreadAmount: number;
  perSeconds: number;
  shootType: WEAPON_SHOOT_TYPE;
}

export enum WEAPON_SHOOT_TYPE {
  NONE = 'none',
  SINGLE = 'single',
  AUTO = 'auto'
}
