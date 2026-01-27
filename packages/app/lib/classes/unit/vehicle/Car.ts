import { UNIT_TYPE } from '@blue-might/app/lib/types/unit';

import type { UnitConstructorOptions } from '../../Unit';
import GroundVehicleUnitModule from '../../unitModule/movable/GroundVehicle';
import type PlayerUnitModule from '../../unitModule/Player';
import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '../Vehicle';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CarUnitOptions extends VehicleUnitOptions {}

export type CarUnitModules = VehicleUnitModules & {
  movable: GroundVehicleUnitModule;
  player: PlayerUnitModule;
};

export type CarUnitModuleList = (
  | typeof GroundVehicleUnitModule
  | typeof PlayerUnitModule
)[] &
  VehicleUnitModuleList;
export default class CarUnit<
  Modules extends CarUnitModules = CarUnitModules,
  ModuleList extends CarUnitModuleList = CarUnitModuleList,
  Options extends CarUnitOptions = CarUnitOptions
> extends VehicleUnit<Modules, ModuleList, Options> {
  static override TYPE = UNIT_TYPE.CAR;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    if (
      !(moduleList as ModuleList).find(
        ({ TYPE }) => TYPE === GroundVehicleUnitModule.TYPE
      )
    ) {
      moduleList.push(GroundVehicleUnitModule);
    }
    super(options, moduleList);
  }
}
