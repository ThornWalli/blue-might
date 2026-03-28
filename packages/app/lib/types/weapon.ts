import type { Values } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProjectileKeys {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Weapon {}

export const PROJECTILE_KEY: ProjectileKeys = {} as ProjectileKeys;
export const WEAPON: Weapon = {} as Weapon;

export type ProjectileKey = Values<ProjectileKeys>;
export type ProjectileIdentifier = string;
export enum PROJECTILE_TYPE {
  MISSILE = 'missile',
  P35 = 'p35',
  P120 = 'p120',
  P155 = 'p155'
}
export interface ProjectileDescription {
  type: PROJECTILE_TYPE;
  id: ProjectileIdentifier;
  name: string;
  shortName?: string | null;
  description?: string | null;
  maxLifetime: number;
  speed: number;
  strength: number;
  radius: number;
  airResistance: number;
  weight: number;
  targetType: TARGET_TYPE | null;
  features?: {
    smoke?: boolean;
    fire?: boolean;
    shoot?: boolean;
    explosion?: boolean;
    dust?: boolean;
  };
}

export type WeaponId = Values<Weapon>;
export type WeaponIdentifier = string;
export interface WeaponDescription<P = ProjectileIdentifier> {
  projectileType: PROJECTILE_TYPE;
  id: WeaponIdentifier;
  name: string;
  description?: string | null;
  projectile: P;
  spreadAmount: number;
  perSeconds: number;
  shootType: WEAPON_SHOOT_TYPE;
  shootStrength: number;
}

export enum WEAPON_SHOOT_TYPE {
  NONE = 'none',
  SINGLE = 'single',
  AUTO = 'auto'
}

export enum TARGET_TYPE {
  GROUND = 'ground',
  AIR = 'air',
  SEA = 'sea'
}
