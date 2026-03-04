import { TILE_TYPE } from '@blue-might/app/lib/utils/pathfinding';

import { UNIT_TYPE } from '../../../types/unit';
import { addModules } from '../../Module';
import type {
  UnitConstructorOptions,
  UnitObservables,
  UnitState
} from '../../Unit';
import AirVehicleUnitModule from '../../unitModule/movable/AirVehicle';
import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '../Vehicle';

export type AirVehicleUnitOptions = VehicleUnitOptions;

export type AirVehicleUnitModules = VehicleUnitModules & {
  airVehicle: AirVehicleUnitModule;
};

export type AirVehicleUnitModuleList = (typeof AirVehicleUnitModule)[] &
  VehicleUnitModuleList;
export default class AirVehicleUnit<
  Modules extends AirVehicleUnitModules = AirVehicleUnitModules,
  ModuleList extends AirVehicleUnitModuleList = AirVehicleUnitModuleList,
  Options extends AirVehicleUnitOptions = AirVehicleUnitOptions,
  Observables extends UnitObservables = UnitObservables,
  State extends UnitState = UnitState
> extends VehicleUnit<Modules, ModuleList, Options, Observables, State> {
  static override TYPE = UNIT_TYPE.AIR_VEHICLE;

  override getTileType() {
    return TILE_TYPE.UNIT_AIR;
  }

  constructor(
    options: UnitConstructorOptions<Options, State>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [AirVehicleUnitModule]);
    super(options, moduleList);
  }
}
