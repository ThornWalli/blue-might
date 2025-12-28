import type { UnitConstructorOptions } from '../Unit';
import AirVehicleUnitModule from '../unitModule/movable/AirVehicle';

import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from './Vehicle';

export type AirVehicleUnitOptions = VehicleUnitOptions;

export type AirVehicleUnitModules = VehicleUnitModules & {
  airVehicle: AirVehicleUnitModule;
};

export type AirVehicleUnitModuleList = (typeof AirVehicleUnitModule)[] &
  VehicleUnitModuleList;
export default class AirVehicleUnit<
  Options extends AirVehicleUnitOptions = AirVehicleUnitOptions,
  Modules extends AirVehicleUnitModules = AirVehicleUnitModules,
  ModuleList extends AirVehicleUnitModuleList = AirVehicleUnitModuleList
> extends VehicleUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    if (
      !(moduleList as ModuleList).find(test =>
        test.TYPES.includes(AirVehicleUnitModule.TYPE)
      )
    ) {
      moduleList.push(AirVehicleUnitModule);
    }
    super(options, moduleList);
  }
}
