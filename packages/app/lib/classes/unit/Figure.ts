import type { UnitConstructorOptions, UnitOptions } from '../Unit';
import FigureUnitModule from '../unitModule/moveable/Figure';
import CollisionUnitModule from '../unitModule/Collision';
import MovableUnit, {
  type MovableUnitModuleList,
  type MovableUnitModules
} from './Movable';
import PatrolUnitModule from '../unitModule/Patrol';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FigureUnitOptions extends UnitOptions {}

export type FigureUnitModules = MovableUnitModules & {
  figure: FigureUnitModule;
  collision: CollisionUnitModule;
  patrol: PatrolUnitModule;
};

export type FigureUnitModuleList = (
  | typeof FigureUnitModule
  | typeof CollisionUnitModule
  | typeof PatrolUnitModule
)[] &
  MovableUnitModuleList;
export default class FigureUnit<
  Options extends FigureUnitOptions = FigureUnitOptions,
  Modules extends FigureUnitModules = FigureUnitModules,
  ModuleList extends FigureUnitModuleList = FigureUnitModuleList
> extends MovableUnit<Options, Modules, ModuleList> {
  constructor(
    options: UnitConstructorOptions<Options>,
    moduleList: unknown[] = []
  ) {
    moduleList.push(CollisionUnitModule, PatrolUnitModule);
    if (
      !(moduleList as ModuleList).find(
        ({ TYPE }) => TYPE === FigureUnitModule.TYPE
      )
    ) {
      moduleList.push(FigureUnitModule);
    }
    super(
      {
        ...options,
        moduleOptions: {
          ...options.moduleOptions,
          collision: {
            disabled: true
          }
        }
      },
      moduleList
    );
  }
}
