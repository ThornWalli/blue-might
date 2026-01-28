import { UNIT_TYPE } from '../../../types/unit';
import { addModules } from '../../Module';
import type { UnitConstructorOptions } from '../../Unit';
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
  Options extends AirVehicleUnitOptions = AirVehicleUnitOptions
> extends VehicleUnit<Modules, ModuleList, Options> {
  static override TYPE = UNIT_TYPE.AIR_VEHICLE;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [AirVehicleUnitModule]);
    super(options, moduleList);
  }
}
