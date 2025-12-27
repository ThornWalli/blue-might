import type { UnitConstructorOptions } from '@blue-might/app/lib/classes/Unit';
import LandingPortUnitModule from '@blue-might/app/lib/classes/unitModule/LandingPort';

import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from './Building';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LandingPortUnitOptions extends BuildingUnitOptions {}

export type LandingPortUnitModules = BuildingUnitModules & {
  landingPortal: LandingPortUnitModule;
};

export type LandingPortUnitModuleList = (typeof LandingPortUnitModule)[] &
  BuildingUnitModuleList;
export default class LandingPortUnit<
  Options extends LandingPortUnitOptions = LandingPortUnitOptions,
  Modules extends LandingPortUnitModules = LandingPortUnitModules,
  ModuleList extends LandingPortUnitModuleList = LandingPortUnitModuleList
> extends BuildingUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    moduleList.push(LandingPortUnitModule);
    super(options, moduleList);
  }
}
