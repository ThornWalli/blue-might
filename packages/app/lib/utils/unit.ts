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
  return (unit && 'vehicle' in unit.modules) ?? false;
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

export function getAirVehicle(unit: Unit | null): AirVehicleUnit | null {
  if (unit && 'airVehicle' in unit.modules) {
    return unit as AirVehicleUnit;
  }
  return null;
}

export function isGroundVehicle(unit?: Unit | null): boolean {
  return (unit && 'groundVehicle' in unit.modules) ?? false;
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
