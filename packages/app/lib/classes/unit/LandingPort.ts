import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import LandingPortUnitModule from '@blue-might/app/lib/classes/unitModule/LandingPort';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LandingPortUnitOptions extends UnitOptions {}

export type LandingPortUnitModules = UnitModules & {
  landingPortal: LandingPortUnitModule;
};

export type LandingPortUnitModuleList = (typeof LandingPortUnitModule)[] &
  UnitModuleList;
export default class LandingPortUnit<
  Options extends LandingPortUnitOptions = LandingPortUnitOptions,
  Modules extends LandingPortUnitModules = LandingPortUnitModules,
  ModuleList extends LandingPortUnitModuleList = LandingPortUnitModuleList
> extends Unit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    moduleList.push(LandingPortUnitModule);
    super(options, moduleList);
  }
}
