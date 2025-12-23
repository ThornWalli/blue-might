import Unit, {
  GROUND_ADJUSTMENT_MODE,
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '../Unit';
import BuildingUnitModule from '../unitModule/Building';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BuildingUnitOptions extends UnitOptions {}

export type BuildingUnitModules = UnitModules & {
  building: BuildingUnitModule;
};

export type BuildingUnitModuleList = (typeof BuildingUnitModule)[] &
  UnitModuleList;
export default class BuildingUnit<
  Options extends BuildingUnitOptions = BuildingUnitOptions,
  Modules extends BuildingUnitModules = BuildingUnitModules,
  ModuleList extends BuildingUnitModuleList = BuildingUnitModuleList
> extends Unit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    if (
      !(moduleList as ModuleList).find(
        test => test.TYPE === BuildingUnitModule.TYPE
      )
    ) {
      moduleList.push(BuildingUnitModule);
    }
    super(options, moduleList);
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.MIN_HEIGHT);
  }
}
