import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '../Unit';
import BuildingUnitModule from '../unitModule/Building';
import CollisionUnitModule from '../unitModule/Collision';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BuildingUnitOptions extends UnitOptions {}

export type BuildingUnitModules = UnitModules & {
  building: BuildingUnitModule;
  collision: CollisionUnitModule;
};

export type BuildingUnitModuleList = (
  | typeof BuildingUnitModule
  | typeof CollisionUnitModule
)[] &
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
    moduleList.push(CollisionUnitModule);
    if (
      !(moduleList as ModuleList).find(
        test => test.TYPE === BuildingUnitModule.TYPE
      )
    ) {
      moduleList.push(BuildingUnitModule);
    }
    super(options, moduleList);
    this.setNormalizeGroundAlignment(false);
  }
}
