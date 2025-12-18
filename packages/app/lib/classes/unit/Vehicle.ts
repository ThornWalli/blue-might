import type { UnitConstructorOptions, UnitOptions } from '../Unit';
import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules
} from './Movable';
import PatrolUnitModule from '../unitModule/Patrol';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VehicleUnitOptions extends UnitOptions {}

export type VehicleUnitModules = MovableUnitModules & {
  patrol: PatrolUnitModule;
};

export type VehicleUnitModuleList = (typeof PatrolUnitModule)[] &
  MovableUnitModuleList;
export default class VehicleUnit<
  Options extends VehicleUnitOptions = VehicleUnitOptions,
  Modules extends VehicleUnitModules = VehicleUnitModules,
  ModuleList extends VehicleUnitModuleList = VehicleUnitModuleList
> extends MovableUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(PatrolUnitModule);
    super(options, moduleList);
  }
}
