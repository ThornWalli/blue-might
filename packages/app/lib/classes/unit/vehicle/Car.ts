import { UNIT_TYPE } from '@blue-might/app/lib/types/unit';

import type { UnitConstructorOptions } from '../../Unit';
import GroundVehicleUnitModule from '../../unitModule/movable/GroundVehicle';
import type PlayerUnitModule from '../../unitModule/Player';
import type {
  GroundVehicleUnitModuleList,
  GroundVehicleUnitModules,
  GroundVehicleUnitOptions
} from '../GroundVehicle';
import GroundVehicleUnit from '../GroundVehicle';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CarUnitOptions extends GroundVehicleUnitOptions {}

export type CarUnitModules = GroundVehicleUnitModules & {
  movable: GroundVehicleUnitModule;
  player: PlayerUnitModule;
};

export type CarUnitModuleList = (
  | typeof GroundVehicleUnitModule
  | typeof PlayerUnitModule
)[] &
  GroundVehicleUnitModuleList;
export default class CarUnit<
  Modules extends CarUnitModules = CarUnitModules,
  ModuleList extends CarUnitModuleList = CarUnitModuleList,
  Options extends CarUnitOptions = CarUnitOptions
> extends GroundVehicleUnit<Modules, ModuleList, Options> {
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
