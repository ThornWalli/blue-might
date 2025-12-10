import Unit, {
  type UnitConstructorOptions,
  type UnitModuleList,
  type UnitModules,
  type UnitOptions
} from '../Unit';
import FigureUnitModule from '../unitModule/Figure';
import CollisionUnitModule from '../unitModule/Collision';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FigureUnitOptions extends UnitOptions {}

export type FigureUnitModules = UnitModules & {
  building: FigureUnitModule;
  collision: CollisionUnitModule;
};

export type FigureUnitModuleList = (
  | typeof FigureUnitModule
  | typeof CollisionUnitModule
)[] &
  UnitModuleList;
export default class FigureUnit<
  Options extends FigureUnitOptions = FigureUnitOptions,
  Modules extends FigureUnitModules = FigureUnitModules,
  ModuleList extends FigureUnitModuleList = FigureUnitModuleList
> extends Unit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(CollisionUnitModule);
    if (
      !(moduleList as ModuleList).find(
        test => test.TYPE === FigureUnitModule.TYPE
      )
    ) {
      moduleList.push(FigureUnitModule);
    }
    super(options, moduleList);
  }
}
