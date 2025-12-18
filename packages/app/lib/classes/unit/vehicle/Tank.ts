import type { UnitConstructorOptions } from '@blue-might/app/lib/classes/Unit';
import TankUnitModule from '@blue-might/app/lib/classes/unitModule/Tank';
import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '../Vehicle';

export type TankUnitOptions = VehicleUnitOptions;

export type TankUnitModules = VehicleUnitModules & {
  vehicle: TankUnitModule;
};

export type TankUnitModuleList = (typeof TankUnitModule)[] &
  VehicleUnitModuleList;
export default class TankUnit<
  Options extends TankUnitOptions = TankUnitOptions,
  Modules extends TankUnitModules = TankUnitModules,
  ModuleList extends TankUnitModuleList = TankUnitModuleList
> extends VehicleUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    moduleList.push(TankUnitModule);
    super(options, moduleList);
  }
}
