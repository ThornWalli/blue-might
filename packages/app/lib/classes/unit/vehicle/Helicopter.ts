import {
  GROUND_ADJUSTMENT_MODE,
  type UnitConstructorOptions
} from '../../Unit';
import HelicopterUnitModule from '../../unitModule/movable/airVehicle/Helicopter';
import AirVehicleUnit, {
  type AirVehicleUnitModuleList,
  type AirVehicleUnitModules,
  type AirVehicleUnitOptions
} from '../AirVehicle';

export type HelicopterUnitOptions = AirVehicleUnitOptions;

export type HelicopterUnitModules = AirVehicleUnitModules & {
  helicopter: HelicopterUnitModule;
};

export type HelicopterUnitModuleList = (typeof HelicopterUnitModule)[] &
  AirVehicleUnitModuleList;
export default class HelicopterUnit<
  Modules extends HelicopterUnitModules = HelicopterUnitModules,
  ModuleList extends HelicopterUnitModuleList = HelicopterUnitModuleList,
  Options extends HelicopterUnitOptions = HelicopterUnitOptions
> extends AirVehicleUnit<Modules, ModuleList, Options> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(HelicopterUnitModule);
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.FLIGHT);
  }
}
