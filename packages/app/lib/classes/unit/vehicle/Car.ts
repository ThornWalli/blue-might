import type { UnitConstructorOptions } from '../../Unit';
import GroundVehicleUnitModule from '../../unitModule/moveable/GroundVehicle';
import type PlayerUnitModule from '../../unitModule/Player';
import VehicleUnit, {
  type VehicleUnitModuleList,
  type VehicleUnitModules,
  type VehicleUnitOptions
} from '../Vehicle';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CarUnitOptions extends VehicleUnitOptions {}

export type CarUnitModules = VehicleUnitModules & {
  vehicle: GroundVehicleUnitModule;
  player: PlayerUnitModule;
};

export type CarUnitModuleList = (
  | typeof GroundVehicleUnitModule
  | typeof PlayerUnitModule
)[] &
  VehicleUnitModuleList;
export default class CarUnit<
  Options extends CarUnitOptions = CarUnitOptions,
  Modules extends CarUnitModules = CarUnitModules,
  ModuleList extends CarUnitModuleList = CarUnitModuleList
> extends VehicleUnit<Options, Modules, ModuleList> {
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
