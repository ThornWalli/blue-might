import type Unit from '../classes/Unit';

export function isUnitDestroyed(unit: Unit): boolean {
  return unit.modules.damage.isDestroyed();
}

export function isSeaVehicle(unit: Unit): boolean {
  return 'seaVehicle' in unit.modules;
}

export function isAirVehicle(unit: Unit): boolean {
  return 'airVehicle' in unit.modules;
}

export function isGroundVehicle(unit: Unit): boolean {
  return 'groundVehicle' in unit.modules;
}
