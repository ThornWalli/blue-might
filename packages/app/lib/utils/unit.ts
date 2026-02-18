/* eslint-disable @typescript-eslint/no-explicit-any */
import type { UnitModules } from '../classes/Unit';
import type Unit from '../classes/Unit';
import type AirVehicleUnit from '../classes/unit/vehicle/AirVehicle';
import type BuildingUnitModule from '../classes/unitModule/Building';
import type AirVehicleUnitModule from '../classes/unitModule/movable/AirVehicle';
import type GroundVehicleUnitModule from '../classes/unitModule/movable/GroundVehicle';
import type SeaVehicleUnitModule from '../classes/unitModule/movable/SeaVehicle';

export function isUnitDestroyed(unit: Unit): boolean {
  return unit.modules.damage.isDestroyed();
}

export function isVehicle(unit?: Unit | null): boolean {
  return isAirVehicle(unit) || isGroundVehicle(unit) || isSeaVehicle(unit);
}

export function isFigure(unit?: Unit | null): boolean {
  return (unit && 'figure' in unit.modules) ?? false;
}

export function isSeaVehicle(unit?: Unit | null): boolean {
  return (unit && 'seaVehicle' in unit.modules) ?? false;
}

export function isAirVehicle(unit?: Unit | null): boolean {
  return (unit && 'airVehicle' in unit.modules) ?? false;
}

export function isTransport(unit?: Unit | null): boolean {
  return (unit && 'transport' in unit.modules) ?? false;
}

export function isRescue(unit?: Unit | null): boolean {
  return (unit && 'rescue' in unit.modules) ?? false;
}

export function isBuilding(unit?: Unit | null): boolean {
  return (unit && 'building' in unit.modules) ?? false;
}

export function isPlant(unit?: Unit | null): boolean {
  return (unit && 'plant' in unit.modules) ?? false;
}

export function getAirVehicle(unit: Unit | null): AirVehicleUnit | null {
  if (unit && 'airVehicle' in unit.modules) {
    return unit as AirVehicleUnit;
  }
  return null;
}

export function isGroundVehicle(unit?: Unit | null): boolean {
  return (unit && 'groundVehicle' in unit.modules) ?? false;
}

export function hasWeaponModule(unit?: Unit | null): boolean {
  return (unit && 'weapon' in unit.modules) ?? false;
}

export function ignoreByUnitByType(filter: {
  building?: boolean;
  seaVehicle?: boolean;
  airVehicle?: boolean;
  groundVehicle?: boolean;
}) {
  return (unit: Unit) => {
    const u = unit as Unit<
      UnitModules & {
        building: BuildingUnitModule;
        airVehicle: AirVehicleUnitModule;
        seaVehicle: SeaVehicleUnitModule;
        groundVehicle: GroundVehicleUnitModule;
      }
    >;
    if (filter.building && u.modules.building) return false;
    if (filter.seaVehicle && u.modules.seaVehicle) return false;
    if (filter.airVehicle && u.modules.airVehicle) return false;
    if (filter.groundVehicle && u.modules.groundVehicle) return false;
    return true;
  };
}

export function getUnitDistance(unitA: Unit, unitB: Unit): number {
  return unitA.getPosition().distanceTo(unitB.getPosition());
}

export function getUnitMap(units: any): Map<string, typeof Unit> {
  const unitMap = new globalThis.Map(
    Object.values(units).map(
      unit =>
        [(unit as any).KEY, unit as unknown as typeof Unit] as [
          string,
          typeof Unit
        ]
    )
  );
  return unitMap;
}
