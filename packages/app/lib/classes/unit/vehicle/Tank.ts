import type { UnitConstructorOptions } from '@blue-might/app/lib/classes/Unit';
import TankUnitModule from '@blue-might/app/lib/classes/unitModule/Tank';

import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '../Vehicle';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TankUnitOptions extends VehicleUnitOptions {}

export type TankUnitModules = VehicleUnitModules & {
  movable: TankUnitModule;
};

export type TankUnitModuleList = (typeof TankUnitModule)[] &
  VehicleUnitModuleList;
export default class TankUnit<
  Modules extends TankUnitModules = TankUnitModules,
  ModuleList extends TankUnitModuleList = TankUnitModuleList,
  Options extends TankUnitOptions = TankUnitOptions
> extends VehicleUnit<Modules, ModuleList, Options> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    moduleList.push(TankUnitModule);
    super(options, moduleList);
  }
}
