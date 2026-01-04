import { GROUND_ADJUSTMENT_MODE, type UnitConstructorOptions } from '../Unit';
import SeaVehicleUnitModule from '../unitModule/movable/SeaVehicle';

import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from './Vehicle';

export type SeaVehicleUnitOptions = VehicleUnitOptions;

export type SeaVehicleUnitModules = VehicleUnitModules & {
  seaVehicle: SeaVehicleUnitModule;
};

export type SeaVehicleUnitModuleList = (typeof SeaVehicleUnitModule)[] &
  VehicleUnitModuleList;
export default class SeaVehicleUnit<
  Options extends SeaVehicleUnitOptions = SeaVehicleUnitOptions,
  Modules extends SeaVehicleUnitModules = SeaVehicleUnitModules,
  ModuleList extends SeaVehicleUnitModuleList = SeaVehicleUnitModuleList
> extends VehicleUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    if (
      !(moduleList as ModuleList).find(test =>
        test.TYPES.includes(SeaVehicleUnitModule.TYPE)
      )
    ) {
      moduleList.push(SeaVehicleUnitModule);
    }
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.SEA);
  }
}
