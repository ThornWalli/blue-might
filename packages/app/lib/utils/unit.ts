import type { UnitModules } from '../classes/Unit';
import type Unit from '../classes/Unit';
import type BuildingUnitModule from '../classes/unitModule/Building';
import type AirVehicleUnitModule from '../classes/unitModule/movable/AirVehicle';
import type GroundVehicleUnitModule from '../classes/unitModule/movable/GroundVehicle';
import type SeaVehicleUnitModule from '../classes/unitModule/movable/SeaVehicle';

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
