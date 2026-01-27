import type { UnitConstructorOptions } from '@blue-might/app/lib/classes/Unit';
import LandingPortUnitModule from '@blue-might/app/lib/classes/unitModule/LandingPort';

import { UNIT_TYPE } from '../../types/unit';

import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from './Building';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LandingPortUnitOptions extends BuildingUnitOptions {}

export type LandingPortUnitModules = BuildingUnitModules & {
  landingPort: LandingPortUnitModule;
};

export type LandingPortUnitModuleList = (typeof LandingPortUnitModule)[] &
  BuildingUnitModuleList;
export default class LandingPortUnit<
  Modules extends LandingPortUnitModules = LandingPortUnitModules,
  ModuleList extends LandingPortUnitModuleList = LandingPortUnitModuleList,
  Options extends LandingPortUnitOptions = LandingPortUnitOptions
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override TYPE = UNIT_TYPE.LANDING_PORT;
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    moduleList.push(LandingPortUnitModule);
    super(options, moduleList);
  }
}
