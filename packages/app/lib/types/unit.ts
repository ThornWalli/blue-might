import type { Vector2 } from 'three';

export type UnitIdentifier = string;

export enum UNIT_TYPE {
  DEFAULT = 'default',
  BUILDING = 'building',
  SEA_VEHICLE = 'seaVehicle',
  AIR_VEHICLE = 'airVehicle',
  GROUND_VEHICLE = 'groundVehicle',
  FIGURE = 'figure',
  LANDING_PORT = 'landingPort',
  CAR = 'car',
  HELICOPTER = 'helicopter',
  TANK = 'tank'
}

// // eslint-disable-next-line @typescript-eslint/no-empty-object-type
// export interface UnitType {}

// export const UNIT_TYPE: UnitType = {} as UnitType;

// export interface RawUnitDescription<Rotation = string, Position = number[]> {
//   id: string;
//   unit: string;
//   options: {
//     skin: string;
//     accessible?: boolean;
//     position: Position;
//     rotation: Rotation;
//     // options: { [key: string]: unknown };
//     moduleStates: { [key: string]: UnitModuleState };
//     [key: string]: unknown;
//   };
// }
// export type UnitDescription<
//   Rotation = ROTATION,
//   Position = Vector3
// > = RawUnitDescription<Rotation, Position>;

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
