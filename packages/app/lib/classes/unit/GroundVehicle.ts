import { UNIT_TYPE } from '../../types/unit';
import { GROUND_ADJUSTMENT_MODE, type UnitConstructorOptions } from '../Unit';
import GroundVehicleUnitModule from '../unitModule/movable/GroundVehicle';

import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from './Vehicle';

export type GroundVehicleUnitOptions = VehicleUnitOptions;

export type GroundVehicleUnitModules = VehicleUnitModules & {
  groundVehicle: GroundVehicleUnitModule;
};

export type GroundVehicleUnitModuleList = (typeof GroundVehicleUnitModule)[] &
  VehicleUnitModuleList;
export default class GroundVehicleUnit<
  Modules extends GroundVehicleUnitModules = GroundVehicleUnitModules,
  ModuleList extends GroundVehicleUnitModuleList = GroundVehicleUnitModuleList,
  Options extends GroundVehicleUnitOptions = GroundVehicleUnitOptions
> extends VehicleUnit<Modules, ModuleList, Options> {
  static override TYPE = UNIT_TYPE.GROUND_VEHICLE;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    if (
      !(moduleList as ModuleList).find(test =>
        test.TYPES.includes(GroundVehicleUnitModule.TYPE)
      )
    ) {
      moduleList.push(GroundVehicleUnitModule);
    }
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.GROUND);
  }
}
