import type { Vector2 } from 'three';

import type Map from '../classes/Map';

export type UnitIdentifier = string;

export interface SetupContext {
  map?: Map;
}

export enum UNIT_TYPE {
  DEFAULT = 'default',
  BUILDING = 'building',
  PLANT = 'plant',
  SEA_VEHICLE = 'seaVehicle',
  AIR_VEHICLE = 'airVehicle',
  GROUND_VEHICLE = 'groundVehicle',
  FIGURE = 'figure',
  LANDING_PORT = 'landingPort',
  CAR = 'car',
  HELICOPTER = 'helicopter',
  TANK = 'tank'
}

export enum GROUND_ADJUSTMENT_MODE {
  MIN_HEIGHT = 'min-height',
  GROUND = 'ground',
  MIN_GROUND = 'min-ground',
  FLIGHT = 'flight',
  NONE = 'none',
  SEA = 'sea',
  FIGURE = 'figure'
}

export interface WeaponSupportState {
  weaponActive: boolean;
  weaponControlPrecision?: number;
  weaponVelocity: Vector2[];
  weaponTargetRotation: Vector2[];
}

export interface WeaponSupportOptions {
  weaponAngles: {
    revert?: boolean;
    min: Vector2;
    max: Vector2;
  }[];
}
