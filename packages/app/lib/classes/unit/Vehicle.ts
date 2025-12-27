import type { UnitConstructorOptions, UnitOptions } from '../Unit';
import PatrolUnitModule from '../unitModule/Patrol';

import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules
} from './Movable';

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
