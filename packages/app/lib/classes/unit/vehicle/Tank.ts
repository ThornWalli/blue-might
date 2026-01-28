import type { UnitConstructorOptions } from '@blue-might/app/lib/classes/Unit';
import TankUnitModule from '@blue-might/app/lib/classes/unitModule/Tank';
import { UNIT_TYPE } from '@blue-might/app/lib/types/unit';

import { addModules } from '../../Module';

import GroundVehicleUnit, {
  type GroundVehicleUnitModuleList,
  type GroundVehicleUnitModules,
  type GroundVehicleUnitOptions
} from './GroundVehicle';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TankUnitOptions extends GroundVehicleUnitOptions {}

export type TankUnitModules = GroundVehicleUnitModules & {
  movable: TankUnitModule;
};

export type TankUnitModuleList = (typeof TankUnitModule)[] &
  GroundVehicleUnitModuleList;
export default class TankUnit<
  Modules extends TankUnitModules = TankUnitModules,
  ModuleList extends TankUnitModuleList = TankUnitModuleList,
  Options extends TankUnitOptions = TankUnitOptions
> extends GroundVehicleUnit<Modules, ModuleList, Options> {
  static override TYPE = UNIT_TYPE.TANK;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList?: ModuleList
  ) {
    moduleList = (moduleList || []) as ModuleList;
    moduleList = addModules(moduleList, [TankUnitModule]);
    super(options, moduleList);
  }
}
